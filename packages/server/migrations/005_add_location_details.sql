-- Migration 005: Add coordinates and hours to locations
-- Adds support for lat/lng coordinates and operating hours

ALTER TABLE locations ADD COLUMN latitude REAL;
ALTER TABLE locations ADD COLUMN longitude REAL;
ALTER TABLE locations ADD COLUMN hours_json TEXT; -- JSON with hours by day
