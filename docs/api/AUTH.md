# Authentication

MarketBrewer API accepts either a static API token or a Google ID token for internal access.

---

## Overview

| Client                | Auth Method |
| --------------------- | ----------- |
| Dashboard → API        | Google ID token (preferred) or API token |
| Worker → API           | API token |
| Admin user             | Google Workspace login |

---

## Bearer Token

```
Authorization: Bearer {API_TOKEN}
```

Used by internal tooling and the Lambda worker.

---

## Google Workspace Login

The dashboard uses Google Identity Services to obtain an ID token and sends it as the bearer token.

### Environment

```bash
# Lambda API
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
GOOGLE_ALLOWED_EMAILS=j@marketbrewer.com

# Dashboard
REACT_APP_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
REACT_APP_GOOGLE_ALLOWED_EMAILS=j@marketbrewer.com
```

---

## Serverless Auth Middleware

Location: `packages/lambda-api/src/index.ts`

Logic:
- Accept API token if it matches `API_TOKEN`
- Otherwise validate Google ID token with `GOOGLE_CLIENT_ID`
- Enforce `GOOGLE_ALLOWED_EMAILS` if provided

---

## Public Endpoints

| Endpoint | Purpose |
| -------- | ------- |
| `GET /health` | Health check |
| `GET /api/health` | Health check |
| `OPTIONS *` | CORS preflight |
