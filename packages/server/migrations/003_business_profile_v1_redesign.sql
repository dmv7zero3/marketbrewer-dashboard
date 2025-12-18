-- Business Profile V1 Redesign
-- Migration: 003_business_profile_v1_redesign.sql
-- Date: December 2025
-- Description: Simplify business profile, add profile locations/hours/social tables

PRAGMA foreign_keys = ON;

-- Add new columns to businesses (nullable for backward compatibility)
ALTER TABLE businesses ADD COLUMN industry_type TEXT;
ALTER TABLE businesses ADD COLUMN primary_city TEXT;
ALTER TABLE businesses ADD COLUMN primary_state TEXT;
ALTER TABLE businesses ADD COLUMN gbp_url TEXT;

-- Backfill industry_type from existing industry where possible
UPDATE businesses SET industry_type = industry WHERE industry_type IS NULL AND industry IS NOT NULL;

-- Profile locations (separate from existing SEO "locations" table)
CREATE TABLE IF NOT EXISTS business_locations (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  location_type TEXT NOT NULL DEFAULT 'service_area',
  is_primary INTEGER DEFAULT 0,

  street_address TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT,
  country TEXT DEFAULT 'US',

  latitude REAL,
  longitude REAL,

  created_at TEXT DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(business_id, city, state, street_address)
);

CREATE INDEX IF NOT EXISTS idx_business_locations_business ON business_locations(business_id);
CREATE INDEX IF NOT EXISTS idx_business_locations_primary ON business_locations(business_id, is_primary);

-- Business hours
CREATE TABLE IF NOT EXISTS business_hours (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  day_of_week TEXT NOT NULL,
  opens TEXT,
  closes TEXT,
  is_closed INTEGER DEFAULT 0,

  UNIQUE(business_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_business_hours_business ON business_hours(business_id);

-- Social links
CREATE TABLE IF NOT EXISTS business_social_links (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  platform TEXT NOT NULL,
  url TEXT NOT NULL,

  UNIQUE(business_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_business_social_business ON business_social_links(business_id);
