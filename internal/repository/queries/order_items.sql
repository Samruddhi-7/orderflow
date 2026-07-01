-- name: CreateOrderItem :one
INSERT INTO order_items (order_id, menu_item_id, qty, price_at_order_time)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListOrderItemsByOrder :many
SELECT * FROM order_items
WHERE order_id = $1;
