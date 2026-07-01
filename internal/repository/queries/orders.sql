-- name: CreateOrder :one
INSERT INTO orders (customer_id, vendor_id, status, total_amount, idempotency_key)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetOrderByID :one
SELECT * FROM orders
WHERE id = $1 LIMIT 1;

-- name: GetOrderByIdempotencyKey :one
SELECT * FROM orders
WHERE idempotency_key = $1 LIMIT 1;

-- name: ListOrdersByCustomer :many
SELECT * FROM orders
WHERE customer_id = $1
ORDER BY created_at DESC;

-- name: ListOrdersByVendor :many
SELECT * FROM orders
WHERE vendor_id = $1
ORDER BY created_at DESC;

-- name: UpdateOrderStatus :one
UPDATE orders
SET status = $2, updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;
