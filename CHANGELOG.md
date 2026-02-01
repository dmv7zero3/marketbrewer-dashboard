# Changelog

## v1.0.0 (2025-12-20)

- Serverless: API Gateway + Lambda + DynamoDB + SQS with immutable cost ledger
- Dashboard: Roadmap + AWS infrastructure tabs, Google Workspace login gate
- Auth: CORS allowlist enforcement, rate limiting, structured API logging
- Deploy: S3 + CloudFront for admin UI, serverless deployment script updates
- Tests: Lambda/shared coverage and production smoke checks

## v0.1.0-dev (2025-12-17)

- Dev start stability: zero-error `npm run start` by aligning CORS origin and ports (`3002` dashboard, `3001` API) and setting matching dev tokens
- Dashboard build: switched to JS webpack configs; fixed TS import path issues; excluded `webpack` folder from TypeScript includes
- UI & tooling: Tailwind/PostCSS setup; added `Navbar`, `Footer`, `JobsList` pages and `index.tsx`
- API client envs: `REACT_APP_API_URL` and `REACT_APP_API_TOKEN` wired via `DefinePlugin`
- Repo hygiene: added `.gitignore` to exclude macOS files, build outputs
