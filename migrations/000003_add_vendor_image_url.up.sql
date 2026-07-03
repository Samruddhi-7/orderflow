-- Migration: Add image_url column to vendors table

ALTER TABLE vendors
ADD COLUMN image_url TEXT;
