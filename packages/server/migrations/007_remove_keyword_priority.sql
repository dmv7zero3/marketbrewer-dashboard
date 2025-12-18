-- Migration: Remove priority column from keywords table
-- Reason: Simplified keyword management without priority levels
-- Date: December 18, 2024

-- SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
-- Step 1: Create new table without priority column
CREATE TABLE keywords_new (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  keyword TEXT NOT NULL,
  search_intent TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(business_id, slug),
  FOREIGN KEY(business_id) REFERENCES businesses(id)
);

-- Step 2: Copy data from old table to new table (excluding priority)
INSERT INTO keywords_new (id, business_id, slug, keyword, search_intent, created_at)
SELECT id, business_id, slug, keyword, search_intent, created_at
FROM keywords;

-- Step 3: Drop old table
DROP TABLE keywords;

-- Step 4: Rename new table to original name
ALTER TABLE keywords_new RENAME TO keywords;

-- Step 5: Recreate indexes
CREATE INDEX idx_keywords_business_id ON keywords(business_id);
