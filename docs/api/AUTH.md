# Authentication

API authentication for MarketBrewer SEO Platform.

---

## Overview

V1 uses simple Bearer token authentication.

| Component | Auth Method |
|-----------|-------------|
| Dashboard → API | Bearer token |
| Worker → API | Bearer token |
| Dashboard → User | None (local tool) |

---

## Bearer Token

### Request Format

```
Authorization: Bearer {API_TOKEN}
```

### Example

```bash
curl -H "Authorization: Bearer abc123secret" \
  http://localhost:3001/businesses
```

---

## Server Middleware

Location: `packages/server/src/middleware/auth.ts`

```typescript
import { Request, Response, NextFunction } from 'express';

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Missing authorization header',
      code: 'UNAUTHORIZED',
    });
    return;
  }
  
  const token = authHeader.slice(7);
  
  if (token !== process.env.API_TOKEN) {
    res.status(401).json({
      error: 'Invalid token',
      code: 'UNAUTHORIZED',
    });
    return;
  }
  
  next();
};
```

---

## Environment Setup

### API Server

```bash
# packages/server/.env
API_TOKEN=your-secure-random-token-here
```

### Dashboard

```bash
# packages/dashboard/.env
REACT_APP_API_TOKEN=your-secure-random-token-here
REACT_APP_API_URL=http://localhost:3001
```

### Worker

```bash
# packages/worker/.env
API_TOKEN=your-secure-random-token-here
API_URL=http://localhost:3001
```

---

## Token Generation

Generate a secure random token:

```bash
# macOS/Linux
openssl rand -hex 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Security Rules

1. **Never commit tokens** — `.env` files are gitignored
2. **Same token everywhere** — API, Dashboard, Worker use same token
3. **Rotate periodically** — Change token if compromised
4. **HTTPS in production** — Tokens are visible in headers

---

## Public Endpoints

These endpoints skip authentication:

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Health check |
| `OPTIONS *` | CORS preflight |

---

## Dashboard API Client

Location: `packages/dashboard/src/lib/api-client.ts`

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.REACT_APP_API_TOKEN}`,
  },
});

export default api;
```

---

## Worker API Client

Location: `packages/worker/src/api-client.ts`

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.API_TOKEN}`,
  },
  timeout: 30000,
});

export default api;
```

---

## Error Responses

### Missing Token

```json
{
  "error": "Missing authorization header",
  "code": "UNAUTHORIZED"
}
```
Status: 401

### Invalid Token

```json
{
  "error": "Invalid token",
  "code": "UNAUTHORIZED"
}
```
Status: 401

---

## Phase 2: AWS

When migrating to AWS:

- API Gateway + Lambda Authorizer
- Or API Gateway API Keys
- Or Cognito User Pools

Token-based auth remains compatible.
