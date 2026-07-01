package service_test

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/Samruddhi-7/orderflow/internal/cache"
	"github.com/Samruddhi-7/orderflow/internal/repository"
	"github.com/Samruddhi-7/orderflow/internal/repository/db"
	"github.com/Samruddhi-7/orderflow/internal/service"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// TestOrderConcurrency demonstrates the concurrency-safe inventory decrement logic
// by firing many concurrent order requests against a single low-stock menu item.
func TestOrderConcurrency(t *testing.T) {
	// 1. Setup connection (Assuming a local test DB and Redis)
	ctx := context.Background()
	connStr := "postgres://postgres:postgres@localhost:5432/orderflow?sslmode=disable"
	pool, err := pgxpool.New(ctx, connStr)
	if err != nil {
		t.Skipf("Skipping integration test; could not connect to DB: %v", err)
	}
	defer pool.Close()

	redisCache, err := cache.NewRedisCache("localhost:6379")
	if err != nil {
		t.Skipf("Skipping integration test; could not connect to Redis: %v", err)
	}

	store := repository.NewStore(pool)
	orderService := service.NewOrderService(store, redisCache)
	queries := db.New(pool)

	// 2. Setup Data
	vendorUUID, _ := uuid.NewRandom()
	var pgVendorID pgtype.UUID
	pgVendorID.Scan(vendorUUID.String())

	// Create a vendor
	_, err = queries.CreateVendor(ctx, db.CreateVendorParams{
		UserID:      pgVendorID, // just mock for now
		Name:        "Concurrency Test Vendor",
		Description: "Vendor for testing",
		Status:      "active",
	})
	if err != nil {
		t.Fatalf("failed to create vendor: %v", err)
	}

	// Create a menu item with limited stock
	initialStock := int32(10)
	var price pgtype.Numeric
	price.Scan("5.99")
	
	menuItem, err := queries.CreateMenuItem(ctx, db.CreateMenuItemParams{
		VendorID:    pgVendorID,
		Name:        "Limited Edition Burger",
		Price:       price,
		StockQty:    initialStock,
		IsAvailable: true,
	})
	if err != nil {
		t.Fatalf("failed to create menu item: %v", err)
	}

	var itemIDStr string
	if len(menuItem.ID.Bytes) == 16 {
		itemIDStr = fmt.Sprintf("%x-%x-%x-%x-%x", menuItem.ID.Bytes[0:4], menuItem.ID.Bytes[4:6], menuItem.ID.Bytes[6:8], menuItem.ID.Bytes[8:10], menuItem.ID.Bytes[10:16])
	}
	
	var vendorIDStr string
	if len(pgVendorID.Bytes) == 16 {
		vendorIDStr = fmt.Sprintf("%x-%x-%x-%x-%x", pgVendorID.Bytes[0:4], pgVendorID.Bytes[4:6], pgVendorID.Bytes[6:8], pgVendorID.Bytes[8:10], pgVendorID.Bytes[10:16])
	}

	// 3. Fire Concurrent Requests
	concurrencyLevel := 100
	var wg sync.WaitGroup
	wg.Add(concurrencyLevel)

	var successCount int32
	var failCount int32

	// We'll test with the Atomic DB update method (useRedisLock = false)
	// You can change this to true to test the Redis SETNX path!
	useRedisLock := false

	t.Logf("Starting %d concurrent requests for an item with stock %d (Use Redis Lock: %v)", concurrencyLevel, initialStock, useRedisLock)

	for i := 0; i < concurrencyLevel; i++ {
		go func(reqNum int) {
			defer wg.Done()

			customerUUID, _ := uuid.NewRandom()
			idempotencyKey := fmt.Sprintf("test-key-%d", reqNum)

			items := map[string]int32{
				itemIDStr: 1,
			}

			req := service.CreateOrderRequest{
				CustomerID:     customerUUID.String(),
				VendorID:       vendorIDStr,
				Items:          items,
				IdempotencyKey: idempotencyKey,
				UseRedisLock:   useRedisLock,
			}

			_, err := orderService.CreateOrder(context.Background(), req)
			if err != nil {
				atomic.AddInt32(&failCount, 1)
			} else {
				atomic.AddInt32(&successCount, 1)
			}
		}(i)
	}

	wg.Wait()

	// 4. Assertions
	t.Logf("Successes: %d, Failures: %d", successCount, failCount)

	if successCount > initialStock {
		t.Errorf("Oversold! Expected at most %d successful orders, got %d", initialStock, successCount)
	}

	// Verify final stock in DB
	finalItem, err := queries.GetMenuItemByID(ctx, menuItem.ID)
	if err != nil {
		t.Fatalf("failed to fetch final item: %v", err)
	}

	t.Logf("Final Stock Qty: %d", finalItem.StockQty)

	if finalItem.StockQty < 0 {
		t.Errorf("Negative stock! Final stock is %d", finalItem.StockQty)
	}
	
	expectedFinalStock := initialStock - successCount
	if finalItem.StockQty != expectedFinalStock {
		t.Errorf("Mismatch stock! Expected %d, got %d", expectedFinalStock, finalItem.StockQty)
	}
}
