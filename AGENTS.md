# MarketBrewer Dashboard — AGENTS

Project-level guidance for Codex agents working in this repo.

## Scope
- Applies only to `/Users/george/MatrizInc/MarketBrewer/Clients/marketbrewer/marketbrewer-dashboard`.
- Source of truth is `docs/` + `package.json`. If instructions conflict, ask before proceeding.

## Read First
- `docs/README.md` for overview and where to look next.
- `docs/STRUCTURE.md` for the authoritative package layout.
- `docs/CONVENTIONS.md` for coding standards.
- `docs/ENVIRONMENT.md` for env vars and defaults.
- `docs/api/AUTH.md` for auth behavior.
- `docs/QUESTIONS.md` for open decisions before implementing.

## Quick Commands (from repo root)
- Install: `npm install`
- Local infra: `docker compose -f docker-compose.local.yml up -d`
- Bootstrap local AWS emulators: `npm run local:bootstrap`
- One-command dev: `npm run dev:local`
- Stop local dev: `npm run dev:local:down`
- Local dev without Docker: `npm run dev:local:aws`
- Typecheck: `npm run typecheck`
- Lint (dashboard only): `npm run lint`
- Lint all packages: `npm run lint:all`
- Tests (CI style): `npm run test:ci`
- Tests (by package): `npm run test:shared`, `npm run test:lambda`
- Build all: `npm run build` or `npm run build:all`
- Production build: `npm run build:prod`
- Full local verification: `npm run verify:all`

## Architecture Notes
- Dashboard: React + TypeScript + Tailwind + Webpack.
- Packages: `packages/dashboard`, `packages/client-portal`, `packages/lambda-api`,
  `packages/lambda-worker`, `packages/shared`.
- Serverless stack: API Gateway + Lambda + DynamoDB single-table + SQS worker.
- Bilingual support is required (EN/ES with shared slugs).

## Coding Rules (high priority)
- TypeScript strict: no `any`, explicit return types.
- Single source of truth for config/behavior.
- All data-fetching `useEffect` calls must use `AbortController`.
- Follow file naming conventions in `docs/CONVENTIONS.md`.

## Prompts & Templates
- Template variables use `{{variable_name}}` (see `docs/reference/PROMPTS.md`).
- Required vars include: `business_name`, `city`, `state`, `phone`.

## Tests & CI Expectations
- CI runs typecheck, lint, tests, and builds.
- Coverage is collected from `shared`, `lambda-api`, and `lambda-worker`.
- Keep tests and docs updated when behavior changes.

## Environment & Secrets
- Use `.env.example` as the template.
- Node: engines `>=20`, Volta `20.19.6`.
- Auth: API token or Google ID token (see `docs/api/AUTH.md`).
- Never commit real tokens or credentials.

## When You Change Behavior
- Update relevant docs under `docs/`.
- Mention any env var additions in `docs/ENVIRONMENT.md`.

## Deployment
- Serverless deploy: `scripts/deploy-serverless.sh` (see `docs/SERVERLESS-DEPLOYMENT.md`).
- Static sites: `scripts/deploy-static-sites.sh` using `infrastructure/static-sites.yaml`.
- EC2-based deployment is deprecated.
