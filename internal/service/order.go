package service

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/Samruddhi-7/orderflow/internal/repository/db"
	"github.com/jackc/pgx/v5/pgtype"
)

type CreateOrderRequest struct {
	CustomerID     string
	VendorID       string
	Items          map[string]int32 // menu_item_id -> qty
	IdempotencyKey string
	UseRedisLock   bool
}

func (s *orderService) CreateOrder(ctx context.Context, req CreateOrderRequest) (db.Order, error) {
	var finalOrder db.Order

	// 1. Check idempotency key first
	existingOrder, err := s.store.GetOrderByIdempotencyKey(ctx, req.IdempotencyKey)
	if err == nil && existingOrder.ID.Valid {
		// Order already exists for this idempotency key, return it
		return existingOrder, nil
	}

	var customerUUID, vendorUUID pgtype.UUID
	if err := customerUUID.Scan(req.CustomerID); err != nil {
		return finalOrder, err
	}
	if err := vendorUUID.Scan(req.VendorID); err != nil {
		return finalOrder, err
	}

	err = s.store.ExecTx(ctx, func(q *db.Queries) error {
		var totalAmount float64

		// Process each item
		for itemIDStr, qty := range req.Items {
			var itemUUID pgtype.UUID
			if err := itemUUID.Scan(itemIDStr); err != nil {
				return err
			}

			// Get the menu item to check price
			menuItem, err := q.GetMenuItemByID(ctx, itemUUID)
			if err != nil {
				return fmt.Errorf("failed to get menu item %s: %w", itemIDStr, err)
			}

			if !menuItem.IsAvailable {
				return fmt.Errorf("item %s is not available", itemIDStr)
			}

			// Concurrency control: Atomic DB Update vs Redis Distributed Lock
			/*
				Tradeoff Comment:
				1. DB Atomic Conditional Update (RowsAffected check):
				   - Pros: Simple, no external dependencies, perfectly consistent within the DB transaction.
				   - Cons: Under extremely high contention, many transactions might hit the DB simultaneously causing lock contention on the row, potentially leading to slow queries or deadlocks.
				2. Redis Distributed Lock (SETNX):
				   - Pros: Offloads contention from the database. Requests can be serialized or rejected quickly in memory before hitting Postgres.
				   - Cons: Adds complexity, requires handling lock timeouts/crashes, and introduces a small window for inconsistency if Redis and Postgres diverge or lock TTL expires mid-transaction.
			*/

			if req.UseRedisLock {
				lockKey := fmt.Sprintf("lock:menu_item:%s", itemIDStr)
				// Acquire lock for 5 seconds
				locked, err := s.cache.SetNX(ctx, lockKey, "locked", 5*time.Second)
				if err != nil || !locked {
					return fmt.Errorf("could not acquire lock for item %s, please try again", itemIDStr)
				}
				
				// Ensure lock is released at the end of the item processing
				defer func() {
					if err := s.cache.Delete(ctx, lockKey); err != nil {
						log.Printf("failed to release redis lock %s: %v", lockKey, err)
					}
				}()
				
				// After acquiring lock, we still need to check if enough stock exists and update it.
				// Since we hold the lock, we can safely read and update.
				if menuItem.StockQty < qty {
					return fmt.Errorf("not enough stock for item %s", itemIDStr)
				}
				
				_, err = q.UpdateMenuItemStock(ctx, db.UpdateMenuItemStockParams{
					ID:       itemUUID,
					StockQty: menuItem.StockQty - qty,
				})
				if err != nil {
					return err
				}
			} else {
				// Atomic conditional SQL update
				_, err := q.DecrementMenuItemStock(ctx, db.DecrementMenuItemStockParams{
					ID:       itemUUID,
					StockQty: qty,
				})
				if err != nil {
					// In a real pgx scenario, we'd check if no rows were updated, but our query returns the updated row.
					// If 0 rows match the WHERE id = $1 AND stock_qty >= $2, it returns pgx.ErrNoRows.
					return fmt.Errorf("not enough stock for item %s", itemIDStr)
				}
			}

			// Calculate total (qty * price)
			priceFloat, _ := menuItem.Price.Float64Value()
			totalAmount += float64(qty) * priceFloat.Float64
		}

		// Calculate total
		var totalAmountNumeric pgtype.Numeric
		_ = totalAmountNumeric.Scan(fmt.Sprintf("%f", totalAmount))

		// Create Order
		order, err := q.CreateOrder(ctx, db.CreateOrderParams{
			CustomerID:     customerUUID,
			VendorID:       vendorUUID,
			Status:         "placed",
			TotalAmount:    totalAmountNumeric,
			IdempotencyKey: req.IdempotencyKey,
		})
		if err != nil {
			return err
		}

		// Create Order Items
		for itemIDStr, qty := range req.Items {
			var itemUUID pgtype.UUID
			_ = itemUUID.Scan(itemIDStr)
			
			menuItem, _ := q.GetMenuItemByID(ctx, itemUUID)
			
			_, err = q.CreateOrderItem(ctx, db.CreateOrderItemParams{
				OrderID:          order.ID,
				MenuItemID:       itemUUID,
				Qty:              qty,
				PriceAtOrderTime: menuItem.Price,
			})
			if err != nil {
				return err
			}
		}

		finalOrder = order
		return nil
	})

	if err != nil {
		return db.Order{}, err
	}

	return finalOrder, nil
}

func (s *orderService) GetOrder(ctx context.Context, orderID string) (db.Order, error) {
	var uuid pgtype.UUID
	if err := uuid.Scan(orderID); err != nil {
		return db.Order{}, err
	}
	return s.store.GetOrderByID(ctx, uuid)
}

func (s *orderService) ListOrdersByCustomer(ctx context.Context, customerID string) ([]db.Order, error) {
	var uuid pgtype.UUID
	if err := uuid.Scan(customerID); err != nil {
		return nil, err
	}
	return s.store.ListOrdersByCustomer(ctx, uuid)
}

func (s *orderService) ListOrdersByVendor(ctx context.Context, vendorID string) ([]db.Order, error) {
	var uuid pgtype.UUID
	if err := uuid.Scan(vendorID); err != nil {
		return nil, err
	}
	return s.store.ListOrdersByVendor(ctx, uuid)
}

func (s *orderService) UpdateOrderStatus(ctx context.Context, orderID string, status string) (db.Order, error) {
	validStatuses := map[string]bool{
		"placed":           true,
		"confirmed":        true,
		"preparing":        true,
		"out_for_delivery": true,
		"delivered":        true,
		"cancelled":        true,
	}

	if !validStatuses[status] {
		return db.Order{}, errors.New("invalid order status")
	}

	var uuid pgtype.UUID
	if err := uuid.Scan(orderID); err != nil {
		return db.Order{}, err
	}

	arg := db.UpdateOrderStatusParams{
		ID:     uuid,
		Status: status,
	}
	
	return s.store.UpdateOrderStatus(ctx, arg)
}
