# Architecture Overview

MarketBrewer Dashboard is a serverless platform built to manage client SEO and generation jobs without EC2 costs.

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          ADMIN DASHBOARD                             │
│                React + TypeScript + Google Login                     │
│                  admin.marketbrewer.com (CloudFront)                 │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼ HTTPS (+Bearer)
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT PORTAL                               │
│                   React + TypeScript (Client UI)                     │
│                 portal.marketbrewer.com (CloudFront)                 │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼ HTTPS (+Bearer)
┌─────────────────────────────────────────────────────────────────────┐
│                       API GATEWAY (HTTP API)                         │
│                      https://api.marketbrewer.com                    │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         LAMBDA API (TypeScript)                      │
│              Business, questionnaire, jobs, prompts, etc.            │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 DYNAMODB SINGLE TABLE (no GSIs)                      │
│            Businesses, jobs, pages, costs, profile data              │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SQS QUEUE (page-generation)                     │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      LAMBDA WORKER (TypeScript)                      │
│            Claude API generation + immutable cost ledger             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Components

### Dashboard (`packages/dashboard/`)
React SPA for managing MarketBrewer clients, jobs, and prompts. Uses Google Identity Services for internal-only access.

### Client Portal (`packages/client-portal/`)
Client-facing portal for billing, SEO status, and account management.

### Lambda API (`packages/lambda-api/`)
TypeScript API for all CRUD operations, job creation, preview, and pagination. Auth accepts either:
- API token (server-to-server)
- Google ID token (dashboard)

### DynamoDB Single Table
All entities stored in one table with partition keys by business and job. No GSIs.

### SQS Queue
Each page generation task is enqueued and processed asynchronously by the Lambda worker.

### Lambda Worker (`packages/lambda-worker/`)
Consumes SQS messages, generates content via Claude API, updates job/page status, and records immutable cost entries.

### CloudFront + S3
Admin dashboard is hosted on S3 with a CloudFront distribution at `admin.marketbrewer.com`.
Client portal is hosted on S3 with a CloudFront distribution at `portal.marketbrewer.com`.
Shared assets are hosted on S3 with a CloudFront distribution at `assets.marketbrewer.com`.

---

## Data Flow

### 1. Job Creation

```
Dashboard → POST /api/businesses/:id/generate → Lambda API
                                            │
                                            ▼
                           Create job + pages in DynamoDB
                                            │
                                            ▼
                                      Enqueue SQS tasks
```

### 2. Job Processing

```
SQS → Lambda Worker → Claude API → DynamoDB
  └── updates page content + job counts
  └── writes immutable cost item per run
```

### 3. Dashboard Monitoring

```
Dashboard → GET /api/jobs/:jobId/pages
Dashboard → GET /api/businesses/:id/jobs
```

---

## Security Model

| Layer              | Mechanism                                   |
| ------------------ | ------------------------------------------- |
| API Authentication | Bearer token or Google ID token             |
| Dashboard Access   | Allowed Google Workspace emails only        |
| Storage            | Private S3 bucket with CloudFront OAC        |
| DynamoDB           | IAM-scoped Lambda access only               |

---

## Cost Guardrails

- No EC2 usage
- Pay-per-request DynamoDB
- SQS-based async processing
- Immutable cost ledger stored in DynamoDB (never deleted)
