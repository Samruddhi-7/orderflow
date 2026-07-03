-- Migration Down: Remove image_url column from vendors table

ALTER TABLE vendors
DROP COLUMN IF EXISTS image_url;
