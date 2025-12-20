-- Migration 014: Add compound index for service_areas ordering
--
-- The API orders service areas by priority DESC, updated_at DESC.
-- This index supports that query pattern efficiently.

CREATE INDEX IF NOT EXISTS idx_service_areas_priority_updated
ON service_areas(business_id, priority DESC, updated_at DESC);
