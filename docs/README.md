# MarketBrewer SEO Platform — Documentation

Local SEO content generation platform for producing thousands of location-targeted landing pages.

---

## Quick Links

| Document                               | Purpose                |
| -------------------------------------- | ---------------------- |
| [STRUCTURE.md](./STRUCTURE.md)         | File and folder layout |
| [CONVENTIONS.md](./CONVENTIONS.md)     | Code style and naming  |
| [BILINGUAL-SUPPORT.md](./BILINGUAL-SUPPORT.md) | EN/ES keyword handling |

### Architecture

| Document                                                       | Purpose            |
| -------------------------------------------------------------- | ------------------ |
| [architecture/OVERVIEW.md](./architecture/OVERVIEW.md)         | System design      |
| [architecture/DATABASE.md](./architecture/DATABASE.md)         | SQLite schema      |
| [architecture/WORKER-QUEUE.md](./architecture/WORKER-QUEUE.md) | Job queue strategy |

### API

| Document                               | Purpose            |
| -------------------------------------- | ------------------ |
| [api/ENDPOINTS.md](./api/ENDPOINTS.md) | REST API reference |
| [api/CORS.md](./api/CORS.md)           | CORS configuration |
| [api/AUTH.md](./api/AUTH.md)           | Authentication     |

### Reference

| Document                                       | Purpose              |
| ---------------------------------------------- | -------------------- |
| [reference/PROMPTS.md](./reference/PROMPTS.md) | Prompt templates     |
| [reference/METRICS.md](./reference/METRICS.md) | Logging and metrics  |

### Decisions

Architecture Decision Records (ADRs) in `decisions/`:

- [001-monorepo.md](./decisions/001-monorepo.md)
- [002-sqlite-v1.md](./decisions/002-sqlite-v1.md)
- [003-ollama-only.md](./decisions/003-ollama-only.md)
- [004-ec2-first.md](./decisions/004-ec2-first.md)

### Changelog

- [CHANGES-2025-12-20.md](./CHANGES-2025-12-20.md) — Schema + API reliability fixes

---

## V1 Scope

**Included:**

- Page types: `location-keyword` (store cities × keywords), `service-area` (nearby cities × keywords)
- LLM: Ollama only (local)
- Bilingual: EN/ES with shared slugs
- Database: SQLite (14 migrations)
- Output: JSON for Webpack

**Deferred to Phase 2:**

- AWS Lambda/DynamoDB/SQS
- Cloud LLM fallback (Claude, OpenAI)
- Additional languages beyond EN/ES

---

## Launch Clients

| Client              | Status      |
| ------------------- | ----------- |
| Nash & Smashed      | ✅ Ready    |
| Street Lawyer Magic | ✅ Seeded   |
| MarketBrewer        | Pending     |

---

## Contact

Jorge Giraldez, CEO
j@marketbrewer.com | 703-463-6323
