# MarketBrewer SEO Platform v1.0.0-pre — Code Review Results

**Reviewer:** Claude (Anthropic)  
**Review Date:** December 17, 2024  
**Codebase Version:** v1.0.0-pre  
**Overall Assessment:** 7.5/10 for production readiness

---

## Executive Summary

The MarketBrewer SEO Platform is **conditionally ready for staging deployment**. The architecture is sound for a v1.0 local-first system, with well-structured TypeScript code, appropriate use of SQLite for the scale, and comprehensive documentation. However, there are several **security concerns that should be addressed before production deployment**, primarily around authentication, rate limiting, and input validation gaps.

**Biggest Risks:**

1. **No rate limiting** — API is vulnerable to DoS and abuse
2. **Simple token authentication** — Single shared token, no user-level auth
3. **Server test coverage at 37%** — Critical paths untested
4. **Worker has no automated integration tests** with real Ollama

**Recommendation:** ⚠️ **DEPLOY TO STAGING WITH CAUTION** — Address critical security issues before production.

---

## 1. Critical Issues (MUST Fix Before Production)

### 🔴 1.1 No Rate Limiting

**Location:** `packages/server/src/index.ts`

**Issue:** The API has no rate limiting whatsoever. A malicious actor could overwhelm the server with requests, or an accidental client bug could DoS the system.

**Impact:** HIGH — Production service availability at risk

**Fix:**

```typescript
// packages/server/src/index.ts
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: {
    error: "Too many requests",
    code: "RATE_LIMITED",
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply before routes
app.use("/api", limiter);
```

**Effort:** 30 minutes

---

### 🔴 1.2 Missing Input Validation on Several Routes

**Location:** `packages/server/src/routes/prompts.ts` (lines 57-73)

**Issue:** The `POST /businesses/:id/prompts` endpoint does manual validation with incomplete checks. The `template` field could contain malicious content that gets passed to Ollama.

**Current Code:**

```typescript
if (
  !page_type ||
  !["service-location", "keyword-location"].includes(page_type)
) {
  throw new HttpError(400, "Invalid page_type...", "VALIDATION_ERROR");
}
// Missing: template validation, word_count_target bounds check
```

**Fix:** Use Zod schema (already exists in shared package):

```typescript
import { z } from "zod";

const CreatePromptSchema = z.object({
  page_type: z.enum(["service-location", "keyword-location"]),
  version: z.number().int().positive().default(1),
  template: z.string().min(10).max(50000), // Reasonable bounds
  required_variables: z.array(z.string()).optional(),
  optional_variables: z.array(z.string()).optional(),
  word_count_target: z.number().int().min(100).max(10000).default(400),
  is_active: z.boolean().optional(),
});

router.post("/:id/prompts", async (req, res, next) => {
  try {
    const data = CreatePromptSchema.parse(req.body);
    // ... rest of handler
  } catch (error) {
    next(error); // ZodError handled by error middleware
  }
});
```

**Effort:** 1 hour

---

### 🔴 1.3 Health Endpoint Bypasses Auth but Returns Sensitive Info

**Location:** `packages/server/src/middleware/auth.ts` and `packages/server/src/index.ts`

**Issue:** The `/health` endpoint skips authentication but could be enhanced to return internal state information in future versions, creating an info-leak vector.

**Current Behavior:**

```typescript
if (req.path === "/health" || req.path === "/api/health") {
  return next(); // No auth required
}
```

**Recommendation:** Keep health check public but ensure it only returns minimal info:

```typescript
// Good - minimal health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// If you need detailed health info, protect it:
app.get("/api/health/detailed", authMiddleware, (req, res) => {
  res.json({
    status: "ok",
    database: checkDatabase(),
    ollama: checkOllama(),
    uptime: process.uptime(),
  });
});
```

**Effort:** 15 minutes

---

## 2. High-Priority Issues (SHOULD Fix Before Production)

