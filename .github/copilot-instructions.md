# MarketBrewer SEO Platform — Copilot Instructions

**Project:** Local SEO content generation platform  
**Owner:** Jorge Giraldez, MarketBrewer LLC  
**Version:** 1.0 (Local-First)

---

## Quick Reference

| Component    | Location              | Tech                                         | Status      |
| ------------ | --------------------- | -------------------------------------------- | ----------- |
| Dashboard    | `packages/dashboard/` | React 18 + TypeScript + Tailwind + Webpack 5 | ⚠️ Partial  |
| API Server   | `packages/server/`    | Express + TypeScript + SQLite                | ✅ Working  |
| Worker       | `packages/worker/`    | TypeScript + Ollama                          | ✅ Working  |
| Shared Types | `packages/shared/`    | TypeScript                                   | ✅ Complete |

---

## Documentation Index

All detailed documentation lives in `docs/`. Read the relevant file before starting work.

| Topic             | File                                |
| ----------------- | ----------------------------------- |
| Project overview  | `docs/README.md`                    |
| File structure    | `docs/STRUCTURE.md`                 |
| Code conventions  | `docs/CONVENTIONS.md`               |
| Architecture      | `docs/architecture/OVERVIEW.md`     |
| API endpoints     | `docs/api/ENDPOINTS.md`             |
| CORS policy       | `docs/api/CORS.md`                  |
| Database schema   | `docs/architecture/DATABASE.md`     |
| Worker queue      | `docs/architecture/WORKER-QUEUE.md` |
| Running questions | `docs/QUESTIONS.md`                 |

---

## Current Status (Dec 16, 2024)

**✅ Completed:**

- Phase 1: Foundation (server, worker, dashboard scaffolds)
- Phase 2: Ollama Integration Sprint
- P0 Fixes: Named parameters, atomic claim, health checks
- Database: Seeded with 26 Nash & Smashed locations, 50 keywords
- End-to-end: Tested with real Ollama (llama3.2:latest)
- Generated content: 1 page successfully created

**📊 Test Data:**

- 26 service areas (VA, MD, DC, SC, NY)
- 50 keywords (best-fried-chicken, nashville-hot-chicken, etc.)
- 1,300 potential pages (50 × 26)

## Core Rules

1. **Read docs first** — Check `docs/` before implementing
2. **TypeScript strict** — No `any`, explicit return types
3. **Single source of truth** — One place for each config/behavior
4. **SQLite for V1** — No DynamoDB in V1
5. **Ollama only** — No cloud LLM fallback in V1

---

## File Naming

| Type             | Convention          | Example               |
| ---------------- | ------------------- | --------------------- |
| Utilities        | `kebab-case.ts`     | `api-client.ts`       |
| React components | `PascalCase.tsx`    | `BusinessProfile.tsx` |
| Types            | `kebab-case.ts`     | `business.ts`         |
| Docs             | `SCREAMING-CASE.md` | `CONVENTIONS.md`      |

---

## Before You Code

1. Check `docs/QUESTIONS.md` for open questions
2. Read the relevant `docs/` file for your task
3. Follow `docs/CONVENTIONS.md` for code style
4. Update docs if you change behavior

---

## Contact

Jorge Giraldez  
j@marketbrewer.com | 703-463-6323
