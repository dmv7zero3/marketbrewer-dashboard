# LLM Code Review Prompt

Copy this entire prompt and paste it into Claude/ChatGPT along with access to the GitHub repository.

---

## Repository Context

**Repository:** https://github.com/dmv7zero3/marketbrewer-seo-platform  
**Branch:** main  
**Project:** Local SEO content generation platform (V1 - Local-first)  
**Owner:** Jorge Giraldez, MarketBrewer LLC

---

## Project Overview

This is a **monorepo** TypeScript project for automated local SEO content generation:

### Architecture

- **Dashboard:** React 18 + TypeScript + Tailwind (user interface)
- **Server:** Express + TypeScript + SQLite (REST API)
- **Worker:** TypeScript + Ollama (LLM content generation)
- **Shared:** TypeScript types and utilities

### Key Technologies

- **Database:** SQLite with better-sqlite3 (synchronous API, WAL mode)
- **LLM:** Ollama (local-only, no cloud fallback in V1)
- **Testing:** Jest + babel-jest (57 tests, coverage-focused)
- **Build:** TypeScript strict mode, webpack 5 for dashboard

### Current Status

- ✅ Phase 1 implementation complete (32 files)
- ✅ Testing infrastructure established (Jest/babel-jest)
- ✅ Quick wins sprint completed (performance + security)
- ✅ Unicode slug generation fixed (SEO-critical)
- ✅ Environment variables documented
- 🔄 Phase 2 pending: Ollama integration, end-to-end workflow

---

## Recent Work Summary

### Commits (Last 3)

1. **0317ddd** - Unicode slug fix: "San José" → "san-jose" (6 new tests)
2. **e67d29b** - Quick wins sprint: Composite indexes, batch inserts, helmet security
3. **74c4cfb** - Environment variables documentation

### Quick Wins Implemented

1. Unicode normalization for international city names
2. Composite indexes for claim query optimization (10x faster)
3. Batch insert via db.transaction() for job pages (10x faster)
4. Helmet middleware for security headers (11 headers)
5. Request size limit (1mb) for DoS protection

### Test Coverage

- **Shared:** 38 tests, 100% coverage
- **Worker:** 17 tests, 100% coverage (mocked Ollama)
- **Server:** 6 tests, 37.73% coverage (auth middleware only)
- **Total:** 57 tests passing

---

## Documentation Structure

Review these files for context:

### Core Documentation

- `docs/README.md` - Project overview
- `docs/STRUCTURE.md` - File organization
- `docs/CONVENTIONS.md` - Code style rules
- `docs/QUESTIONS.md` - Running questions/decisions
- `docs/ENVIRONMENT.md` - Environment variables reference

### Architecture

- `docs/architecture/OVERVIEW.md` - System design
- `docs/architecture/DATABASE.md` - SQLite schema
- `docs/architecture/WORKER-QUEUE.md` - Job queue design

### API

- `docs/api/ENDPOINTS.md` - REST API spec
- `docs/api/CORS.md` - CORS policy
- `docs/api/AUTH.md` - Authentication

### Decisions

- `docs/decisions/001-monorepo.md` - Why monorepo
- `docs/decisions/002-sqlite-v1.md` - Why SQLite for V1
- `docs/decisions/003-ollama-only.md` - Why local LLM only
- `docs/decisions/004-ec2-first.md` - Why EC2 deployment

---

## Review Request

Please conduct a comprehensive code review focusing on:

### 1. Architecture & Design

- Is the monorepo structure appropriate for this project?
- Are the package boundaries clean (dashboard/server/worker/shared)?
- Is SQLite + better-sqlite3 the right choice for V1?
- Are there architectural anti-patterns or technical debt?
- Is the worker queue design sound for job processing?

**Questions to answer:**

- Should worker be a separate process or integrated into server?
- Is the synchronous better-sqlite3 API better than async node-sqlite3?
- Are there scaling bottlenecks we should address before V2?

---

### 2. Code Quality & TypeScript