### 🟠 2.1 Potential SQL Injection via URL Path Parameters

**Location:** `packages/server/src/routes/service-areas.ts` (line 49)

**Issue:** While parameterized queries are used correctly, the `city` and `state` fields from user input are used to generate a slug that becomes part of the URL path without sanitization.

**Risk:** If `toSlug()` doesn't handle all edge cases, malformed city names could cause issues.

**Current `toSlug()` implementation looks safe:**

```typescript
export function toSlug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

**Verdict:** The slug function is well-implemented. No action needed, but **add a test case for empty strings and very long inputs**.

---

### 🟠 2.2 Worker Polling Could Be Optimized

**Location:** `packages/worker/src/worker.ts`

**Issue:** The worker polls every 5 seconds regardless of load. When the queue is empty, this creates unnecessary API calls.

**Current Code:**

```typescript
const DEFAULT_CONFIG: Partial<WorkerConfig> = {
  pollIntervalMs: 5000, // 5 seconds between polls
  // ...
};
```

**The backoff is partially implemented but could be improved:**

```typescript
async pollForWork(): Promise<void> {
  const page = await this.claimPage();

  if (!page) {
    // Exponential backoff when no work
    this.backoffMs = Math.min(this.backoffMs * 2, 30000);
    await sleep(this.backoffMs);
    return;
  }

  this.backoffMs = 1000; // Reset on success
  await this.processPage(page);
}
```

**Status:** This is documented in `WORKER-QUEUE.md` but the actual implementation in `worker.ts` should be verified to match.

**Effort:** 30 minutes to verify/fix

---

### 🟠 2.3 Server Test Coverage is Low (37%)

**Location:** `packages/server/__tests__/`

**Current State:**

- Only `auth.test.ts` has unit tests
- E2E tests exist but don't cover error paths thoroughly

**Critical Untested Paths:**

1. Job creation with 0 service areas (should fail gracefully)
2. Concurrent page claiming (race condition testing)
3. Database connection failures
4. Ollama timeout handling in worker

**Recommendation:** Add integration tests for:

```typescript
describe("Job Creation Edge Cases", () => {
  it("rejects job creation with no service areas", async () => {
    // Create business with no service areas
    // Attempt to create job
    // Expect 422 INSUFFICIENT_DATA
  });

  it("handles concurrent claim attempts correctly", async () => {
    // Create job with 1 page
    // Simultaneously claim from 2 workers
    // Verify only 1 succeeds, other gets 409
  });
});
```

**Effort:** 4-6 hours

---

### 🟠 2.4 CORS Configuration Too Permissive for Production

**Location:** `packages/server/src/middleware/cors.ts`

**Issue:** The CORS config allows requests with no origin (for mobile apps, curl), which is appropriate for development but risky in production.

**Current Code:**

```typescript
origin: (origin, callback) => {
  // Allow requests with no origin (e.g., mobile apps, curl)
  if (!origin) {
    return callback(null, true);
  }
  // ...
};
```

**For Production:**

```typescript
origin: (origin, callback) => {
  if (process.env.NODE_ENV === "development" && !origin) {
    return callback(null, true);
  }
  // In production, require origin
  if (!origin) {
    return callback(new Error("Origin required"), false);
  }
  // ...
};
```

**Effort:** 15 minutes

---

## 3. Medium-Priority Issues (Can Fix Post-Deploy)

### 🟡 3.1 Magic Numbers in Code

**Location:** Various files

**Examples:**

```typescript
// packages/server/src/index.ts
app.use(express.json({ limit: "1mb" })); // Why 1mb?

