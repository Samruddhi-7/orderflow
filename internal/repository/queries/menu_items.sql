-- name: CreateMenuItem :one
INSERT INTO menu_items (vendor_id, name, price, stock_qty, is_available)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetMenuItemByID :one
SELECT * FROM menu_items
WHERE id = $1 LIMIT 1;

-- name: ListMenuItemsByVendor :many
SELECT * FROM menu_items
WHERE vendor_id = $1
ORDER BY name ASC;

-- name: UpdateMenuItemStock :one
UPDATE menu_items
SET stock_qty = $2
WHERE id = $1
RETURNING *;

-- name: UpdateMenuItemPrice :one
UPDATE menu_items
SET price = $2
WHERE id = $1
RETURNING *;
