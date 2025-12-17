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

## ✅ Phase 2 Complete (Dec 16, 2024)

**Ollama Integration Sprint:**

- [x] P0 Fix: Named parameters in batch insert
- [x] P0 Fix: Atomic claim with UPDATE...RETURNING
- [x] P0 Fix: Ollama health check at startup
- [x] Real generateContent() with OllamaClient
- [x] Prompt template system (hardcoded for V1)
- [x] JSON parsing with fallback handling
- [x] Error handling for LLM failures
- [x] Database seeded with Nash & Smashed (26 locations, 50 keywords)
- [x] End-to-end test: Created job, ran worker, generated 1 page
- [x] Committed and pushed to main (41b6f4e)

**Verified Working:**

- Server API on :3001
- Worker claiming and generating pages
- Ollama integration (llama3.2:latest)
- Sample output: `/best-food-near-me/fairfax-county-va`

## 🚧 Phase 3: Production Readiness

**Immediate (P0):**

1. **Dashboard Dev Stability**

   - Verify dev server works on :3002
   - Confirm CORS/auth is clean (no 401/CORS)
   - Test job creation flow end-to-end

2. **Batch Generation**

   - Run worker on 50-page dry run (Nash & Smashed)
   - Validate content quality; adjust prompts if needed
   - Then run worker on full 1,300 page job
   - Monitor for failures/timeouts
   - Verify completion

3. **Content Quality Review**
   - Review 10-20 generated pages
   - Assess SEO quality
   - Refine prompt template if needed

**Important (P1):**

4. **Dashboard CRUD Pages**

   - Keywords management
   - Service areas management
   - Prompt template editor

5. **JSON Export Pipeline**

   - Export completed pages to JSON
   - Prepare for static site build
   - Test with sample pages

6. **Performance Testing**
   - Monitor generation speed
   - Identify bottlenecks
   - Optimize if needed

## Later (Post-MVP)

- Multi-worker orchestration
- Worker heartbeat/health monitoring
- Stale page release endpoint
- Cloud LLM fallback
- DynamoDB/SQS migration
