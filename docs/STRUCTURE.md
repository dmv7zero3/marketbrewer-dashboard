# File & Folder Structure

Single source of truth for MarketBrewer Dashboard layout.

---

## Root Layout

```
marketbrewer-dashboard/
├── docs/                          # Documentation
├── infrastructure/                # Serverless templates
├── packages/                      # npm workspaces
│   ├── dashboard/                 # React frontend
│   ├── client-portal/             # Client-facing portal
│   ├── lambda-api/                # API Gateway Lambda
│   ├── lambda-worker/             # SQS worker Lambda
│   └── shared/                    # Shared types/utils
├── config/                        # Prompt templates, seeds
├── scripts/                       # Deployment + tooling
├── package.json                   # Workspace root
├── tsconfig.json                  # Root TypeScript config
└── README.md                      # Project overview
```

---

## packages/dashboard/

React dashboard with Webpack + Tailwind.

```
dashboard/
├── src/
│   ├── components/
│   ├── contexts/
│   ├── lib/
│   ├── styles/
│   └── index.tsx
├── public/
└── webpack/
```

---

## packages/client-portal/

Client-facing portal with Webpack + Tailwind.

```
client-portal/
├── src/
│   ├── components/
│   ├── pages/
│   ├── styles/
│   └── index.tsx
├── public/
└── webpack/
```

---

## packages/lambda-api/

API Gateway Lambda (TypeScript).

```
lambda-api/
├── src/
│   └── index.ts                  # API routes + auth + DynamoDB access
└── package.json
```

---

## packages/lambda-worker/

SQS worker Lambda (TypeScript).

```
lambda-worker/
├── src/
│   └── index.ts                  # SQS handler + Claude API + cost ledger
└── package.json
```

---

## packages/shared/

Shared types and schemas.

```
shared/
├── src/
│   ├── types/
│   ├── schemas/
│   └── index.ts
```

---

## docs/

```
docs/
├── README.md                     # Documentation index
├── STRUCTURE.md                  # This file
├── ENVIRONMENT.md                # Env vars
├── architecture/
├── api/
└── decisions/
```
