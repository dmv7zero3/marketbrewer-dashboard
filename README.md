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
```

---

## Structure

```
packages/
├── dashboard/    # React 18 + Webpack 5 + Tailwind
├── server/       # Express + SQLite
├── worker/       # Ollama job processor
└── shared/       # Shared TypeScript types
```

See [docs/STRUCTURE.md](./docs/STRUCTURE.md) for full layout.

---

## Documentation

All documentation lives in `docs/`:

| Document | Purpose |
|----------|---------|
| [docs/README.md](./docs/README.md) | Documentation index |
| [docs/STRUCTURE.md](./docs/STRUCTURE.md) | File layout |
| [docs/CONVENTIONS.md](./docs/CONVENTIONS.md) | Code style |
| [docs/QUESTIONS.md](./docs/QUESTIONS.md) | Running questions |

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18, TypeScript, Tailwind, Webpack 5 |
| Backend | Express, TypeScript, SQLite |
| LLM | Ollama (local) |
| Build | npm workspaces |

---

## V1 Scope

**Included:**
- Page types: `service-location`, `keyword-location`
- Ollama only (no cloud LLM)
- 2+ laptop workers via Tailscale
- SQLite database
- JSON output for Webpack

**Deferred to Phase 2:**
- AWS Lambda/DynamoDB/SQS
- Cloud LLM fallback
- Multi-language support

---

## Launch Clients

| Client | Pages |
|--------|-------|
| Nash & Smashed | ~625 |
| Street Lawyer Magic | ~2,925 |
| MarketBrewer | ~200 |

---

## Contact

Jorge Giraldez, CEO  
j@marketbrewer.com | 703-463-6323
