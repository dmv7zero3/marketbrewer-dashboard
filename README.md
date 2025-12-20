# MarketBrewer SEO Platform

Local-first SEO content generation platform for producing thousands of location-targeted landing pages.

---

## Quick Start

```bash
# Install dependencies
npm install

# Start dashboard (localhost:3000)
npm run dev:dashboard

# Start API server (localhost:3001)
npm run dev:server

# Start worker
npm run dev:worker

# Run smoke tests (requires server running)
./scripts/smoke-tests.sh local
```

---

## Structure

```
packages/
├── dashboard/    # React 18 + Webpack 5 + Tailwind
├── server/       # Express + SQLite (14 migrations)
├── worker/       # Ollama job processor with template substitution
└── shared/       # Shared TypeScript types
```

See [docs/STRUCTURE.md](./docs/STRUCTURE.md) for full layout.

---

## Documentation

All documentation lives in `docs/`:

| Document                                     | Purpose             |
| -------------------------------------------- | ------------------- |
| [docs/README.md](./docs/README.md)           | Documentation index |
| [docs/STRUCTURE.md](./docs/STRUCTURE.md)     | File layout         |
| [docs/CONVENTIONS.md](./docs/CONVENTIONS.md) | Code style          |
| [docs/api/ENDPOINTS.md](./docs/api/ENDPOINTS.md) | REST API reference |

---

## Tech Stack

| Component | Technology                                |
| --------- | ----------------------------------------- |
| Frontend  | React 18, TypeScript, Tailwind, Webpack 5 |
| Backend   | Express, TypeScript, SQLite               |
| LLM       | Ollama (local)                            |
| Build     | npm workspaces                            |

---

## Current Status (Dec 20, 2024)

**✅ Working:**

- ✅ API Server (Express + SQLite on :3001)
- ✅ Dashboard (React 18, all management UIs)
- ✅ Worker (Ollama + template-based content generation)
- ✅ Bilingual support (EN/ES with shared slugs)
- ✅ Prompt template system with 25+ variables
- ✅ Integration tests passing (37/37 locations, 6/6 smoke tests)

**Test Data:**

- Business: Nash & Smashed (26 locations, 50+ bilingual keywords)
- Business: Street Lawyer Magic (17 bilingual services)

## V1 Scope

**Included:**

- Page types: `location-keyword`, `service-area`
- Ollama only (no cloud LLM)
- Bilingual support (EN/ES)
- SQLite database with 14 migrations
- JSON output for Webpack

**Deferred to Phase 2:**

- AWS Lambda/DynamoDB/SQS
- Cloud LLM fallback
- Additional languages

---

## Launch Clients

| Client              | Locations | Keywords | Status      |
| ------------------- | --------- | -------- | ----------- |
| Nash & Smashed      | 26        | 50+      | ✅ Ready    |
| Street Lawyer Magic | TBD       | 17       | ✅ Seeded   |
| MarketBrewer        | TBD       | TBD      | Pending     |

---

## Contact

Jorge Giraldez, CEO
j@marketbrewer.com | 703-463-6323
