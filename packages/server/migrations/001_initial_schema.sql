-- Initial SQLite schema for MarketBrewer SEO Platform (apply once on fresh DB)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  website TEXT,
  phone TEXT,
  email TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS questionnaires (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  data TEXT NOT NULL,
  completeness_score INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS keywords (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  slug TEXT NOT NULL,
  keyword TEXT NOT NULL,
  search_intent TEXT,
  priority INTEGER DEFAULT 5,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(business_id, slug)
);

CREATE TABLE IF NOT EXISTS service_areas (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  slug TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  county TEXT,
  priority INTEGER DEFAULT 5,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(business_id, slug)
);

CREATE TABLE IF NOT EXISTS prompt_templates (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  page_type TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  template TEXT NOT NULL,
  required_variables TEXT,
  optional_variables TEXT,
  word_count_target INTEGER DEFAULT 400,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(business_id, page_type, version)
);

CREATE TABLE IF NOT EXISTS generation_jobs (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  status TEXT DEFAULT 'pending',
  page_type TEXT NOT NULL,
  total_pages INTEGER NOT NULL,
  completed_pages INTEGER DEFAULT 0,
  failed_pages INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  started_at TEXT,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS job_pages (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES generation_jobs(id),
  business_id TEXT NOT NULL REFERENCES businesses(id),
  keyword_slug TEXT,
  service_area_slug TEXT NOT NULL,
  url_path TEXT NOT NULL,
  status TEXT DEFAULT 'queued',
  worker_id TEXT,
  attempts INTEGER DEFAULT 0,
  claimed_at TEXT,
  completed_at TEXT,
  content TEXT,
  error_message TEXT,
  -- New tracking fields
  section_count INTEGER DEFAULT 3,
  model_name TEXT,
  prompt_version TEXT,
  generation_duration_ms INTEGER,
  word_count INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_pages_status ON job_pages(job_id, status);
CREATE INDEX IF NOT EXISTS idx_job_pages_worker ON job_pages(worker_id, status);

CREATE TABLE IF NOT EXISTS workers (
  id TEXT PRIMARY KEY,
  status TEXT DEFAULT 'active',
  last_heartbeat TEXT,
  current_page_id TEXT,
  pages_completed INTEGER DEFAULT 0,
  pages_failed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
