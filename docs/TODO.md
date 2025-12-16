# Project TODO

Short, actionable tasks tracked before implementation.

## ✅ Phase 1 Complete (Dec 16, 2024)

- [x] Monorepo setup with npm workspaces
- [x] Scaffold server, worker, dashboard packages
- [x] Add initial schema `migrations/001_initial_schema.sql`
- [x] Create `.env.example` in all packages
- [x] Implement shared types, schemas (Zod), utilities
- [x] Server: Express + SQLite + auth + CORS + error handling
- [x] Worker: job processor with claim/complete cycle
- [x] Dashboard: React pages for job creation/status
- [x] Scripts: seed-db, export-json
- [x] Sample seed: Nash & Smashed

## 🚧 Phase 2: Ready to Start

**Critical Path:**

1. **Ollama Integration** - Replace placeholder generation in `packages/worker/src/worker.ts`

   - Implement actual LLM calls to Ollama API
   - Handle prompt template variable substitution
   - Add error handling for Ollama timeouts/failures

2. **Prompt Template System**

   - Build prompt from business data + keywords + service areas
   - Fetch active prompt template from DB
   - Variable substitution logic

3. **Business Data Endpoints** (P1 APIs from PLANS.md)

   - `/api/businesses/:id/keywords` - CRUD for keywords
   - `/api/businesses/:id/service-areas` - CRUD for service areas
   - `/api/businesses/:id/prompts` - CRUD for prompt templates

4. **Dashboard Enhancement**

   - Business list/detail pages
   - Keyword/service area management
   - Prompt editor with preview

5. **Unit Testing** (Along the way)

   - Set up Jest + @types/jest
   - Test utilities (toSlug, calculateCompletenessScore, generateId)
   - Test Zod schemas (validation edge cases)
   - Test Ollama client (mock responses)
   - Test prompt builder (variable substitution)
   - Target: 70%+ coverage on shared/worker packages

6. **End-to-End Testing**
   - Seed database with test data
   - Create job via dashboard
   - Worker generates content via Ollama
   - Verify JSON export

## Later (Post-MVP)

- Multi-worker orchestration
- Worker heartbeat/health monitoring
- Stale page release endpoint
- Cloud LLM fallback
- DynamoDB/SQS migration