- Review TypeScript usage (strict mode enforced)
- Check for `any` types or missing return types
- Verify error handling patterns are consistent
- Assess code organization and file structure
- Check for DRY violations or code duplication

**Focus areas:**

- `packages/server/src/routes/*.ts` - REST route handlers
- `packages/server/src/db/connection.ts` - Database helpers
- `packages/shared/src/types/*.ts` - Type definitions
- `packages/shared/src/utils/index.ts` - Utility functions

**Questions to answer:**

- Are type definitions comprehensive and accurate?
- Is error handling robust enough for production?
- Are there TypeScript patterns we should improve?

---

### 3. Database Design

- Review schema in `packages/server/migrations/001_initial_schema.sql`
- Validate foreign key relationships
- Assess index strategy (including new composite indexes)
- Check for normalization issues or data integrity problems

**Specific concerns:**

- Is the `generation_jobs` → `job_pages` 1:many design correct?
- Are the new composite indexes on optimal columns?
- Should we add indexes for other queries?
- Is the claim/unclaim mechanism atomic and safe?

**Questions to answer:**

- Will this schema scale to 100k+ pages per job?
- Are there missing indexes for common queries?
- Should we use STRICT tables in SQLite for type safety?

---

### 4. Security

- Review authentication implementation (Bearer token)
- Assess helmet configuration and security headers
- Check for SQL injection vulnerabilities
- Verify CORS policy is appropriate
- Review request validation and sanitization

**Files to review:**

- `packages/server/src/middleware/auth.ts` - Auth middleware
- `packages/server/src/middleware/cors.ts` - CORS policy
- `packages/server/src/index.ts` - Helmet configuration
- `packages/server/src/routes/*.ts` - Input validation

**Questions to answer:**

- Is Bearer token authentication sufficient for V1?
- Should we add rate limiting?
- Are we vulnerable to injection attacks?
- Is the 1mb request size limit appropriate?

---

### 5. Testing Strategy

- Review Jest configuration across all packages
- Assess test coverage (57 tests, varying coverage %)
- Check for missing critical test cases
- Evaluate test quality and maintainability

**Current state:**

- Shared: 100% coverage (excellent)
- Worker: 100% coverage but mocked Ollama (needs integration tests)
- Server: 37.73% coverage (only auth middleware tested)

**Questions to answer:**

- Should we aim for higher server coverage?
- Do we need integration tests for the full workflow?
- Are the existing tests meaningful or just coverage-chasing?
- What critical scenarios are untested?

---

### 6. Performance

- Review quick wins implementation (composite indexes, batch inserts)
- Assess database query patterns
- Check for N+1 queries or inefficient data fetching
- Evaluate worker concurrency model

**Recent optimizations:**

- Composite indexes: `idx_job_pages_claimable`, `idx_generation_jobs_business`
- Batch insert: Using `db.transaction()` for bulk page creation
- Expected 10x speedup for large jobs (2000+ pages)

**Questions to answer:**

- Are there other query bottlenecks to address?
- Is the worker polling interval (5s default) optimal?
- Should we add query result caching?
- Will SQLite handle concurrent reads/writes at scale?

---

### 7. Error Handling & Resilience

- Review error handling in routes and middleware
- Assess worker retry logic for failed jobs
- Check database transaction handling
- Verify graceful shutdown procedures

**Files to review:**

- `packages/server/src/middleware/error-handler.ts`
- `packages/worker/src/worker.ts` - Job claiming/processing
- `packages/server/src/routes/jobs.ts` - Job creation logic

**Questions to answer:**

- What happens if Ollama crashes mid-generation?
- How do we handle partial job completion?
- Are failed pages retried automatically?
- Is the 3-attempt limit appropriate?

---

### 8. Documentation Quality

- Assess completeness of docs in `docs/` directory
- Check if README files are accurate and helpful
- Verify API documentation matches implementation
- Review decision records (ADRs) in `docs/decisions/`

**Questions to answer:**

