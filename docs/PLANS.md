# Build Plan (EC2-First)

Concise, time-bound plan to deliver MVP on a single EC2 instance in 2–4 days.

## Phase 0: Pre-work (0.5 day)

- Verify Ollama runs on target EC2 instance (CPU-only) and pull `llama3.1:8b-instruct`.
- Quick benchmark: single prompt generation time; confirm acceptable.
- Confirm SQLite handles 5k+ rows on instance type.
- Provision EC2 with minimal security group (allow 3001 + SSH from trusted IPs).

## ✅ Phase 1: Foundation (COMPLETED - Dec 16, 2024)

- [x] Monorepo setup: root strict `tsconfig.json`, workspace tooling.
- [x] Server scaffold: `src/index.ts`, `middleware/{auth,cors,error-handler}.ts`, `db/connection.ts`, `routes/index.ts`.
- [x] Worker scaffold: `src/index.ts`, `worker.ts`, `api-client.ts` (heartbeat stub).
- [x] Dashboard scaffold: React pages, API client, Tailwind.
- [x] Shared package: `types/` and `schemas/` (Zod) with barrel exports.
- [x] Env setup: `.env` per package with `API_TOKEN`, base URLs; add `.env.example` files.

**Status:**

- ✅ All packages build successfully
- ✅ Server starts on :3001 and responds `/health`
- ✅ Worker can claim/complete pages (generation is placeholder)
- ✅ Dashboard pages functional (JobCreate, JobStatus)
- ✅ Database schema and seed scripts ready

## ✅ Phase 2: Ollama Integration (COMPLETED - Dec 16, 2024)

- [x] P0 Fix: Named parameters in batch insert (prevents column ordering bugs)
- [x] P0 Fix: Atomic claim with `UPDATE...RETURNING` (prevents race conditions)
- [x] P0 Fix: Ollama health check at startup (fail fast if misconfigured)
- [x] Real Ollama integration in worker (`generateContent()` with OllamaClient)
- [x] Hardcoded prompt template with variable injection
- [x] JSON parsing with fallback for non-JSON responses
- [x] Error handling for LLM failures
- [x] Database seeded: Nash & Smashed (26 locations, 50 keywords)
- [x] End-to-end test: 1 page generated successfully

**Deliverables:**

- ✅ Worker generates real content via Ollama (llama3.2:latest)
- ✅ Tested: `POST /api/businesses/nash-and-smashed/generate`
- ✅ Sample output: `/best-food-near-me/fairfax-county-va` with JSON content
- ✅ Database: 1,300 pages ready for generation

**Git:**

- Commit: `41b6f4e` - "Ollama Integration Sprint: P0 fixes + content generation"
- Pushed to: `main`

## Phase 3: Production Readiness (Next - 1-2 days)

**Remaining P1 Items:**

- [ ] Dashboard: Keywords/service areas CRUD pages
- [ ] Dashboard: Prompt template editor
- [ ] API: Prompt template endpoints
- [ ] Dashboard: Business management pages

**Deferred to Later:**

- P2 endpoints: `workers`, `questionnaires` (not critical for MVP)

## Phase 3: Production Readiness (0.5–1 day)

**Tasks:**

- [ ] Dashboard webpack config (currently broken)
- [ ] Batch generation script for full job (1,300 pages)
- [ ] Error monitoring and logging
- [ ] JSON export for static site deployment
- [ ] Performance testing with full job
- [ ] Content quality review and prompt refinement 5. PUT complete/fail with content/error. 6. Retry with `MAX_ATTEMPTS=3`, `BACKOFF_MS=5000`.
- Export: server writes JSON manifests under `output/{business_id}/` with pages and metadata.
- EC2 ops: systemd units (preferred) with `LimitNOFILE`, auto-shutdown script, CloudWatch alarms.

Deliverable:

- End-to-end: generate 10 test pages; JSON in `output/`.

## Acceptance Criteria

- Dashboard accessible (local or EC2), API `/health` responds, worker completes a page, JSON written to `output/{business_id}/`, auto-shutdown cron installed.

## Out of Scope (for now)

- Multi-worker orchestration
- Cloud LLM fallback
- DynamoDB/SQS migration
