# MarketBrewer Dashboard — Documentation

Repository: https://github.com/dmv7zero3/marketbrewer-dashboard

Admin dashboard for managing MarketBrewer client SEO, content generation jobs, and billing.

Direction moving forward:
- Stripe billing suite (subscriptions, invoices, usage add-ons, customer portal)
- Expanded job analytics and cost reporting
- Internal-only operations for MarketBrewer staff

---

## Quick Links

| Document                               | Purpose                |
| -------------------------------------- | ---------------------- |
| [STRUCTURE.md](./STRUCTURE.md)         | File and folder layout |
| [CONVENTIONS.md](./CONVENTIONS.md)     | Code style and naming  |
| [ENVIRONMENT.md](./ENVIRONMENT.md)     | Environment variables  |
| [DOMAINS.md](./DOMAINS.md)             | Subdomains and buckets |
| [SUBDOMAIN-GAMEPLAN.md](./SUBDOMAIN-GAMEPLAN.md) | Subdomain infrastructure plan |
| [SERVERLESS-DEPLOYMENT.md](./SERVERLESS-DEPLOYMENT.md) | Deploy guide |

### Architecture

| Document                                                       | Purpose            |
| -------------------------------------------------------------- | ------------------ |
| [architecture/OVERVIEW.md](./architecture/OVERVIEW.md)         | System design      |
| [architecture/DATABASE.md](./architecture/DATABASE.md)         | DynamoDB single-table |
| [architecture/WORKER-QUEUE.md](./architecture/WORKER-QUEUE.md) | SQS + Lambda worker |

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

- [005-serverless-platform.md](./decisions/005-serverless-platform.md)

### Changelog

- [CHANGELOG.md](../CHANGELOG.md) — Dashboard and serverless history

---

## Platform Scope

**Included:**

- API Gateway + Lambda + DynamoDB single-table
- SQS worker for page generation
- Claude API generation with immutable cost ledger
- Google Workspace login gate
- EN/ES keyword support

---

## Launch Client

| Client                   | Status   |
| ------------------------ | -------- |
| MarketBrewer (Admin Hub) | ✅ Active |

---

## Contact

Jorge Giraldez, CEO
j@marketbrewer.com | 703-463-6323