// packages/worker/src/worker.ts
pollIntervalMs: 5000, // Why 5 seconds?
maxAttempts: 3,       // Why 3?
```

**Fix:** Move to constants file:

```typescript
// packages/shared/src/constants.ts
export const API_LIMITS = {
  REQUEST_BODY_SIZE: "1mb",
  POLL_INTERVAL_MS: 5000,
  MAX_JOB_ATTEMPTS: 3,
  CLAIM_TIMEOUT_MINUTES: 5,
} as const;
```

**Effort:** 1 hour

---

### 🟡 3.2 Error Messages Could Leak Information

**Location:** `packages/server/src/middleware/error-handler.ts`

**Current Code:**

```typescript
res.status(500).json({
  error:
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message, // ⚠️ Leaks stack trace in non-prod
  code: "INTERNAL_ERROR",
});
```

**Issue:** In staging/development, full error messages are exposed. This is fine for debugging but should be carefully managed.

**Recommendation:** Add structured logging instead:

```typescript
import { logger } from "../utils/logger";

res.status(500).json({
  error: "Internal server error",
  code: "INTERNAL_ERROR",
  requestId: req.id, // Add request ID for tracing
});

// Log full error server-side
logger.error("Internal error", {
  requestId: req.id,
  error: err.message,
  stack: err.stack,
  path: req.path,
});
```

**Effort:** 2 hours (requires adding request ID middleware)

---

### 🟡 3.3 No Database Connection Pooling

**Location:** `packages/server/src/db/connection.ts`

**Current:** Single database connection:

```typescript
const db: Database.Database = new Database(dbPath);
```

**For SQLite with better-sqlite3, this is actually fine** because:

1. better-sqlite3 uses synchronous operations (no connection pool needed)
2. WAL mode is enabled for concurrent reads
3. Single-writer is appropriate for SQLite

**Verdict:** No change needed for v1.0. Document this as a v2.0 consideration when migrating to PostgreSQL.

---

### 🟡 3.4 TypeScript `any` Types Found

**Location:** `packages/dashboard/src/components/ui/Footer.tsx`

```typescript
const apiUrl =
  (process.env as any).REACT_APP_API_URL || "http://localhost:3001";
```

**Fix:**

```typescript
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      REACT_APP_API_URL?: string;
      REACT_APP_API_TOKEN?: string;
      NODE_ENV: "development" | "production" | "test";
    }
  }
}

