# MarketBrewer SEO Platform — Copilot Instructions

**Project:** Local SEO content generation platform  
**Owner:** Jorge Giraldez, MarketBrewer LLC  
**Version:** 1.0 (Local-First)

---

## Quick Reference

| Component | Location | Tech |
|-----------|----------|------|
| Dashboard | `packages/dashboard/` | React 18 + TypeScript + Tailwind + Webpack 5 |
| API Server | `packages/server/` | Express + TypeScript + SQLite |
| Worker | `packages/worker/` | TypeScript + Ollama |
| Shared Types | `packages/shared/` | TypeScript |

---

## Documentation Index

All detailed documentation lives in `docs/`. Read the relevant file before starting work.

| Topic | File |
|-------|------|
| Project overview | `docs/README.md` |
| File structure | `docs/STRUCTURE.md` |
| Code conventions | `docs/CONVENTIONS.md` |
| Architecture | `docs/architecture/OVERVIEW.md` |
| API endpoints | `docs/api/ENDPOINTS.md` |
| CORS policy | `docs/api/CORS.md` |
| Database schema | `docs/architecture/DATABASE.md` |
| Worker queue | `docs/architecture/WORKER-QUEUE.md` |
| Running questions | `docs/QUESTIONS.md` |

---

## Core Rules

1. **Read docs first** — Check `docs/` before implementing
2. **TypeScript strict** — No `any`, explicit return types
3. **Single source of truth** — One place for each config/behavior
4. **SQLite for V1** — No DynamoDB in V1
5. **Ollama only** — No cloud LLM fallback in V1

---

## File Naming

| Type | Convention | Example |
|------|------------|---------|
| Utilities | `kebab-case.ts` | `api-client.ts` |
| React components | `PascalCase.tsx` | `BusinessProfile.tsx` |
| Types | `kebab-case.ts` | `business.ts` |
| Docs | `SCREAMING-CASE.md` | `CONVENTIONS.md` |

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
