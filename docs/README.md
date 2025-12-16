# MarketBrewer SEO Platform — Documentation

Local SEO content generation platform for producing thousands of location-targeted landing pages.

---

## Quick Links

| Document                           | Purpose                |
| ---------------------------------- | ---------------------- |
| [STRUCTURE.md](./STRUCTURE.md)     | File and folder layout |
| [CONVENTIONS.md](./CONVENTIONS.md) | Code style and naming  |
| [PLANS.md](./PLANS.md)             | Concise build plan     |
| [QUESTIONS.md](./QUESTIONS.md)     | Running questions log  |

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
| [reference/EC2-GPU.md](./reference/EC2-GPU.md) | Optional GPU workers |
| [reference/CICD.md](./reference/CICD.md)       | CI/CD workflows      |

### Decisions

Architecture Decision Records (ADRs) in `decisions/`:

- [001-monorepo.md](./decisions/001-monorepo.md)
- [002-sqlite-v1.md](./decisions/002-sqlite-v1.md)
- [003-ollama-only.md](./decisions/003-ollama-only.md)
- [004-ec2-first.md](./decisions/004-ec2-first.md)

---

## V1 Scope

**Included:**

- Page types: `service-location`, `keyword-location`
- LLM: Ollama only (local)
- Workers: 2+ laptops via Tailscale
- Database: SQLite
- Output: JSON for Webpack

**Deferred to Phase 2:**

- AWS Lambda/DynamoDB/SQS
- Cloud LLM fallback (Claude, OpenAI)
- Multi-language translation pipeline
- `near-me` and `blog-location` page types

---

## Launch Clients

| Client              | Pages  | Status |
| ------------------- | ------ | ------ |
| Nash & Smashed      | ~625   | V1     |
| Street Lawyer Magic | ~2,925 | V1     |
| MarketBrewer        | ~200   | V1     |

---

## Contact

Jorge Giraldez, CEO  
j@marketbrewer.com | 703-463-6323