// Then use directly:
const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";
```

**Effort:** 30 minutes

---

## 4. Architecture Assessment

### ✅ Strengths

1. **Clean Package Boundaries**

   - `shared/` contains only types, schemas, and utilities
   - `server/` handles API logic with clear route separation
   - `worker/` is standalone and communicates via API only
   - `dashboard/` is a pure frontend with no business logic

2. **SQLite Choice is Appropriate**

   - Single-file database works well for <10k concurrent users
   - WAL mode enables concurrent reads during writes
   - `UPDATE...RETURNING` atomic claim prevents race conditions
   - Clear migration path to PostgreSQL documented

3. **Job Queue Design is Sound**

   - Atomic page claiming via `UPDATE...RETURNING`
   - Retry mechanism with attempt tracking
   - Stale page recovery via 5-minute timeout
   - Worker heartbeat mechanism exists (though not fully implemented)

4. **Comprehensive Documentation**
   - ADRs explain architectural decisions
   - API endpoints fully documented
   - Deployment runbook is thorough
   - Operations guide covers day-2 scenarios

### ⚠️ Areas for Improvement

1. **No Service Layer**

   - Routes contain business logic directly
   - Makes unit testing harder
   - Consider extracting to `services/` for v2.0

2. **Synchronous Database Operations**

   - `better-sqlite3` is synchronous by design
   - This is fine for SQLite but will need refactoring for PostgreSQL

3. **Single Worker Concurrency**
   - Current design processes one page at a time
   - Appropriate for CPU-bound Ollama, but document this limitation

---

## 5. Security Assessment

| Area             | Status        | Notes                            |
| ---------------- | ------------- | -------------------------------- |
| SQL Injection    | ✅ SAFE       | Parameterized queries throughout |
| XSS              | ✅ SAFE       | React handles escaping           |
| CSRF             | ⚠️ N/A        | Token-based auth, no cookies     |
| Authentication   | 🟡 BASIC      | Single shared token              |
| Authorization    | 🔴 MISSING    | No per-user permissions          |
| Rate Limiting    | 🔴 MISSING    | Must add before production       |
| Input Validation | 🟡 PARTIAL    | Zod used but not everywhere      |
| CORS             | 🟡 PERMISSIVE | Tighten for production           |
| Headers          | ✅ GOOD       | Helmet configured                |

### Security Recommendations

1. **Before Production:**

   - Add rate limiting (express-rate-limit)
   - Tighten CORS for production origins only
   - Add request ID tracking for audit trail

2. **For v2.0:**
   - Implement JWT authentication
   - Add per-user API keys
   - Implement role-based access control
   - Add request signing for worker communication

---

## 6. Performance Assessment

### Current Performance Targets (from `performance-baseline.json`)

| Metric            | Target | Assessment                 |
| ----------------- | ------ | -------------------------- |
| API Response Time | <500ms | ✅ Achievable with indexes |
| Page Generation   | 15-30s | ✅ Reasonable for llama3.2 |
| DB Query Time     | <200ms | ✅ With current indexes    |
| Memory Usage      | 2-3GB  | ⚠️ Monitor Ollama memory   |

### Query Optimization Review

**Indexes are well-designed:**

```sql
CREATE INDEX idx_job_pages_claimable ON job_pages(job_id, status, attempts);
CREATE INDEX idx_generation_jobs_business ON generation_jobs(business_id, status);
```

**Potential N+1 Query:**

```typescript
// In jobs.ts - when creating job pages
for (const keyword of keywords) {
  for (const area of serviceAreas) {
    // Individual insert per page
  }
}
```

**This is already fixed** with batch insert using `db.transaction()`. Good implementation.

### Memory Considerations

- Ollama llama3.2 uses ~4GB memory
- Node.js server/worker should stay under 500MB each
- Total EC2 t3.large (8GB) should be sufficient

---

## 7. DevOps Assessment

### ✅ CloudFormation Template

The CloudFormation template is **production-ready** with:

- IAM role with least-privilege (EC2 self-management only)
- Security group with appropriate port restrictions
- UserData script for automated setup
- Auto-stop feature for cost savings
- Proper tagging

### ⚠️ CI/CD Pipeline

The GitHub Actions workflow is comprehensive but:

- `smoke-tests` job has `continue-on-error: true` — consider making this a blocking failure
- No deployment step to staging/production (manual deployment via CloudFormation)

### ✅ systemd Services

The service files are properly hardened:

```ini
Restart=always
RestartSec=10
StartLimitInterval=60
StartLimitBurst=3
```

---

## 8. Specific Questions Answered

### Architecture

**Q1: Is SQLite appropriate for v1.0?**
✅ YES — For single-instance deployment with <10k pages, SQLite with WAL mode is excellent. The atomic claim pattern works well.

**Q2: Is the job queue pattern (in-database) robust enough?**
✅ YES for v1.0 — The `UPDATE...RETURNING` atomic claim is sound. For v2.0 with multiple workers across instances, consider Redis or SQS.

**Q3: Are there race conditions in worker job claiming?**
✅ NO — The atomic UPDATE query prevents double-claiming. Only one worker can claim a page.

### Security

**Q4: SQL injection vulnerabilities?**
✅ NONE FOUND — All queries use parameterized statements.

**Q5: Is CORS too permissive?**
🟡 YES for production — Tighten no-origin handling.

**Q6: Are API tokens handled securely?**
🟡 ACCEPTABLE for v1.0 — Token is in env vars, not committed. For v2.0, implement JWT.

**Q7: Should we add rate limiting?**
🔴 YES — Must add before production.

### Performance

**Q8: N+1 query problems?**
✅ NONE — Batch inserts are used for job pages.

**Q9: Is Ollama integration efficient?**
🟡 ACCEPTABLE — Single request per page is fine. Streaming could improve UX but not required for v1.0.

**Q10: Memory leaks in worker?**
⚠️ UNKNOWN — Worker tests are mocked. Add integration test to verify memory doesn't grow over time.

### DevOps

**Q11: Is CloudFormation template production-ready?**
✅ YES — Well-structured with IAM, security groups, and auto-stop.

**Q12: Are systemd services configured for restarts?**
✅ YES — `Restart=always` with proper limits.

**Q13: Is monitoring comprehensive?**
✅ YES — CloudWatch agent config, alarms, and dashboard are all configured.

**Q14: Are deployment docs safe?**
✅ YES — Clear steps, rollback procedure documented.

### Code Quality

**Q15: TypeScript `any` types?**
🟡 A FEW — One in Footer.tsx, easily fixable.

**Q16: Are error messages helpful?**
✅ YES — Structured error format with codes.

**Q17: Magic numbers?**
🟡 SOME — Should be moved to constants file.

**Q18: Code duplication?**
✅ MINIMAL — Shared package is used well.

---

## 9. Recommended Action Plan

### Pre-Staging Deployment (2-3 hours)

| Priority | Task                                 | Effort | Status |
| -------- | ------------------------------------ | ------ | ------ |
| P0       | Add rate limiting                    | 30 min | 🔜     |
| P0       | Fix CORS for production              | 15 min | 🔜     |
| P1       | Add Zod validation to prompts route  | 1 hour | 🔜     |
| P1       | Verify worker backoff implementation | 30 min | 🔜     |

### Pre-Production Deployment (1-2 days)

| Priority | Task                                          | Effort  | Status |
| -------- | --------------------------------------------- | ------- | ------ |
| P0       | Add integration tests for concurrent claiming | 2 hours | 🔜     |
| P0       | Add integration tests for edge cases          | 2 hours | 🔜     |
| P1       | Extract magic numbers to constants            | 1 hour  | 🔜     |
| P1       | Fix TypeScript `any` types                    | 30 min  | 🔜     |
| P1       | Add request ID tracking                       | 2 hours | 🔜     |

### Post-Production (v1.1+)

| Priority | Task                                   | Effort  | Status |
| -------- | -------------------------------------- | ------- | ------ |
| P1       | Implement JWT authentication           | 1 day   | 🔜     |
| P1       | Add user-level permissions             | 1 day   | 🔜     |
| P2       | Add structured logging with log levels | 4 hours | 🔜     |
| P2       | Implement Ollama health monitoring     | 2 hours | 🔜     |
| P2       | Add dashboard component tests          | 1 day   | 🔜     |

---

## 10. Final Verdict

### 🟡 CONDITIONAL GO FOR STAGING

**Deploy to staging** after addressing:

1. ✅ Add rate limiting (30 min)
2. ✅ Tighten CORS configuration (15 min)
3. ✅ Verify worker backoff matches documentation (30 min)

**Deploy to production** after:

1. All staging items plus
2. Integration tests for concurrent operations
3. 24-48 hours of staging monitoring without issues
4. Load test with expected production traffic

---

## Summary

This is a **well-architected v1.0 system** with clear strengths in documentation, architecture, and code organization. The critical issues are all **fixable within 2-3 hours**, making staging deployment feasible in the short term. Production deployment should wait until:

1. Rate limiting is implemented
2. CORS is tightened for production
3. Integration tests cover concurrent operations
4. Staging environment runs stably for 24-48 hours

The team has made excellent architectural decisions (SQLite, Ollama CPU, monorepo structure) that balance simplicity with scalability for v1.0.

**Overall Grade: B+ (7.5/10)**

Strong foundation with addressable security gaps. Recommended for staging deployment after P0 fixes.
