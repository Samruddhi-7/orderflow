package service_test

import (
	"context"
	"fmt"
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

func TestOrderService_Integration(t *testing.T) {
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

	// We would normally run migrations here. Since this is an interview demo,
	// we will create the tables directly to avoid path issues with migration files.
	setupSchema(t, pool)

	// We will use a dummy cache (not testcontainers for redis to keep it simple, just skip redis lock path)
	dummyCache, _ := cache.NewRedisCache("invalid_host:6379") // won't be used since UseRedisLock=false

	store := repository.NewStore(pool)
	queries := db.New(pool)
	orderService := service.NewOrderService(store, dummyCache)

	// 1. Setup mock data
	var customerUUID, vendorUUID pgtype.UUID

	userCustomer, err := queries.CreateUser(ctx, db.CreateUserParams{Email: "c@c.com", PasswordHash: "h", Role: "customer"})
	if err != nil {
		t.Fatalf("failed to create customer: %v", err)
	}
	userVendor, err := queries.CreateUser(ctx, db.CreateUserParams{Email: "v@v.com", PasswordHash: "h", Role: "vendor"})
	if err != nil {
		t.Fatalf("failed to create vendor user: %v", err)
	}
	customerUUID = userCustomer.ID
	vendorUUID = userVendor.ID

	vendor, err := queries.CreateVendor(ctx, db.CreateVendorParams{
		UserID: vendorUUID, Name: "V",
	})
	if err != nil {
		t.Fatalf("failed to create vendor: %v", err)
	}

	var price pgtype.Numeric
	if err := price.Scan("10.50"); err != nil {
		t.Fatalf("failed to scan price: %v", err)
	}
	menuItem, err := queries.CreateMenuItem(ctx, db.CreateMenuItemParams{
		VendorID: vendor.ID, Name: "Burger", Price: price, StockQty: 50, IsAvailable: true,
	})
	if err != nil {
		t.Fatalf("failed to create item: %v", err)
	}

	itemIDStr := fmt.Sprintf("%x-%x-%x-%x-%x", menuItem.ID.Bytes[0:4], menuItem.ID.Bytes[4:6], menuItem.ID.Bytes[6:8], menuItem.ID.Bytes[8:10], menuItem.ID.Bytes[10:16])
	vendorIDStr := fmt.Sprintf("%x-%x-%x-%x-%x", vendor.ID.Bytes[0:4], vendor.ID.Bytes[4:6], vendor.ID.Bytes[6:8], vendor.ID.Bytes[8:10], vendor.ID.Bytes[10:16])
	customerIDStr := fmt.Sprintf("%x-%x-%x-%x-%x", customerUUID.Bytes[0:4], customerUUID.Bytes[4:6], customerUUID.Bytes[6:8], customerUUID.Bytes[8:10], customerUUID.Bytes[10:16])

	// 2. Test Order Creation & Total Calculation
	t.Run("CreateOrder_CalculatesTotal", func(t *testing.T) {
		req := service.CreateOrderRequest{
			CustomerID: customerIDStr,
			VendorID:   vendorIDStr,
			Items: map[string]int32{
				itemIDStr: 2, // 2 * 10.50 = 21.00
			},
			IdempotencyKey: "test-key-1",
			UseRedisLock:   false,
		}

		order, err := orderService.CreateOrder(ctx, req)
		if err != nil {
			t.Fatalf("failed to create order: %v", err)
		}

		totalFloat, _ := order.TotalAmount.Float64Value()
		if totalFloat.Float64 != 21.00 {
			t.Errorf("Expected total 21.00, got %f", totalFloat.Float64)
		}
	})

	// 3. Test Idempotency
	t.Run("CreateOrder_Idempotency", func(t *testing.T) {
		req := service.CreateOrderRequest{
			CustomerID: customerIDStr,
			VendorID:   vendorIDStr,
			Items: map[string]int32{
				itemIDStr: 1,
			},
			IdempotencyKey: "test-key-2",
			UseRedisLock:   false,
		}

		// First call
		order1, err := orderService.CreateOrder(ctx, req)
		if err != nil {
			t.Fatalf("failed to create order 1: %v", err)
		}

		// Second call with same idempotency key
		order2, err := orderService.CreateOrder(ctx, req)
		if err != nil {
			t.Fatalf("failed to create order 2: %v", err)
		}

		// IDs should be exactly the same
		if order1.ID != order2.ID {
			t.Errorf("Idempotency failed: expected order ID %v to match %v", order1.ID, order2.ID)
		}
	})
}

func setupSchema(t *testing.T, pool *pgxpool.Pool) {
	ctx := context.Background()
	schema := `
	CREATE TABLE users (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		email VARCHAR(255) UNIQUE NOT NULL,
		password_hash VARCHAR(255) NOT NULL,
		role VARCHAR(50) NOT NULL,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE vendors (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		user_id UUID REFERENCES users(id) ON DELETE CASCADE,
		name VARCHAR(255) NOT NULL,
		address VARCHAR(255) NOT NULL DEFAULT '',
		is_open BOOLEAN NOT NULL DEFAULT false,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE menu_items (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
		name VARCHAR(255) NOT NULL,
		price NUMERIC(10, 2) NOT NULL,
		stock_qty INTEGER NOT NULL DEFAULT 0,
		is_available BOOLEAN NOT NULL DEFAULT true,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE orders (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
		vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
		status VARCHAR(50) NOT NULL DEFAULT 'placed',
		total_amount NUMERIC(10, 2) NOT NULL,
		idempotency_key VARCHAR(255) UNIQUE,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE order_items (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
		menu_item_id UUID REFERENCES menu_items(id) ON DELETE RESTRICT,
		qty INTEGER NOT NULL,
		price_at_order_time NUMERIC(10, 2) NOT NULL
	);
	`
	_, err := pool.Exec(ctx, schema)
	if err != nil {
		t.Fatalf("failed to setup schema: %v", err)
	}
}
