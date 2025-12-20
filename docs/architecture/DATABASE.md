# Database Schema

SQLite schema for V1 local-first architecture.

---

## Overview

Single SQLite file at `./data/seo-platform.db`.

All tables include `business_id` for multi-tenant isolation.

---

## Tables

### businesses

```sql
CREATE TABLE businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  website TEXT,
  phone TEXT,
  email TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### questionnaires

```sql
CREATE TABLE questionnaires (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  data TEXT NOT NULL,  -- JSON blob
  completeness_score INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### keywords

```sql
CREATE TABLE keywords (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  slug TEXT NOT NULL,
  keyword TEXT NOT NULL,
  search_intent TEXT,
  language TEXT NOT NULL DEFAULT 'en',  -- 'en' or 'es'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(business_id, slug)
);
```

Note: Keywords support bilingual pairs (EN/ES) with shared slugs.

### service_areas

```sql
CREATE TABLE service_areas (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  slug TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  county TEXT,
  country TEXT NOT NULL DEFAULT 'USA',
  priority INTEGER DEFAULT 5,
  location_id TEXT,  -- Link to locations table
  updated_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(business_id, slug)
);

CREATE INDEX idx_service_areas_priority_updated
ON service_areas(business_id, priority DESC, updated_at DESC);
```

### prompt_templates

```sql
CREATE TABLE prompt_templates (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  page_type TEXT NOT NULL,  -- 'location-keyword' | 'service-area'
  -- location-keyword: store cities (from locations table) × keywords
  -- service-area: nearby cities (from service_areas table) × keywords
  version INTEGER NOT NULL DEFAULT 1,
  template TEXT NOT NULL,
  required_variables TEXT,  -- JSON array
  optional_variables TEXT,  -- JSON array
  word_count_target INTEGER DEFAULT 400,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(business_id, page_type, version)
);
```

### generation_jobs

```sql
CREATE TABLE generation_jobs (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  status TEXT DEFAULT 'pending',  -- pending | processing | completed | failed
  page_type TEXT NOT NULL,
  total_pages INTEGER NOT NULL,
  completed_pages INTEGER DEFAULT 0,
  failed_pages INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  started_at TEXT,
  completed_at TEXT
);
```

### job_pages

```sql
CREATE TABLE job_pages (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES generation_jobs(id),
  business_id TEXT NOT NULL REFERENCES businesses(id),
  keyword_slug TEXT,
  keyword_text TEXT,
  keyword_language TEXT NOT NULL DEFAULT 'en',
  service_area_slug TEXT NOT NULL,
  url_path TEXT NOT NULL,
  status TEXT DEFAULT 'queued',  -- queued | processing | completed | failed
  worker_id TEXT,
  attempts INTEGER DEFAULT 0,
  claimed_at TEXT,
  completed_at TEXT,
  content TEXT,  -- JSON blob with generated content
  error_message TEXT,
  section_count INTEGER DEFAULT 3,
  model_name TEXT,
  prompt_version TEXT,
  generation_duration_ms INTEGER,
  word_count INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_job_pages_status ON job_pages(job_id, status);
CREATE INDEX idx_job_pages_worker ON job_pages(worker_id, status);
CREATE INDEX idx_job_pages_claimable ON job_pages(job_id, status, attempts);
```

### workers

```sql
CREATE TABLE workers (
  id TEXT PRIMARY KEY,
  status TEXT DEFAULT 'active',  -- active | idle | offline
  last_heartbeat TEXT,
  current_page_id TEXT,
  pages_completed INTEGER DEFAULT 0,
  pages_failed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## Key Queries

### Atomic Page Claim

```sql
UPDATE job_pages
SET
  status = 'processing',
  worker_id = :worker_id,
  claimed_at = CURRENT_TIMESTAMP,
  attempts = attempts + 1
WHERE id = (
  SELECT id FROM job_pages
  WHERE job_id = :job_id
    AND status = 'queued'
  ORDER BY created_at ASC
  LIMIT 1
)
RETURNING *;
```

### Release Stale Pages

```sql
UPDATE job_pages
SET
  status = 'queued',
  worker_id = NULL,
  claimed_at = NULL
WHERE
  status = 'processing'
  AND claimed_at < datetime('now', '-5 minutes');
```

### Job Progress

```sql
SELECT
  status,
  COUNT(*) as count
FROM job_pages
WHERE job_id = :job_id
GROUP BY status;
```

---

## Migrations

Store in `packages/server/migrations/`:

```
migrations/
├── 001_initial_schema.sql
├── 002_add_locations.sql
├── 003_business_profile_v1_redesign.sql
├── 004_simplify_location_status.sql
├── 005_add_location_details.sql
├── 006_add_business_metadata.sql
├── 007_remove_keyword_priority.sql
├── 008_add_keyword_language.sql
├── 009_add_job_pages_keyword_text.sql
├── 010_add_job_pages_keyword_language.sql
├── 011_restore_location_integration_columns.sql
├── 012_add_service_areas_country.sql
├── 013_add_service_areas_updated_at.sql
└── 014_add_service_areas_ordering_index.sql
```

Run with:

```bash
sqlite3 ./packages/server/data/seo-platform.db < packages/server/migrations/001_initial_schema.sql
```

---

## Backup

```bash
# Simple backup
cp ./data/seo-platform.db ./data/seo-platform.db.backup

# With timestamp
cp ./data/seo-platform.db "./data/seo-platform-$(date +%Y%m%d-%H%M%S).db"
```

---

## Phase 2: DynamoDB Migration

When migrating to AWS, the schema maps to single-table design:

| SQLite Table    | DynamoDB PK         | DynamoDB SK       |
| --------------- | ------------------- | ----------------- |
| businesses      | `BUS#{id}`          | `PROFILE`         |
| keywords        | `BUS#{business_id}` | `KW#{slug}`       |
| service_areas   | `BUS#{business_id}` | `AREA#{slug}`     |
| generation_jobs | `JOB#{id}`          | `STATUS#{status}` |
| job_pages       | `JOB#{job_id}`      | `PAGE#{id}`       |
