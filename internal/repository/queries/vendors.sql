-- name: CreateVendor :one
INSERT INTO vendors (user_id, name, address, is_open)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetVendorByID :one
SELECT * FROM vendors
WHERE id = $1 LIMIT 1;

-- name: GetVendorByUserID :one
SELECT * FROM vendors
WHERE user_id = $1 LIMIT 1;

-- name: ListVendors :many
SELECT * FROM vendors
ORDER BY created_at DESC;

-- name: UpdateVendorStatus :one
UPDATE vendors
SET is_open = $2
WHERE id = $1
RETURNING *;
