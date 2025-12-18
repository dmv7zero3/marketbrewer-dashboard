-- Migration: 004_simplify_location_status.sql
-- Simplifies location status from 4 options to 2 (active, upcoming)
-- 
-- Previous values: active, coming-soon, closed, temporarily-closed
-- New values: active, upcoming
--
-- Migration strategy:
-- - active → active (no change)
-- - coming-soon → upcoming
-- - closed → (archived - create archive table first)
-- - temporarily-closed → upcoming (with note)

-- Step 1: Create archive table for closed locations
CREATE TABLE IF NOT EXISTS locations_archive (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  
  -- Core fields
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'USA',
  original_status TEXT NOT NULL, -- Preserve original status for reference
  
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
  
  -- Archive metadata
  archived_at TEXT NOT NULL,
  archive_reason TEXT,
  
  -- Original timestamps
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_locations_archive_business_id ON locations_archive(business_id);

-- Step 2: Archive closed locations before modifying status
INSERT INTO locations_archive (
  id, business_id, name, city, state, country, original_status,
  display_name, address, zip_code, full_address,
  phone, email, google_maps_url, store_id, order_link,
  is_headquarters, note, priority,
  archived_at, archive_reason, created_at, updated_at
)
SELECT 
  id, business_id, name, city, state, country, status,
  display_name, address, zip_code, full_address,
  phone, email, google_maps_url, store_id, order_link,
  is_headquarters, note, priority,
  datetime('now'), 'Status migration - location was closed', created_at, updated_at
FROM locations
WHERE status IN ('closed', 'temporarily-closed');

-- Step 3: Delete closed locations from main table
DELETE FROM locations WHERE status IN ('closed', 'temporarily-closed');

-- Step 4: Update coming-soon to upcoming
UPDATE locations SET status = 'upcoming' WHERE status = 'coming-soon';

-- Step 5: SQLite doesn't support ALTER COLUMN, so we need to recreate the table
-- Create new table with updated constraint
CREATE TABLE locations_new (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  
  -- Required core fields
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'USA',
  status TEXT NOT NULL CHECK(status IN ('active', 'upcoming')) DEFAULT 'active',
  
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

-- Step 6: Copy data from old table to new
INSERT INTO locations_new SELECT * FROM locations;

-- Step 7: Drop old table and rename new one
DROP TABLE locations;
ALTER TABLE locations_new RENAME TO locations;

-- Step 8: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_locations_business_id ON locations(business_id);
CREATE INDEX IF NOT EXISTS idx_locations_status ON locations(status);
CREATE INDEX IF NOT EXISTS idx_locations_state ON locations(state);
CREATE INDEX IF NOT EXISTS idx_locations_country ON locations(country);
CREATE INDEX IF NOT EXISTS idx_locations_is_headquarters ON locations(is_headquarters);
