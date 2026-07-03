package service_test

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Samruddhi-7/orderflow/internal/cache"
	"github.com/Samruddhi-7/orderflow/internal/repository"
	"github.com/Samruddhi-7/orderflow/internal/repository/db"
	"github.com/Samruddhi-7/orderflow/internal/service"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

// TestOrderConcurrency demonstrates the concurrency-safe inventory decrement logic
// by firing many concurrent order requests against a single low-stock menu item.
func TestOrderConcurrency(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}
	ctx := context.Background()

	// Spin up Postgres using testcontainers
	pgContainer, err := postgres.RunContainer(ctx,
		testcontainers.WithImage("postgres:16-alpine"),
		postgres.WithDatabase("test_db"),
		postgres.WithUsername("test_user"),
		postgres.WithPassword("test_pass"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(5*time.Second)),
	)
	if err != nil {
		t.Fatalf("Failed to start pg container: %v", err)
	}
	defer func() {
		if err := pgContainer.Terminate(ctx); err != nil {
			t.Fatalf("Failed to terminate pg container: %v", err)
		}
	}()

	connString, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatalf("Failed to get connection string: %v", err)
	}

	pool, err := pgxpool.New(ctx, connString)
	if err != nil {
		t.Fatalf("Failed to connect to pg: %v", err)
	}
	defer pool.Close()

	// Use setupSchema from order_test.go since they are in the same package
	setupSchema(t, pool)

	redisCache, err := cache.NewRedisCache("localhost:6379")
	if err != nil {
		t.Skipf("Skipping integration test; could not connect to Redis: %v", err)
	}

	store := repository.NewStore(pool)
	orderService := service.NewOrderService(store, redisCache)
	queries := db.New(pool)

	// Create a user first for the vendor to satisfy foreign key
	userVendor, err := queries.CreateUser(ctx, db.CreateUserParams{
		Email:        "vendor_concurrency@v.com",
		PasswordHash: "h",
		Role:         "vendor",
	})
	if err != nil {
		t.Fatalf("failed to create vendor user: %v", err)
	}
	pgVendorID := userVendor.ID

	// Create a vendor
	vendor, err := queries.CreateVendor(ctx, db.CreateVendorParams{
		UserID: pgVendorID,
		Name:   "Concurrency Test Vendor",
	})
	if err != nil {
		t.Fatalf("failed to create vendor: %v", err)
	}

	// Create a menu item with limited stock
	initialStock := int32(10)
	var price pgtype.Numeric
	if err := price.Scan("5.99"); err != nil {
		t.Fatalf("failed to scan price: %v", err)
	}

	menuItem, err := queries.CreateMenuItem(ctx, db.CreateMenuItemParams{
		VendorID:    vendor.ID,
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
	if len(vendor.ID.Bytes) == 16 {
		vendorIDStr = fmt.Sprintf("%x-%x-%x-%x-%x", vendor.ID.Bytes[0:4], vendor.ID.Bytes[4:6], vendor.ID.Bytes[6:8], vendor.ID.Bytes[8:10], vendor.ID.Bytes[10:16])
	}

	// Create a single customer for all concurrent requests
	userCustomer, err := queries.CreateUser(ctx, db.CreateUserParams{
		Email:        "customer_concurrency@c.com",
		PasswordHash: "h",
		Role:         "customer",
	})
	if err != nil {
		t.Fatalf("failed to create customer user: %v", err)
	}
	var customerIDStr string
	if len(userCustomer.ID.Bytes) == 16 {
		customerIDStr = fmt.Sprintf("%x-%x-%x-%x-%x", userCustomer.ID.Bytes[0:4], userCustomer.ID.Bytes[4:6], userCustomer.ID.Bytes[6:8], userCustomer.ID.Bytes[8:10], userCustomer.ID.Bytes[10:16])
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

			idempotencyKey := fmt.Sprintf("test-key-%d", reqNum)

			items := map[string]int32{
				itemIDStr: 1,
			}

			req := service.CreateOrderRequest{
				CustomerID:     customerIDStr,
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