- Are there undocumented features or behaviors?
- Is the environment variables doc comprehensive?
- Should we add diagrams for architecture/workflow?
- Are code comments sufficient for complex logic?

---

### 9. Deployment Readiness

- Review systemd service files (`systemd/*.service`)
- Assess environment variable management
- Check for hardcoded values or secrets
- Evaluate monitoring and observability

**Questions to answer:**

- Is the EC2 deployment strategy sound?
- Should we add health check endpoints?
- Do we need structured logging for production?
- Should we add metrics/monitoring (Prometheus, CloudWatch)?

---

### 10. Next Steps Validation

**Proposed next steps:**

#### Option A: GitHub Project Board (15-30 min)

- Create project with Backlog/Ready/In Progress/Done columns
- Add remaining recommendations as issues
- Priority labels (P0/P1/P2)

#### Option B: Ollama Integration Sprint (Phase 2 critical path)

- Implement content generation worker loop
- Test with real LLM calls
- End-to-end job workflow testing
- Error handling for LLM failures

#### Option C: Continue Quick Wins

- Implement more LLM review recommendations
- Additional performance optimizations
- More security hardening

**Please evaluate:**

- Which option should be prioritized?
- Are there critical blockers we're missing?
- What are the highest-risk areas to address first?
- Should we tackle testing before Ollama integration?

---

## Specific Code Review Requests

### 1. Batch Insert Implementation

**File:** `packages/server/src/routes/jobs.ts` (lines ~165-195)

