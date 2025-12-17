# Changelog

## v0.1.0-dev (2025-12-17)

- Dev start stability: zero-error `npm run start` by aligning CORS origin and ports (`3002` dashboard, `3001` API) and setting matching dev tokens
- Dashboard build: switched to JS webpack configs; fixed TS import path issues; excluded `webpack` folder from TypeScript includes
- UI & tooling: Tailwind/PostCSS setup; added `Navbar`, `Footer`, `JobsList` pages and `index.tsx`
- API client envs: `REACT_APP_API_URL` and `REACT_APP_API_TOKEN` wired via `DefinePlugin`
- Worker: `OllamaClient` constructor accepts optional args; end-to-end flow validated
- Scripts: `scripts/reconcile-contract.ts` to diff/apply keywords (and report locations) per contract
- Repo hygiene: added `.gitignore` to exclude macOS files, build outputs, and local SQLite db artifacts
