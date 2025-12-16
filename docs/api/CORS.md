# CORS Configuration

**Single source of truth** for CORS policy across the platform.

---

## Overview

CORS (Cross-Origin Resource Sharing) controls which origins can access the API.

| Environment | Allowed Origins |
|-------------|-----------------|
| Development | `http://localhost:3000` |
| Production | Dashboard URL only |

---

## Server Configuration

Location: `packages/server/src/middleware/cors.ts`

```typescript
import cors from 'cors';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',      // Dashboard dev
  'http://127.0.0.1:3000',      // Dashboard dev (alt)
];

// Add production URL if set
if (process.env.DASHBOARD_URL) {
  ALLOWED_ORIGINS.push(process.env.DASHBOARD_URL);
}

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., curl, Postman)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

---

## Environment Variables

```bash
# .env
DASHBOARD_URL=http://localhost:3000
```

For Tailscale:
```bash
DASHBOARD_URL=http://macbook-pro.tailnet:3000
```

---

## Worker Requests

Workers connect directly to the API (same-origin or server-to-server).

CORS does not apply to:
- Server-to-server requests
- CLI tools (curl, httpie)
- Worker processes

---

## Preflight Requests

The API handles OPTIONS preflight automatically via the `cors` middleware.

Headers returned:
```
Access-Control-Allow-Origin: {origin}
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

---

## Troubleshooting

### "CORS error" in browser

1. Check dashboard is running on allowed origin
2. Verify `DASHBOARD_URL` env var is set
3. Check browser dev tools Network tab for actual error

### Worker can't connect

Workers don't need CORS — they connect directly. Check:
1. API_URL is correct
2. API_TOKEN is valid
3. Network connectivity (Tailscale status)

---

## Security Notes

1. **Never use `*` for origin** — Always whitelist specific origins
2. **Credentials require explicit origin** — Can't use `*` with credentials
3. **Workers bypass CORS** — Authenticate with Bearer token instead

---

## Phase 2: API Gateway

When migrating to AWS API Gateway:

```yaml
# serverless.yml or SAM template
Cors:
  AllowOrigin: "'https://dashboard.marketbrewer.com'"
  AllowHeaders: "'Content-Type,Authorization'"
  AllowMethods: "'GET,POST,PUT,DELETE,OPTIONS'"
```

CORS is configured at the Gateway level, not in Lambda.