```typescript
const insertStmt = db.prepare(
  `INSERT INTO job_pages (id, job_id, business_id, keyword_slug, service_area_slug, url_path, status, worker_id, attempts, claimed_at, completed_at, content, error_message, section_count, model_name, prompt_version, generation_duration_ms, word_count, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

const batchInsert = db.transaction((pages) => {
  for (const page of pages) {
    insertStmt.run(
      page.id,
      page.job_id,
      page.business_id,
      page.keyword_slug,
      page.service_area_slug,
      page.url_path,
      page.status,
      null,
      0,
      null,
      null,
      null,
      null,
      3,
      null,
      null,
      null,
      null,
      page.created_at
    );
  }
});

batchInsert(jobPages);
```

**Questions:**

- Is this the correct way to use better-sqlite3 transactions?
- Should we use `.run()` or `.get()` to capture insert results?
- Are we handling transaction failures correctly?
- Is the parameter ordering fragile (19 parameters)?

---

### 2. Job Claiming Logic

**File:** `packages/server/src/routes/job-pages.ts` (claim endpoint)

Please review the atomic claim mechanism:

- Does the SQL `UPDATE ... WHERE ... RETURNING *` ensure atomicity?
- Can two workers claim the same page simultaneously?
- Is the 5-minute claim timeout appropriate?
- Should we add a worker heartbeat mechanism?

---

### 3. Unicode Slug Generation

**File:** `packages/shared/src/utils/index.ts` (toSlug function)

```typescript
export function toSlug(text: string): string {
  return text
    .normalize("NFD") // Decompose combined characters
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

**Questions:**

- Does NFD normalization handle all Unicode edge cases?
- Are there characters that should be preserved?
- Should we transliterate (ß → ss, æ → ae)?
- Is this SEO-optimal for international markets?

---

### 4. Error Handler Middleware

**File:** `packages/server/src/middleware/error-handler.ts`

Please review:

- Is the HttpError class structure appropriate?
- Are we leaking sensitive info in error responses?
- Should we log errors to a service (e.g., Sentry)?
- Is the error format consistent with REST best practices?

---

## Risk Assessment

Please identify and prioritize risks:

### Technical Risks

- Database: Will SQLite scale? Locking issues?
- Worker: Single point of failure? Crash recovery?
- Performance: Query bottlenecks? Memory usage?
- Security: Auth vulnerabilities? Input validation gaps?

### Operational Risks

- Deployment: EC2 setup complexity? Downtime during updates?
- Monitoring: How do we detect failures? Alerting strategy?
- Data loss: Backup strategy? Transaction durability?
- Cost: LLM usage costs? EC2 instance sizing?

### Product Risks

- Content quality: How do we ensure LLM output is good?
- User experience: What happens when jobs fail?
- Data integrity: Can users corrupt the database?
- Scalability: What's the breaking point?

---

## Recommendations Format

Please structure your response as:

### Critical Issues (P0 - Must fix before production)

- Issue description
- Impact/risk
- Recommended solution
- Estimated effort

### Important Improvements (P1 - Should fix soon)

- Issue description
- Impact/risk
- Recommended solution
- Estimated effort

### Nice-to-Haves (P2 - Consider for V2)

- Issue description
- Impact/risk
- Recommended solution
- Estimated effort

### Questions for Team

- Open questions that need human decision
- Tradeoffs to consider
- Areas needing more context

### Next Steps Recommendation

- Prioritized action plan
- Which option (A/B/C) to pursue
- Rationale for recommendation
- Timeline estimate

---

## Context for LLM Reviewer

**What we're optimizing for:**

- V1 goal: Ship working MVP to one beta customer (Nash Smashed)
- Timeline: 2-4 weeks to production
- Scale: Start with 10-50 businesses, 100-500 pages each
- Quality: Production-ready but not perfect (iterate based on feedback)

**What we're NOT doing in V1:**

- Cloud LLM fallback (Ollama only)
- Multi-tenancy/user accounts (single API token)
- Advanced monitoring (basic health checks only)
- Distributed deployment (single EC2 instance)

**Known limitations:**

- Dashboard build fails (webpack config missing) - not blocking server/worker
- Worker tests use mocked Ollama (need integration tests)
- Server coverage is low (37.73%) - focused on critical paths
- No CI/CD pipeline yet (manual deployment)

**Owner context:**

- Solo developer (Jorge Giraldez)
- Experienced with TypeScript/Node.js/React
- New to Ollama and local LLM deployment
- Prefers pragmatic solutions over perfect architecture

---

## Output Format

Please provide:

1. **Executive Summary** (3-5 sentences)

   - Overall assessment of code quality
   - Biggest risks/concerns
   - Recommended next priority

2. **Detailed Findings** (organized by priority)

   - Critical issues with specific file/line references
   - Code examples of problems and solutions
   - Architecture recommendations

3. **Testing Gaps**

   - Critical untested scenarios
   - Recommended test cases to add
   - Coverage targets by package

4. **Performance Analysis**

   - Query performance concerns
   - Memory usage estimates
   - Concurrency issues

5. **Security Audit**

   - Vulnerabilities found
   - Security best practices to add
   - Auth/CORS improvements

6. **Next Steps Decision**
   - Clear recommendation: A, B, or C
   - Rationale and timeline
   - Dependencies/blockers
   - Success criteria

---

## How to Use This Prompt

1. **Copy this entire document**
2. **Paste into Claude/ChatGPT** with these additions:
   - Attach GitHub repository URL: https://github.com/dmv7zero3/marketbrewer-seo-platform
   - OR: Provide full codebase context via Claude Projects or GitHub integration
3. **Wait for comprehensive review** (may take 2-3 minutes)
4. **Ask follow-up questions** to clarify recommendations
5. **Prioritize actions** based on P0/P1/P2 labels

---

## Expected Review Time

- **LLM processing:** 2-5 minutes
- **Human review of recommendations:** 15-30 minutes
- **Implementation planning:** 30-60 minutes

---

## Success Criteria

A successful review will:

- ✅ Identify critical bugs or vulnerabilities
- ✅ Validate or challenge architectural decisions
- ✅ Provide actionable, specific recommendations
- ✅ Prioritize fixes by impact and effort
- ✅ Answer open questions in docs/QUESTIONS.md
- ✅ Give clear next-step recommendation (A/B/C)
- ✅ Include code examples for complex issues

---

**Ready to paste into your LLM of choice!**
