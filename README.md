# MarketBrewer SEO Platform

Local-first SEO content generation platform.

## Structure

```
packages/
├── dashboard/    # React 18 + Webpack 5 + Tailwind
├── server/       # Express API + SQLite
├── worker/       # Job processor (Ollama)
└── shared/       # Shared TypeScript types
```

## Quick Start

```bash
# Install dependencies
npm install

# Run dashboard
npm run dev:dashboard

# Run server (when ready)
npm run dev:server

# Run worker (when ready)
npm run dev:worker
```

## Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Webpack 5
- **Backend:** Express, SQLite
- **LLM:** Ollama (local only in V1)
