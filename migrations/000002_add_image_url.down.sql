-- Migration Down: Remove image_url column from menu_items table

ALTER TABLE menu_items
DROP COLUMN IF EXISTS image_url;
