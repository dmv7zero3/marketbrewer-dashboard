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

## Phase 2: Core Features (1–1.5 days)

- Initial schema: create `migrations/001_initial_schema.sql` from `DATABASE.md` (apply once on fresh DB).
- API endpoints (tiers):
  - P0: `businesses`, `jobs`, `job-pages` (minimum for generation).
  - P1: `keywords`, `service-areas`, `prompts`.
  - P2: `workers`, `questionnaires`.
- Dashboard pages (tiers):
  - P0: Job creation, Job status.
  - P1: Businesses CRUD, Prompts editor.

Deliverable:

- Create job via dashboard; job visible in DB with pages queued.

## Phase 3: Integration (0.5–1 day)

- Worker loop:
  1.  Poll claimable job/pages.
  2.  POST claim → get page data.
  3.  Build prompt from template + variables.
  4.  Generate via Ollama.
  5.  PUT complete/fail with content/error.
  6.  Retry with `MAX_ATTEMPTS=3`, `BACKOFF_MS=5000`.
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
