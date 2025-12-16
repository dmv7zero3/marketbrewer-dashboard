# Build Plan (EC2-First)

Concise phases to reach a working MVP on a single EC2 instance.

## Phase 1: Foundation

- Workspace configs: ensure root and per-package `tsconfig.json` are strict
- Server scaffold: `src/index.ts`, `middleware/{auth,cors,error-handler}.ts`, `db/connection.ts`
- Worker scaffold: `src/index.ts`, `api-client.ts`, heartbeat stub
- Dashboard scaffold: `public/index.html`, `src/index.tsx`, `src/App.tsx`, Tailwind setup (`tailwind.config.js`, `postcss.config.js`, `styles/globals.css`), webpack configs
- Env setup: `.env` in each package with `API_TOKEN`, base URLs

## Phase 2: Core Features

- Initial schema: create `migrations/001_initial_schema.sql` from `DATABASE.md` (apply once on fresh DB)
- API endpoints: businesses, keywords, service-areas, prompts, jobs, workers (validation via zod)
- Dashboard pages: Businesses list/detail, Prompts editor, Job creation/status, Worker status

## Phase 3: Integration

- Worker: implement claim → generate (Ollama, CPU-only by default) → complete/fail, backoff & retry (max attempts configurable)
- Export: server builds JSON manifests under `output/{business}/`
- EC2 ops: systemd units (preferred) with `LimitNOFILE` ulimit, auto-shutdown script, CloudWatch alarms

## Out of Scope (for now)

- Multi-worker orchestration
- Cloud LLM fallback
- DynamoDB/SQS migration
