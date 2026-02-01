# Production Readiness Checklist

Step-by-step checklist for hardening MarketBrewer Dashboard for production use.

## 1) Reliability & Resilience
- [ ] Define SLOs and error budgets (API availability, job completion time)
- [ ] Add idempotency for job creation + worker processing
- [x] Configure SQS DLQ and redrive policy
- [ ] Set worker retry limits and visibility timeout aligned to max job duration
- [ ] Add dashboard retry UX and clear failure states

## 2) Security & Access
- [x] Store secrets in AWS SSM Parameter Store (no prod .env)
- [ ] Enforce least-privilege IAM for Lambda/SQS/DynamoDB/CloudWatch
- [ ] Validate Google ID token issuer/audience + email allow-list
- [x] Restrict CORS to production domains only
- [ ] Add audit logging for admin actions (prompts, billing, deletions)
- [x] API Gateway throttling and basic abuse protection (cost‑conscious; no WAF unless needed)

## 3) Observability & Alerting
- [x] Structured logs with correlation IDs across API + worker
- [ ] Metrics: API latency, 5xx, worker throughput, queue depth, job failure %
- [x] Alerts: DLQ > 0, queue backlog, error rate spikes, auth failures
- [x] /health endpoint is minimal (no dependency details) or protected

## 4) Data Integrity & Backups
- [x] DynamoDB PITR enabled
- [x] Restore procedure documented and tested (table restore validation)
- [ ] Schema validation on all endpoints
- [ ] Immutable cost ledger verified (no missing events)
- [ ] Data retention policy for generated content + logs
- [x] Log/PII redaction guidance for audit logs and request payloads

## 5) CI/CD & Environments
- [ ] Staging environment with production‑like config
- [ ] CI gates: lint, typecheck, tests, build, coverage thresholds
- [ ] Pre‑deploy config validation (required env vars)
- [ ] Rollback strategy (Lambda versions/aliases, CFN rollback)

## 6) Performance & Scalability
- [ ] Lambda memory + timeout tuned (API + worker)
- [ ] Concurrency limits aligned to Claude API quotas
- [ ] Queue visibility timeout aligned to max job duration
- [x] Dashboard bundle size optimization (code splitting, lazy routes)

## 7) Testing
- [ ] Increase API/worker coverage to minimum threshold
- [ ] Integration tests for key flows (create job → worker → pages)
- [ ] E2E smoke tests against staging
- [ ] Load tests for worker throughput

## 8) Operations & Runbooks
- [ ] Runbooks: deployment, rollback, DLQ handling, backlog recovery
- [ ] Incident response + on‑call ownership
- [ ] Cost monitoring & alarms (Claude usage, Lambda, DynamoDB)

## Cost Guardrails
- [ ] Avoid DynamoDB GSIs unless explicitly required

---

Last updated: 2026-02-01
