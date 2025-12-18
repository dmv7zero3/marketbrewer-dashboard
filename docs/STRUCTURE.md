# File & Folder Structure

This document is the single source of truth for project layout.

---

## Root Layout

```
marketbrewer-seo-platform/
├── .github/
│   └── copilot-instructions.md   # LLM instructions (compact)
├── docs/                          # All documentation
├── packages/                      # npm workspaces
│   ├── dashboard/                 # React frontend
│   ├── server/                    # Express API
│   ├── worker/                    # Job processor
│   └── shared/                    # Shared types/utils
├── output/                        # Generated JSON (gitignored)
│   └── {business_id}/
│       ├── manifest.json
│       └── pages/
├── data/                          # SQLite DB (gitignored)
│   └── seo-platform.db
├── scripts/                       # CLI utilities
├── config/                        # Prompt templates, seeds
├── package.json                   # Workspace root
├── tsconfig.json                  # Root TypeScript config
└── README.md                      # Project overview
```

---

## packages/dashboard/

React 18 dashboard with Webpack 5.

```
dashboard/
├── src/
│   ├── components/
│   │   ├── ui/                   # Reusable UI (Button, Card, Input)
│   │   └── dashboard/            # Page-specific components
│   ├── contexts/                 # React Context providers
│   ├── lib/                      # Utilities, API client
│   ├── styles/
│   │   └── globals.css           # Tailwind imports
│   ├── types/                    # Frontend-specific types
│   ├── App.tsx                   # Root component
│   └── index.tsx                 # Entry point
├── public/
│   └── index.html
├── webpack/
│   ├── webpack.common.ts
│   ├── webpack.dev.ts
│   └── webpack.prod.ts
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── postcss.config.js
```

---

## packages/server/

Express API with SQLite.

```
server/
├── src/
│   ├── routes/                   # Route handlers
│   │   ├── businesses.ts
│   │   ├── keywords.ts
│   │   ├── service-areas.ts
│   │   ├── prompts.ts
│   │   ├── jobs.ts
│   │   ├── job-pages.ts
│   │   └── workers.ts
│   ├── db/
│   │   ├── connection.ts         # SQLite setup
│   │   ├── schema.sql            # Table definitions
│   │   └── queries/              # SQL query functions
│   ├── services/                 # Business logic
│   ├── middleware/
│   │   ├── auth.ts               # Bearer token validation
│   │   ├── cors.ts               # CORS configuration
│   │   └── error-handler.ts
│   └── index.ts                  # Server entry point
├── migrations/                   # SQL migrations
├── package.json
└── tsconfig.json
```

---

## packages/worker/

Job processor for content generation.

```
worker/
├── src/
│   ├── index.ts                  # Entry point
│   ├── worker.ts                 # Main worker class
│   ├── ollama-client.ts          # Ollama API wrapper
│   ├── api-client.ts             # Server API client
│   └── utils/
│       └── logger.ts
├── package.json
└── tsconfig.json
```

---

## packages/shared/

Shared TypeScript types and utilities.

```
shared/
├── src/
│   ├── types/
│   │   ├── business.ts
│   │   ├── job.ts
│   │   ├── prompt.ts
│   │   └── api.ts
 │   ├── schemas/                 # Zod schemas mirroring types
│   ├── utils/
│   │   ├── logger.ts
│   │   └── validation.ts
│   └── index.ts                  # Barrel exports
├── package.json
└── tsconfig.json
```

---

## docs/

All documentation.

```
docs/
├── README.md                     # Documentation index
├── STRUCTURE.md                  # This file
├── CONVENTIONS.md                # Code style
├── QUESTIONS.md                  # Running questions
├── architecture/
│   ├── OVERVIEW.md               # System design
│   ├── DATABASE.md               # SQLite schema
│   └── WORKER-QUEUE.md           # Queue strategy
├── api/
│   ├── ENDPOINTS.md              # REST API reference
│   ├── CORS.md                   # CORS policy
│   └── AUTH.md                   # Authentication
├── reference/
│   ├── PROMPTS.md                # Prompt templates
│   ├── METRICS.md                # Logging
│   ├── EC2-GPU.md                # GPU workers
│   └── CICD.md                   # CI/CD
└── decisions/                    # ADRs
    ├── 001-monorepo.md
    └── ...
```

---

## config/

Configuration files (templates, seeds).

```
config/
├── prompts/
│   ├── location-keyword-v1.json  # Store cities × keywords
│   └── service-area-v1.json      # Nearby cities × keywords
└── seeds/
    ├── nash-smashed.json
    ├── street-lawyer.json
    └── marketbrewer.json
```

---

## scripts/

CLI utilities.

```
scripts/
├── seed-db.ts                    # Seed database
├── export-json.ts                # Export to JSON
├── migrate.ts                    # Run SQL migrations
├── ec2-setup.sh                  # EC2 provisioning steps
└── auto-shutdown.sh              # Nightly stop to control cost
└── deploy-local.sh               # Local deployment
```

---

## Key Rules

1. **One purpose per folder** — Don't mix concerns
2. **Flat when possible** — Avoid deep nesting
3. **Barrel exports** — Use `index.ts` for public API
4. **Docs live in docs/** — Not scattered in code folders
