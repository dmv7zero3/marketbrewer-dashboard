-- Migration 012: Add country column to service_areas
--
-- service_areas are created/linked from locations and should track country.
-- Add a default for existing rows.

ALTER TABLE service_areas ADD COLUMN country TEXT NOT NULL DEFAULT 'USA';
