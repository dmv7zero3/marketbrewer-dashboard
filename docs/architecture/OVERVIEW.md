# Architecture Overview

High-level system design for MarketBrewer SEO Platform V1 (EC2-first).

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           DASHBOARD                                  │
│                React 18 + TypeScript + Tailwind                      │
│                         localhost:3002                               │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼ HTTP (+Bearer)
┌─────────────────────────────────────────────────────────────────────┐
│                         API SERVER (EC2)                             │
│                 Express + TypeScript + SQLite                        │
│                     http://{ec2-hostname}:3001                       │
│                                                                      │
│  Routes: /businesses, /keywords, /service-areas, /prompts, /jobs    │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         WORKER (same EC2)                            │
│                   Local Ollama + Job Processor                       │
│                 Polls claims, generates, completes pages             │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         OUTPUT STORAGE                               │
│                JSON files for Webpack ingestion                      │
│                         ./output/{business}/                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Components

### Dashboard (`packages/dashboard/`)

React 18 single-page application.

| Responsibility      | Details                                      |
| ------------------- | -------------------------------------------- |
| Business management | CRUD for businesses, keywords, service areas |
| Prompt editing      | Create/edit prompt templates                 |
| Job control         | Start generation, monitor progress           |
| Worker status       | View active workers, pages/hour              |

### API Server (`packages/server/`)

Express REST API with SQLite database.

| Responsibility   | Details                                   |
| ---------------- | ----------------------------------------- |
| Data persistence | SQLite for all entities                   |
| Job queue        | Atomic claim/release for workers          |
| Authentication   | Bearer token validation                   |
| CORS             | Configured for dashboard origin           |
| Export           | Writes JSON under `output/{business_id}/` |

### Worker (`packages/worker/`)

Background processor for content generation.

| Responsibility     | Details                  |
| ------------------ | ------------------------ |
| Job claiming       | Atomic claim via API     |
| Content generation | Call local Ollama        |
| Output writing     | JSON files to local disk |
| Heartbeat          | Report status to API     |

### Shared (`packages/shared/`)

Common TypeScript types and utilities.

| Responsibility   | Details                     |
| ---------------- | --------------------------- |
| Type definitions | Business, Job, Prompt, etc. |
| Validation       | Zod schemas                 |
| Logger           | Structured logging utility  |

---

## Data Flow

### 1. Job Creation

```
Dashboard → POST /businesses/:id/generate → Server
                                              │
                                              ▼
                                    Create job + pages in SQLite
                                              │
                                              ▼
                                    Return job ID to Dashboard
```

### 2. Job Processing

```
Worker → POST /jobs/:id/claim → Server
                                   │
                                   ▼
                         Atomic UPDATE...RETURNING
                                   │
                                   ▼
                         Return page or 409 (no pages)
                                   │
                                   ▼
Worker ← page data ←───────────────┘
   │
   ▼
Call Ollama → Generate content
   │
   ▼
PUT /jobs/:id/pages/:pageId/complete → Server
```

### 3. Output Export

```
Server → Query completed pages → Build manifest
                        │
                        ▼
               Write to ./output/{business_id}/
                  ├─ manifest.json
                  └─ pages/{url_path}.json
```

---

## EC2 Deployment (Cost-Safe)

Single EC2 instance runs both the API and worker to avoid multi-machine complexity and prevent unexpected cloud costs.

### Instance Profile

- Instance type: t3.small (CPU) or g4dn.xlarge (GPU only if needed)
- OS: Ubuntu 22.04 LTS
- Security group: allow inbound `3002` (dashboard if hosted), `3001` (API), and SSH from trusted IPs only
- Storage: 30GB gp3

### Cost Guardrails

- Use CPU-only Ollama model by default (e.g., `llama3.1:8b-instruct`), avoid GPU unless explicitly approved
- Auto-shutdown script: stop instance nightly to prevent idle costs
- CloudWatch alarm on monthly estimated charges and instance idle CPU < 3% for > 2h
- Tagging: `CostCenter=SEOPlatform`, `Env=Dev`

### Basic Setup

```bash
# On EC2
sudo apt update && sudo apt install -y nodejs npm sqlite3
curl -fsSL https://ollama.com/install.sh | sh  # optional; confirm before GPU use

# Environment
export API_HOST=0.0.0.0
export API_PORT=3001
export API_TOKEN=<secure-token>

# Start server and worker (PM2 or systemd)
```

---

## Security Model (V1)

| Layer              | Mechanism                                  |
| ------------------ | ------------------------------------------ |
| API Authentication | Bearer token in header                     |
| Network            | EC2 security groups + SSH from trusted IPs |
| CORS               | Restrict to dashboard origin               |
| Secrets            | `.env` files (gitignored)                  |

See [api/AUTH.md](../api/AUTH.md) and [api/CORS.md](../api/CORS.md) for details.

---

## Performance Targets

| Metric                   | Target  |
| ------------------------ | ------- |
| API response (list)      | < 200ms |
| API response (single)    | < 100ms |
| Page generation (Ollama) | 1-2 min |
| Pages/hour (2 workers)   | 60-120  |

---

## Phase 2 (Future)

When scaling beyond local:

- Replace SQLite with DynamoDB
- Replace local queue with SQS
- Add Lambda functions for API
- Add cloud LLM fallback (Claude Haiku)

See [decisions/002-sqlite-v1.md](../decisions/002-sqlite-v1.md) for rationale.
