-- Migration 011: Restore missing integration columns on locations
--
-- Migration 004 recreates the locations table but accidentally dropped
-- some columns that the API expects to read/write.
--
-- This migration re-adds those columns.

ALTER TABLE locations ADD COLUMN google_maps_url TEXT;
ALTER TABLE locations ADD COLUMN store_id TEXT;
ALTER TABLE locations ADD COLUMN order_link TEXT;
