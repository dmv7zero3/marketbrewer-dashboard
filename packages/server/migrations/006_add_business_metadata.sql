-- Migration 006: Add business metadata tables
-- Stores additional business information like social media, specialties, etc.

CREATE TABLE IF NOT EXISTS business_metadata (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  base_url TEXT,
  order_online_url TEXT,
  description TEXT,
  specialties TEXT, -- JSON array of specialties
  social_media TEXT, -- JSON with social media links
  content_themes TEXT, -- JSON with content themes/tags
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
