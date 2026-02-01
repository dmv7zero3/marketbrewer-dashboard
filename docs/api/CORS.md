# CORS Configuration

Serverless API responds with permissive CORS headers for the internal dashboard.

---

## Current Policy

The Lambda API returns:

```
Access-Control-Allow-Origin: {allowed-origin}
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS
```

Location: `packages/lambda-api/src/index.ts`

---

## Tightening for Production

Configure allowed origins via `CORS_ALLOW_ORIGINS` (comma-separated).

Example:

```
CORS_ALLOW_ORIGINS=https://admin.marketbrewer.com,https://portal.marketbrewer.com,http://localhost:3002
```

For single-origin production hardening:

```
Access-Control-Allow-Origin: https://admin.marketbrewer.com
```

If an origin is provided and not in the allowlist, the API now returns `403`.
