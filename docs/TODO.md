# Project TODO

Short, actionable tasks tracked before implementation.

## Now

- Update `OVERVIEW.md` to EC2-first (done)
- Add ADR 004: EC2-first decision (done)
- Create `PLANS.md` (done)
- Create `TODO.md` (this file)

## Next

- Verify per-package `tsconfig.json` exist and are strict
- Scaffold server, worker, and dashboard minimal files
- Add initial schema `migrations/001_initial_schema.sql` (apply once)
- Create `.env.example` in server/worker/dashboard
- Prepare EC2 ops scripts (auto-shutdown, CloudWatch alarms)

## Later

- Implement all API endpoints (see `ENDPOINTS.md`)
- Build dashboard pages
- Integrate worker claim/generate/complete
- Add migration runner only when schema changes are needed
