# Pre-Dry-Run Review Report

**Date**: December 20, 2025
**Status**: Ready for dry-run testing

---

## Verified

### Database Schema Integrity

See [architecture/DATABASE.md](./architecture/DATABASE.md) for full schema reference.

- **service_areas table**: Has `country` (migration 012), `updated_at` (migration 013), `location_id` (migration 002), and ordering index (migration 014)
- **keywords table**: Has `language` field (migration 008), no `priority` field (removed in migration 007)
- **job_pages table**: Has `keyword_text` (migration 009), `keyword_language` (migration 010), and tracking fields (`model_name`, `prompt_version`, `generation_duration_ms`, `word_count`)
- **Migrations 001-014**: Sequentially designed with idempotent handling via `_migrations` tracking table

### Worker Template Flow
- **Template substitution**: `substituteVariables()` uses `{{variable}}` pattern matching
- **buildVariables()**: Consolidates 25+ variables from page, business, and questionnaire data
- **Unsubstituted variable warnings**: Logs warnings when variables remain unsubstituted
- **Fallback prompt**: Present via `buildFallbackPrompt()` when no template is stored

### Server Claim Endpoint

See [api/ENDPOINTS.md](./api/ENDPOINTS.md) for full API reference.

- **Enriched response**: Returns `{ page, business, questionnaire, template }`
- **Template lookup**: Fetches highest active version with `ORDER BY version DESC LIMIT 1`
- **Business data included**: All relevant fields (id, name, industry, phone, email, website, etc.)

### API Route Consistency
- **Route mounting**: Routes under `/businesses` and legacy `/businesses/seo` namespace
- **Rate limiter**: Production-only
- **Endpoints verified**: keywords, service-areas, locations, jobs/claim

### Token Alignment
- **Default token**: `local-dev-token-12345` consistent across smoke-tests.sh, integration tests, and dashboard

---

## Warnings

### 1. Template Variable Coverage Gap
The worker builds 25+ variables, but no validation that templates only reference available variables. Unsubstituted variables remain in output as raw `{{variable}}` text.

**Recommendation**: Add template validation at save time.

### 2. Ollama Error Handling
No explicit retry logic at Ollama level - only 3-attempt job-level retry.

**Recommendation**: Consider Ollama-specific retry with exponential backoff for transient errors.

### 3. Questionnaire Data Parsing
Malformed questionnaire data falls back to empty object silently.

**Recommendation**: Log warning when questionnaire parsing fails.

---

## Blockers

**None identified.** Codebase is ready for dry-run testing.

---

## Pre-Dry-Run Checklist

Before running:
- [ ] Ollama is running with `llama3.2:latest` model pulled
- [ ] Database freshly migrated (all 14 migrations)
- [ ] API_TOKEN matches between server and worker environments
- [ ] At least one prompt template created for target page_type

### Commands

```bash
# Verify Ollama
curl http://localhost:11434/api/tags

# Apply all migrations (server auto-applies on startup via db/connection.ts)
# Or manually: for f in packages/server/migrations/*.sql; do sqlite3 ./packages/server/data/seo-platform.db < "$f"; done

# Start server (auto-applies pending migrations)
npm run dev:server

# Run smoke tests
./scripts/smoke-tests.sh local

# Run integration tests
API_BASE=http://127.0.0.1:3001 API_TOKEN=local-dev-token-12345 npm run test -- packages/server/src/routes/__tests__/locations.integration.test.ts

# Start worker (in separate terminal)
npm run dev:worker
```

> **Note**: The server automatically applies pending migrations on startup via the `_migrations` tracking table in `packages/server/src/db/connection.ts`.

---

## Monitoring During Dry Run

Watch for:
- `⚠️ Unsubstituted variables` — template/data mismatches
- `⚠️ No active template found` — missing prompt templates
- Generation duration metrics — baseline performance
- Error rate in job completion

---

## Post-Dry-Run Validation

After generating test pages, verify:
- [ ] Spanish keywords generate Spanish content
- [ ] All template variables are populated correctly
- [ ] JSON content structure matches expected schema
- [ ] Pages marked completed have valid content
- [ ] Failed pages have meaningful error messages

---

## Template Variables Reference

Available variables for prompt templates:

| Category | Variables |
|----------|-----------|
| **Required** | `business_name`, `city`, `state`, `phone` |
| **Business Profile** | `industry`, `industry_type`, `email`, `website`, `gbp_url`, `primary_city`, `primary_state` |
| **Questionnaire** | `tagline`, `year_established`, `years_experience`, `owner_name`, `target_audience`, `languages`, `voice_tone`, `tone`, `cta_text`, `forbidden_terms`, `service_type` |
| **Keywords/Services** | `keyword`, `primary_keyword`, `primary_service`, `services_list` |
| **Page Context** | `url_path`, `language`, `output_language` |
