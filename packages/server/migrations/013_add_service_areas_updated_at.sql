-- Migration 013: Add updated_at to service_areas
--
-- Some API flows update/link service areas and expect an updated_at field.
-- Use ISO 8601 format to match runtime code (new Date().toISOString()).

ALTER TABLE service_areas ADD COLUMN updated_at TEXT;

UPDATE service_areas
SET updated_at = COALESCE(updated_at, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));
