# MarketBrewer Dashboard

Internal admin dashboard for MarketBrewer LLC to manage client local SEO, generation jobs, and billing.

GitHub: https://github.com/dmv7zero3/marketbrewer-dashboard

---

## Quick Start (Dashboard)

```bash
# Install dependencies
npm install

# Start local infra (DynamoDB Local + LocalStack SQS)
docker compose -f docker-compose.local.yml up -d

# Bootstrap local table + queue
export DDB_ENDPOINT=http://localhost:8000
export SQS_ENDPOINT=http://localhost:4566
npm run local:bootstrap

# Configure API env (local server)
export API_TOKEN=your-secure-token
export CORS_ALLOW_ORIGINS=http://localhost:3002
# Optional local endpoints
# export DDB_ENDPOINT=http://localhost:8000
# export SQS_ENDPOINT=http://localhost:4566

# Start local API (localhost:3001)
npm run dev:server

# Start local worker (relays SQS -> Lambda worker)
npm run dev:worker

# Seed initial clients
npm run seed:clients

# Configure dashboard env
cp packages/dashboard/.env.example packages/dashboard/.env
# Set REACT_APP_API_URL + REACT_APP_API_TOKEN + Google auth vars in packages/dashboard/.env

# Start dashboard (localhost:3002)
npm run dev:dashboard
```

## One-Command Local Dev

```bash
npm run dev:local
```

This spins up DynamoDB Local + LocalStack, bootstraps the table/queue, seeds the clients,
and starts API/worker/dashboard. Logs are written to `output/local-dev`.

To stop everything:

```bash
npm run dev:local:down
```

## No-Docker Local Dev (Use AWS)

If you do not want to run Docker locally, point the API/worker at AWS:

```bash
export AWS_REGION=us-east-1
export PROJECT_PREFIX=marketbrewer
export API_TOKEN=local-dev-token
# Ensure your AWS credentials are configured (AWS_PROFILE or env keys)
npm run dev:local:aws
```

## Quick Start (Client Portal)

```bash
# Configure client portal env
cp packages/client-portal/.env.example packages/client-portal/.env
# Set REACT_APP_API_URL + REACT_APP_API_TOKEN in packages/client-portal/.env

# Start client portal (localhost:3003)
npm run dev:client-portal
```

For serverless deployment (API Gateway + Lambda + DynamoDB), see:
`docs/SERVERLESS-DEPLOYMENT.md`

---

## Google Workspace Login

The dashboard can enforce Google Workspace login. Configure both API + dashboard env vars:

```bash
# Lambda API env
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
GOOGLE_ALLOWED_EMAILS=j@marketbrewer.com

# Dashboard env
REACT_APP_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
REACT_APP_GOOGLE_ALLOWED_EMAILS=j@marketbrewer.com
```

Current IAM OAuth client (gcloud):
`a455cf980-6701-4910-a8b2-52915f160806`

Configured redirect URIs:
- `https://admin.marketbrewer.com`
- `http://localhost:3002`

---

## Structure

```
packages/
├── dashboard/      # React + Webpack + Tailwind
├── lambda-api/     # API Gateway Lambda (TypeScript)
├── lambda-worker/  # SQS Worker Lambda (Claude API)
└── shared/         # Shared types + schemas
```

---

## Tech Stack

| Component | Technology                                      |
| --------- | ----------------------------------------------- |
| Frontend  | React, TypeScript, Tailwind, Webpack            |
| API       | API Gateway + Lambda (TypeScript)               |
| Data      | DynamoDB single-table (no GSIs)                 |
| Queue     | SQS                                              |
| LLM       | Claude API                                      |
| Auth      | API token + Google Identity Services            |
| Hosting   | S3 + CloudFront (`admin.marketbrewer.com`)      |
| Payments  | Stripe Billing (subscriptions, invoices, portal) |

---

## Status

- ✅ Serverless API + worker
- ✅ Dashboard with Google Workspace login
- ✅ DynamoDB single-table + immutable cost ledger
- ✅ EN/ES keyword support

---

## Documentation

All documentation lives in `docs/`:

- `docs/README.md` (index)
- `docs/ENVIRONMENT.md`
- `docs/SERVERLESS-DEPLOYMENT.md`
- `docs/api/ENDPOINTS.md`
- `docs/architecture/OVERVIEW.md`

---

## Contact

Jorge Giraldez, CEO  
j@marketbrewer.com | 703-463-6323
