# ADR 002: SQLite for V1

**Status:** Accepted  
**Date:** 2025-12-16  
**Decided by:** Jorge Giraldez

---

## Context

V1 is local-first, running on Jorge's laptops. Need a database for:
- Business profiles
- Keywords and service areas
- Job queue
- Worker state

Options: SQLite, DynamoDB, PostgreSQL, in-memory.

---

## Decision

Use **SQLite** for V1.

Single file at `./data/seo-platform.db`.

---

## Rationale

### Why SQLite

1. **Zero dependencies** — No server to run
2. **Works offline** — Important for local-first
3. **Battle-tested** — Extremely reliable
4. **Fast for this scale** — Thousands of rows, not millions
5. **Easy backup** — Just copy the file
6. **Atomic operations** — `UPDATE...RETURNING` for job queue

### Why Not DynamoDB (V1)

1. Adds cloud dependency
2. Requires internet
3. Cost (even if minimal)
4. Overkill for local development
5. More complex to debug locally

### Migration Path

Schema is designed for easy DynamoDB migration:

| SQLite Table | DynamoDB PK | DynamoDB SK |
|--------------|-------------|-------------|
| businesses | `BUS#{id}` | `PROFILE` |
| keywords | `BUS#{business_id}` | `KW#{slug}` |
| generation_jobs | `JOB#{id}` | `STATUS#{status}` |

---

## Consequences

### Positive

- Fast iteration during V1 development
- No AWS costs
- Works on plane, coffee shop, anywhere
- Simple debugging with SQLite CLI

### Negative

- Can't scale to multiple API servers
- Need to migrate for Phase 2
- No built-in replication

### Mitigations

- Design schema to map cleanly to DynamoDB
- Keep database layer abstracted
- Document migration plan

---

## Phase 2 Trigger

Migrate to DynamoDB when:
- Multiple API servers needed
- Remote workers without VPN access
- Production deployment to AWS

---

## Alternatives Considered

1. **DynamoDB from start** — Rejected (overkill for V1)
2. **PostgreSQL** — Rejected (requires server)
3. **In-memory** — Rejected (data loss on restart)
4. **LevelDB** — Rejected (less familiar, fewer tools)
