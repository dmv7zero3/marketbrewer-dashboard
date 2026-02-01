# Domains & Buckets

Canonical subdomains and their S3 bucket origins for the MarketBrewer platform.

## Subdomains

- `admin.marketbrewer.com` → Admin dashboard (S3 + CloudFront)
- `portal.marketbrewer.com` → Client portal (S3 + CloudFront)
- `api.marketbrewer.com` → API Gateway (HTTP API)
- `assets.marketbrewer.com` → Shared public assets (S3 + CloudFront)

## Bucket Naming

Recommended production buckets:

- `mb-admin-dashboard-prod`
- `mb-client-portal-prod`
- `mb-assets-prod`

Infrastructure:
- `infrastructure/static-sites.yaml`
- `scripts/deploy-static-sites.sh`

Suggested staging buckets:

- `mb-admin-dashboard-staging`
- `mb-client-portal-staging`
- `mb-assets-staging`

## CORS

Set API CORS allowlist to include both app origins:

```
CORS_ALLOW_ORIGINS=https://admin.marketbrewer.com,https://portal.marketbrewer.com
```

## Notes

- Admin and client apps deploy independently.
- Assets bucket should be read-only public through CloudFront OAC.
- `api.marketbrewer.com` should be a custom domain on API Gateway.
