# Environment Variables

Single reference for MarketBrewer dashboard + serverless API configuration.

## Quick Reference

| Variable                         | Required | Component              | Default                  | Description                                     |
| -------------------------------- | -------- | ---------------------- | ------------------------ | ----------------------------------------------- |
| `AWS_REGION`                     | ✅       | Deploy                 | `us-east-1`              | AWS region for all resources                     |
| `PROJECT_PREFIX`                 | ✅       | Deploy                 | `marketbrewer`           | Resource prefix for table/queue/stack            |
| `DDB_TABLE_NAME`                 | ❌       | Lambda API/Worker       | `${prefix}-dashboard`    | DynamoDB single-table name                       |
| `DDB_ENDPOINT`                   | ❌       | Lambda API/Worker       | -                        | DynamoDB endpoint override (local dev)           |
| `SQS_QUEUE_URL`                  | ❌       | Lambda API/Worker       | Stack output             | SQS queue URL (page generation)                  |
| `SQS_ENDPOINT`                   | ❌       | Lambda API/Worker       | -                        | SQS endpoint override (local dev)                |
| `SQS_QUEUE_NAME`                 | ❌       | Local bootstrap         | `${prefix}-page-generation` | Local queue name for bootstrap                |
| `EXISTING_QUEUE_ARN`             | ❌       | Deploy                 | -                        | Reuse existing SQS queue ARN                      |
| `EXISTING_QUEUE_URL`             | ❌       | Deploy                 | -                        | Reuse existing SQS queue URL                      |
| `EXISTING_TABLE_NAME`            | ❌       | Deploy                 | -                        | Reuse existing DynamoDB table name                |
| `CORS_ALLOW_ORIGINS`             | ❌       | Deploy                 | `https://admin.marketbrewer.com,https://portal.marketbrewer.com` | Comma-separated allowed origins          |
| `RATE_LIMIT_PER_MIN`             | ❌       | Deploy                 | `120`                    | API rate limit per identity per minute            |
| `API_TOKEN`                      | ✅       | Lambda API/Worker       | -                        | Bearer token for API authentication              |
| `GOOGLE_CLIENT_ID`               | ❌       | Lambda API              | -                        | Google OAuth client ID for token validation      |
| `GOOGLE_ALLOWED_EMAILS`          | ❌       | Lambda API              | -                        | Comma-separated allowed Google Workspace emails  |
| `CLAUDE_API_KEY`                 | ✅       | Lambda Worker           | -                        | Claude API key                                   |
| `CLAUDE_MODEL`                   | ❌       | Lambda Worker           | `claude-3-5-sonnet-20240620` | Claude model name                           |
| `CLAUDE_PRICE_INPUT_PER_1K`      | ✅       | Lambda Worker           | `0`                      | Cost per 1K input tokens (USD)                   |
| `CLAUDE_PRICE_OUTPUT_PER_1K`     | ✅       | Lambda Worker           | `0`                      | Cost per 1K output tokens (USD)                  |
| `WEBHOOK_TIMEOUT_MS`             | ❌       | Lambda Worker           | `5000`                   | Webhook delivery timeout                         |
| `REACT_APP_API_URL`              | ✅       | Dashboard               | -                        | API base URL (prod: `https://api.marketbrewer.com`) |
| `REACT_APP_API_TOKEN`            | ❌       | Dashboard               | -                        | Optional fallback bearer token                      |
| `REACT_APP_GOOGLE_CLIENT_ID`     | ❌       | Dashboard               | -                        | Google Identity Services client ID               |
| `REACT_APP_GOOGLE_ALLOWED_EMAILS`| ❌       | Dashboard               | -                        | Comma-separated allowed dashboard emails         |
| `LOCAL_API_PORT`                 | ❌       | Local API server        | `3001`                   | Port for `npm run dev:server`                      |
| `LOCAL_SSE_POLL_MS`              | ❌       | Local API server        | `3000`                   | SSE polling interval for live updates             |
| `LOCAL_SSE_HEARTBEAT_MS`         | ❌       | Local API server        | `15000`                  | SSE heartbeat interval                             |
| `LOCAL_WORKER_POLL_MS`           | ❌       | Local worker            | `1000`                   | Local SQS polling interval                         |
| `LOCAL_WORKER_BATCH_SIZE`        | ❌       | Local worker            | `10`                     | Max SQS messages per poll                          |
| `CLIENT_PORTAL_PORT`             | ❌       | Client portal           | `3003`                   | Port for `npm run dev:client-portal`              |

