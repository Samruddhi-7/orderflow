-- Migration Down: Clean up all tables created in initialization

DROP INDEX IF EXISTS idx_orders_vendor_id_status;
DROP INDEX IF EXISTS idx_menu_items_vendor_id_is_available;

DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS vendors;
DROP TABLE IF EXISTS users;
