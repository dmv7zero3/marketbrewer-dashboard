# Running Questions

Track open questions and decisions throughout development.

---

## Open

| ID    | Date       | Question                                                     | Context                     | Assigned |
| ----- | ---------- | ------------------------------------------------------------ | --------------------------- | -------- |
| Q-007 | 2025-12-16 | How many workers needed for 1,300 pages in acceptable time?  | Performance planning        | —        |
| Q-008 | 2025-12-16 | Should we generate coming-soon location pages differently?   | 15 coming-soon vs 13 active | Jorge    |
| Q-009 | 2025-12-16 | Spanish content for MarketBrewer - same model or different? | Multi-language              | —        |
| Q-010 | 2025-12-16 | What's acceptable generation time per page?                  | Currently ~30-60s on CPU    | —        |
| Q-011 | 2025-12-16 | Should prompt templates be per-business or global?           | Currently hardcoded         | —        |

---

## Resolved

| ID    | Date       | Question                                                      | Resolution                                 | Decided By |
| ----- | ---------- | ------------------------------------------------------------- | ------------------------------------------ | ---------- |
| Q-001 | 2025-12-16 | Flat structure vs monorepo?                                   | Monorepo with `packages/`                  | Jorge      |
| Q-002 | 2025-12-20 | Storage for V1?                                               | DynamoDB single-table (no GSIs)            | Jorge      |
| Q-003 | 2025-12-20 | LLM provider for production?                                  | Claude API (token-based)                   | Jorge      |
| Q-004 | 2025-12-20 | Compute model?                                                | API Gateway + Lambda (no EC2)              | Jorge      |
| Q-005 | 2025-12-16 | What's the minimum questionnaire completeness for generation? | 40% (will validate after testing)          | Jorge      |
| Q-006 | 2025-12-16 | Batch insert parameter ordering fragile?                      | Fixed with named parameters (@id, @job_id) | P0 Fix     |

---

## How to Use

### Adding a Question

1. Add to **Open** table with next ID
2. Include date, question, context
3. Assign if there's a clear owner

### Resolving a Question

1. Move from **Open** to **Resolved**
2. Add resolution and who decided
3. Update relevant docs if needed

### Question Categories

- **Architecture** — System design decisions
- **Implementation** — How to build something
- **Business** — Client requirements, priorities
- **Scope** — What's in/out of V1