## Serverless API + Worker

### `API_TOKEN` (Required)
Bearer token used by the dashboard and worker when calling the API. Keep it secret and rotate quarterly.
This is NOT a ChatGPT/OpenAI key. It is a private MarketBrewer API token.

### `GOOGLE_CLIENT_ID` (Optional)
Google OAuth client ID used to validate ID tokens from the dashboard.

Current IAM OAuth client (from gcloud):
`a455cf980-6701-4910-a8b2-52915f160806`

Configured redirect URIs:
- `https://admin.marketbrewer.com`
- `http://localhost:3002`

Note: Google Identity Services typically expects a standard Web OAuth client ID
(`*.apps.googleusercontent.com`). If GIS login fails, create a Web client in the
Google Cloud Console and use that ID instead.

### `GOOGLE_ALLOWED_EMAILS` (Optional)
Comma-separated list of allowed Google Workspace emails (example: `j@marketbrewer.com`).

### `DDB_TABLE_NAME` (Optional)
Override the DynamoDB single-table name. Defaults to `${prefix}-dashboard`.

### `DDB_ENDPOINT` (Optional)
Override DynamoDB endpoint (useful for DynamoDB Local).

### `SQS_QUEUE_URL` (Optional)
Overrides the queue URL created by the stack. Useful for local testing.

### `SQS_ENDPOINT` (Optional)
Override SQS endpoint (useful for LocalStack).

### `SQS_QUEUE_NAME` (Optional)
Queue name used by `npm run local:bootstrap` when creating a local SQS queue.

### `EXISTING_QUEUE_ARN` / `EXISTING_QUEUE_URL` (Optional)
Use an already-created SQS queue (e.g. `marketbrewer-page-generation`) instead of creating a new one.

### `EXISTING_TABLE_NAME` (Optional)
Use an already-created DynamoDB table (e.g. `marketbrewer-dashboard`) instead of creating a new one.

### `CORS_ALLOW_ORIGINS` (Optional)
Comma-separated list of allowed origins for API CORS responses.

### `RATE_LIMIT_PER_MIN` (Optional)
Per-identity request limit per minute enforced by DynamoDB counters. Set to `0` to disable.

### `CLAUDE_API_KEY` (Required)
Claude API key for content generation jobs.

### `CLAUDE_MODEL` (Optional)
Claude model name used by the worker.

### `CLAUDE_PRICE_INPUT_PER_1K` / `CLAUDE_PRICE_OUTPUT_PER_1K`
Per-1K token costs used to calculate immutable job cost events.

### `WEBHOOK_TIMEOUT_MS` (Optional)
Timeout for webhook deliveries from the worker (milliseconds).

## Dashboard (React)

### `REACT_APP_API_URL` (Required)
Base API URL used by the dashboard. Production uses `https://api.marketbrewer.com`.

### `REACT_APP_API_TOKEN` (Optional)
Fallback API token used when no Google ID token is present (local/dev usage).

### `REACT_APP_GOOGLE_CLIENT_ID` (Optional)
Google Identity Services client ID used by the login gate.

### `REACT_APP_GOOGLE_ALLOWED_EMAILS` (Optional)
Comma-separated list of allowed Google Workspace emails for UI access control.

## Local API Server

### `LOCAL_API_PORT` (Optional)
Port for the local API server started by `npm run dev:server`. Defaults to `3001`.

### `LOCAL_SSE_POLL_MS` / `LOCAL_SSE_HEARTBEAT_MS` (Optional)
Controls SSE polling/heartbeat intervals for local live updates.

### `LOCAL_WORKER_POLL_MS` / `LOCAL_WORKER_BATCH_SIZE` (Optional)
Controls how frequently the local worker polls SQS and how many messages it pulls per batch.

## Client Portal

### `CLIENT_PORTAL_PORT` (Optional)
Port for the client portal started by `npm run dev:client-portal`. Defaults to `3003`.
