# Phase 2 Pre-Implementation Review

**Date:** December 16, 2024  
**Status:** Phase 1 Complete, Ready for Phase 2  
**Reviewer:** Next LLM Agent

---

## Context

The MarketBrewer SEO Platform Phase 1 implementation is complete. All foundation code has been written, dependencies installed, and pushed to GitHub. Before proceeding to Phase 2 (Ollama integration + remaining features), we need a thorough review.

---

## What to Review

### 1. **Code Architecture Review**

#### Server Package (`packages/server/`)

- [ ] Review [src/routes/businesses.ts](../packages/server/src/routes/businesses.ts) - Are the business CRUD operations correct?
- [ ] Review [src/routes/jobs.ts](../packages/server/src/routes/jobs.ts) - Does job creation logic properly generate pages?
- [ ] Review [src/routes/job-pages.ts](../packages/server/src/routes/job-pages.ts) - Is the atomic claim operation truly atomic with SQLite?
- [ ] Review [src/db/connection.ts](../packages/server/src/db/connection.ts) - Is the database connection pattern safe?
- [ ] Review [src/middleware/auth.ts](../packages/server/src/middleware/auth.ts) - Is Bearer token auth sufficient for V1?

**Questions:**

- Should we add transaction support for complex operations?
- Are there any SQL injection vulnerabilities?
- Do we need connection pooling for SQLite?

#### Worker Package (`packages/worker/`)

- [ ] Review [src/worker.ts](../packages/worker/src/worker.ts) - Is the processing loop robust?
- [ ] Review placeholder generation at lines 127-160 - What's needed for real Ollama integration?
- [ ] Review error handling - Will failed pages properly retry?

**Questions:**

- How should we handle Ollama timeouts (e.g., 60+ second generations)?
- Should the worker support multiple concurrent pages?
- Is the backoff strategy sufficient?

#### Shared Package (`packages/shared/`)

- [ ] Review [src/types/](../packages/shared/src/types/) - Are all DB fields represented?
- [ ] Review [src/schemas/](../packages/shared/src/schemas/) - Are Zod validations strict enough?
- [ ] Review [src/utils/index.ts](../packages/shared/src/utils/index.ts) - Is `calculateCompletenessScore()` logic correct?

**Questions:**

- Are there missing types for Phase 2 features?
- Should we add more utility functions before Phase 2?

#### Dashboard Package (`packages/dashboard/`)

- [ ] Review [src/pages/JobCreate.tsx](../packages/dashboard/src/pages/JobCreate.tsx) - UX improvements needed?
- [ ] Review [src/pages/JobStatus.tsx](../packages/dashboard/src/pages/JobStatus.tsx) - Is polling interval optimal?
- [ ] Review [src/api/](../packages/dashboard/src/api/) - API client error handling sufficient?

**Questions:**

- Should we add error boundaries?
- Do we need loading states for API calls?

---

### 2. **Database Schema Review**

- [ ] Review [packages/server/migrations/001_initial_schema.sql](../packages/server/migrations/001_initial_schema.sql)
- [ ] Verify foreign key constraints are correct
- [ ] Check if indexes are missing for common queries
- [ ] Validate that the schema matches [docs/architecture/DATABASE.md](./architecture/DATABASE.md)

**Questions:**

- Do we need indexes on `job_pages.status` and `job_pages.business_id`?
- Should `prompt_templates.template` be TEXT or larger?
- Are there missing fields for Phase 2?

---

### 3. **Missing Implementation Check**

#### Critical for Phase 2:

1. **Ollama Integration** - [packages/worker/src/worker.ts:127](../packages/worker/src/worker.ts)

   ```typescript
   // TODO: Implement actual Ollama generation
   // For now, return placeholder content
   ```

   - What library should we use? (axios, fetch, ollama-js?)
   - What's the API endpoint format?
   - How do we handle streaming vs. non-streaming?

2. **Prompt Template Engine**

   - No variable substitution logic exists yet
   - Need to fetch template from DB
   - Need to inject business data, keywords, service areas

3. **Missing API Endpoints** (from [docs/PLANS.md](./PLANS.md) Phase 2 P1):

   - `/api/businesses/:id/keywords` - GET, POST, PUT, DELETE
   - `/api/businesses/:id/service-areas` - GET, POST, PUT, DELETE
   - `/api/businesses/:id/prompts` - GET, POST, PUT, DELETE

4. **Dashboard Pages Missing** (Phase 2 P1):
   - Business list/detail pages
   - Keyword management UI
   - Service area management UI
   - Prompt editor with preview

