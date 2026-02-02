# Production Readiness Plan

Prioritized plan to take MarketBrewer Dashboard to production‑grade reliability.

## Phase 0 — Baseline (Today)
- [x] Fix dashboard test runner and add coverage for API/utilities
- [x] Add dashboard tests to `test:ci`
- [x] Ensure lint, typecheck, build pass locally

## Phase 1 — Observability & Safety (High impact)
1) **Add correlation IDs**
   - Propagate `x-request-id` from API to worker logs
   - Attach request ID to job events
2) **Metrics + alerts**
   - Queue depth + DLQ count alarms
   - API 5xx/latency alarms
3) **DLQ + retries**
   - Configure DLQ for job queue
   - Confirm retry policy + visibility timeout
4) **Restore validation**
   - Document and test DynamoDB PITR restore procedure

## Phase 2 — Security & Access (High impact)
1) **Secrets**
   - Move prod secrets to AWS SSM Parameter Store (cost‑conscious)
2) **Auth validation**
   - Verify Google token issuer + audience checks
   - Tighten allow‑list enforcement
3) **CORS**
   - Lock to production domains only
4) **Rate limiting**
   - API Gateway throttling + basic abuse protection (no WAF unless needed)
5) **Health endpoint**
   - Keep /health minimal or protected

## Phase 3 — Data Integrity (High impact)
1) **DynamoDB PITR**
2) **Schema enforcement**
   - Ensure every endpoint validates input/output
3) **Immutable ledger checks**
   - Add verification tests for cost ledger events
4) **Logging hygiene**
   - Redact PII in logs and audit trails

## Phase 4 — Testing & Coverage (High impact)
1) **Raise API/worker coverage**
   - Enforce minimums: 65% lines/statements, 45% branches, 55% functions
2) **E2E staging smoke tests**
   - Create job, worker processes, page returns
3) **Load tests**
   - Validate queue throughput and Lambda concurrency

## Phase 5 — Performance & UX (Medium)
1) **Bundle size**
   - Introduce route‑level code splitting
   - Lazy load heavy dashboard pages
2) **Dashboard resilience**
   - Consistent error and retry UX

## Phase 6 — Operations & Runbooks (Medium)
1) **Runbooks**
   - Deploy, rollback, DLQ handling, backlog recovery
2) **Cost monitoring**
   - Claude usage, Lambda, DynamoDB alarms
3) **Cost guardrails**
   - Avoid DynamoDB GSIs unless explicitly required

---

## Suggested First Tasks
1) Implement correlation IDs in API + worker logs
2) Configure DLQ + backlog alarms
3) Add integration tests for API/worker

Last updated: 2026-02-02
