-- Add locations table for multi-location businesses
-- Migration: 002_add_locations.sql

CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  
  -- Required core fields
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'USA',
  status TEXT NOT NULL CHECK(status IN ('active', 'coming-soon', 'closed', 'temporarily-closed')) DEFAULT 'active',
  
  -- Optional location details
  display_name TEXT,
  address TEXT,
  zip_code TEXT,
  full_address TEXT,
  
  -- Contact info
  phone TEXT,
  email TEXT,
  
  -- Integration data
  google_maps_url TEXT,
  store_id TEXT,
  order_link TEXT,
  
  -- Metadata
  is_headquarters BOOLEAN DEFAULT 0,
  note TEXT,
  priority INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_locations_business_id ON locations(business_id);
CREATE INDEX IF NOT EXISTS idx_locations_status ON locations(status);
CREATE INDEX IF NOT EXISTS idx_locations_state ON locations(state);
CREATE INDEX IF NOT EXISTS idx_locations_country ON locations(country);
CREATE INDEX IF NOT EXISTS idx_locations_is_headquarters ON locations(is_headquarters);

-- Add location_id to service_areas table to link specific service areas to locations
ALTER TABLE service_areas ADD COLUMN location_id TEXT REFERENCES locations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_service_areas_location_id ON service_areas(location_id);