---

### 4. **Configuration & Environment Review**

- [ ] Review `.env.example` files - Are all required vars documented?
- [ ] Check if Ollama URL/model is configurable
- [ ] Verify API_TOKEN is used consistently

**Missing Environment Variables:**

```bash
# packages/worker/.env.example needs:
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b-instruct
OLLAMA_TIMEOUT_MS=120000
```

---

### 5. **Error Scenarios to Test**

Before Phase 2, validate these scenarios work:

- [ ] **Server starts without database** - Should create DB automatically
- [ ] **Worker claims page when none available** - Returns 409 gracefully
- [ ] **Invalid auth token** - Returns 401 with clear message
- [ ] **CORS from dashboard** - Allowed origins work
- [ ] **Job with 0 service areas** - Fails with clear error
- [ ] **Questionnaire < 40% complete** - Blocks job creation

---

### 6. **Code Quality Issues**

Look for:

- [ ] Unused imports
- [ ] Console.log statements (should use proper logging)
- [ ] Magic numbers (should be constants)
- [ ] Inconsistent error messages
- [ ] Missing JSDoc comments on complex functions
- [ ] TypeScript `any` types (should be avoided)

---

### 7. **Security Concerns**

- [ ] Is Bearer token sufficient or should we add JWT?
- [ ] Are there SQL injection risks in dynamic queries?
- [ ] Should we rate-limit API endpoints?
- [ ] Is CORS configuration secure enough?
- [ ] Do we sanitize user input (business names, prompts)?

---

### 8. **Performance Considerations**

- [ ] Will SQLite handle 5,000+ pages per job?
- [ ] Should we batch insert job pages?
- [ ] Is the worker polling interval (5s) too aggressive?
- [ ] Do we need caching for prompt templates?
- [ ] Should `getJobStatus` query be optimized?

---

## Specific Code Sections to Review

### Priority 1: Critical Path to Phase 2

1. **Worker Generation Logic** ([packages/worker/src/worker.ts:117-160](../packages/worker/src/worker.ts))

   ```typescript
   private async generateContent(page: JobPage): Promise<GeneratedContent> {
     // TODO: Implement actual Ollama generation
   ```

   **Review:** This is placeholder code. What's the best approach for Ollama integration?

2. **Job Creation Logic** ([packages/server/src/routes/jobs.ts:61-123](../packages/server/src/routes/jobs.ts))

   ```typescript
   // Generate job pages based on page type
   const jobId = generateId();
   // ...builds pages for keyword x location
   ```

   **Review:** Does this correctly generate all combinations? Are there edge cases?

3. **Atomic Claim Operation** ([packages/server/src/routes/job-pages.ts:26-73](../packages/server/src/routes/job-pages.ts))
   ```typescript
   const claimedPage = db.transaction(() => {
     const page = dbGet<JobPage>(/* find queued page */);
     dbRun(/* claim it */);
     return dbGet<JobPage>(/* return claimed page */);
   })();
   ```
   **Review:** Is this truly atomic? Can race conditions occur?

### Priority 2: Data Integrity

4. **Questionnaire Completeness Score** ([packages/shared/src/utils/index.ts:50-90](../packages/shared/src/utils/index.ts))

   ```typescript
   export function calculateCompletenessScore(data: Record<string, unknown>): number {
     const requiredFields = ['business_name', 'industry', 'phone', ...];
     // ... calculates score
   }
   ```

   **Review:** Are the required fields correct? Is 40% threshold appropriate?

5. **Slug Generation** ([packages/shared/src/utils/index.ts:9-17](../packages/shared/src/utils/index.ts))
   ```typescript
   export function toSlug(str: string): string {
     return str
       .toLowerCase()
       .trim()
       .replace(/[^\w\s-]/g, "")
       .replace(/[\s_-]+/g, "-")
       .replace(/^-+|-+$/g, "");
   }
   ```
   **Review:** Will this handle non-ASCII characters? Unicode edge cases?

---

## Questions for Discussion

### Architecture Decisions:

1. Should we add a `services/` layer between routes and database?
2. Do we need a proper logging framework (Winston, Pino)?
3. Should worker support multiple concurrent pages or stay single-threaded?
4. Is JSON storage for `questionnaires.data` optimal or should we use JSONB-like queries?

### Phase 2 Implementation Order:

1. Should we implement Ollama integration first, or build remaining CRUD APIs?
2. Do we need the prompt editor before Ollama works?
3. Should we test with mock Ollama responses first?

### Testing Strategy:

1. **YES - Add unit tests during Phase 2 implementation** (not before)
   - Write tests alongside feature development
   - Focus on utilities, schemas, business logic
   - Target 70%+ coverage for shared and worker packages
2. **Integration tests** - Add after core features work (E2E shell script)
3. **Mock Ollama** - Use axios mocks for unit tests, real Ollama for integration

---

## Unit Testing Plan

### Framework: Jest + TypeScript

**Setup** (packages/shared, packages/worker, packages/server):

```bash
npm install -D jest @types/jest ts-jest @types/node
npx ts-jest config:init
```

### What to Test (Priority Order)

#### 1. **Shared Package Utilities** (`packages/shared/src/utils/`)

- ✅ `toSlug()` - ASCII, Unicode, edge cases
- ✅ `toCityStateSlug()` - Various city names
- ✅ `generateId()` - UUID format validation
- ✅ `calculateCompletenessScore()` - All field combinations
- ✅ `generateUrlPath()` - With/without keyword

**Example test:**

```typescript
// packages/shared/src/utils/__tests__/slug.test.ts
import { toSlug, toCityStateSlug } from "../index";

describe("toSlug", () => {
  it("converts spaces to dashes", () => {
    expect(toSlug("Hello World")).toBe("hello-world");
  });

  it("handles Unicode characters", () => {
    expect(toSlug("San José")).toBe("san-jose");
  });

  it("removes special characters", () => {
    expect(toSlug("Hello@World!")).toBe("helloworld");
  });
});
```

#### 2. **Shared Package Schemas** (`packages/shared/src/schemas/`)

- ✅ `CreateBusinessSchema` - Valid/invalid inputs
- ✅ `CreateGenerationJobSchema` - Page type validation
- ✅ `ClaimPageSchema` - Worker ID validation
- ✅ `CompletePageSchema` - Status enum validation

#### 3. **Worker Ollama Client** (`packages/worker/src/ollama/`)

- ✅ Mock HTTP requests with `axios-mock-adapter`
- ✅ Test timeout handling
- ✅ Test error responses
- ✅ Test response parsing

#### 4. **Worker Prompt Builder** (`packages/worker/src/prompt/`)

- ✅ Variable substitution
- ✅ Missing variable handling
- ✅ Template parsing edge cases

#### 5. **Server Route Logic** (Optional for V1)

- Can defer route tests - covered by integration tests
- Focus on pure business logic if extracted to services

### Coverage Targets

- **Shared package:** 80%+ (utilities, schemas)
- **Worker package:** 70%+ (Ollama client, prompt builder)
- **Server package:** 50%+ (route handlers harder to unit test)

### Test Commands

Add to root `package.json`:

```json
"scripts": {
   "test": "npm test --workspaces --if-present",
   "test:shared": "npm test --workspace=packages/shared",
   "test:worker": "npm test --workspace=packages/worker",
   "test:coverage": "npm test --workspaces -- --coverage"
}
```

---

## Deliverables from This Review

Please provide:

1. **Critical Issues Found** - List of bugs/problems that must be fixed before Phase 2
2. **Recommendations** - Improvements to make now vs. defer to later
3. **Phase 2 Implementation Plan** - Suggested order of tasks with time estimates
4. **Unit Testing Plan** - What to test, coverage targets, testing framework setup
5. **Code Snippets** - Specific fixes for any issues found
6. **Questions to Owner** - Anything requiring Jorge's input/decision

---

## How to Conduct Review

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm install

# 3. Build shared package
npm run build --workspace=packages/shared

# 4. Check for TypeScript errors
npm run typecheck

# 5. Review each file mentioned above

# 6. Test server startup
npm run dev:server
# Verify: http://localhost:3001/health returns {"status":"ok"}

# 7. Review seed data
cat config/seeds/nash-smashed.json

# 8. Check database schema
cat packages/server/migrations/001_initial_schema.sql
```

---

## Success Criteria

After this review, we should have:

- ✅ Confidence that Phase 1 code is solid
- ✅ Clear understanding of what Phase 2 requires
- ✅ List of issues to fix before continuing
- ✅ Prioritized task list for Phase 2 implementation
- ✅ No critical bugs or architectural flaws

---

## Contact

**Project Owner:** Jorge Giraldez  
**Email:** j@marketbrewer.com  
**Phone:** 703-463-6323

**Repository:** https://github.com/dmv7zero3/marketbrewer-seo-platform  
**Branch:** main  
**Last Commit:** b0efca0 (fix: add explicit type to db connection export)
