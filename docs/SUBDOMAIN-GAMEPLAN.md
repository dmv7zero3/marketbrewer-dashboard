# Subdomain & Infrastructure Gameplan

Single source of truth for MarketBrewer subdomains, S3 buckets, CloudFront, and deployment flow.

## Goals
1. Keep deploys fast by isolating apps and assets.
2. Enforce least-privilege access per origin.
3. Maintain a consistent naming and routing pattern across environments.

## Canonical Subdomains
- `admin.marketbrewer.com` → Admin dashboard (S3 + CloudFront)
- `portal.marketbrewer.com` → Client portal (S3 + CloudFront)
- `api.marketbrewer.com` → API Gateway (HTTP API)
- `assets.marketbrewer.com` → Shared public assets (S3 + CloudFront, optional)

## Buckets
Production:
- `mb-admin-dashboard-prod`
- `mb-client-portal-prod`
- `mb-assets-prod` (optional)

Staging (recommended):
- `mb-admin-dashboard-staging`
- `mb-client-portal-staging`
- `mb-assets-staging` (optional)

## CloudFront Distributions
1. One distribution per subdomain for clean routing and cache control.
2. Origins use private S3 with OAC (no public bucket access).
3. SPA routing for admin and portal:
   - 403/404 → `/index.html`

## API Gateway
- Custom domain: `api.marketbrewer.com`
- CORS allowlist includes both apps:
  - `https://admin.marketbrewer.com`
  - `https://portal.marketbrewer.com`

## Infrastructure as Code
- Static sites: `infrastructure/static-sites.yaml`
- Deployment script: `scripts/deploy-static-sites.sh`
- Serverless API: `infrastructure/serverless.yaml`

## Deployment Flow
1. Provision/verify ACM cert in `us-east-1`.
2. Deploy static sites stack:
   - Admin dashboard bucket + CloudFront
   - Client portal bucket + CloudFront
   - Optional assets bucket + CloudFront
3. Deploy serverless API stack:
   - API Gateway custom domain `api.marketbrewer.com`
4. Build + sync artifacts:
   - Admin: `packages/dashboard/dist` → admin bucket
   - Portal: `packages/client-portal/dist` → portal bucket
   - Assets: `assets/` → assets bucket

## Environments
Use the same structure for each environment:
- `admin.<env>.marketbrewer.com`
- `portal.<env>.marketbrewer.com`
- `api.<env>.marketbrewer.com`
- `assets.<env>.marketbrewer.com`

If you prefer fewer domains in non-prod:
- Keep subdomains the same and use bucket suffixes (`-staging`, `-dev`).

## Security
1. S3 buckets are private; CloudFront OAC required.
2. API auth via bearer token + optional Google Workspace login.
3. Least-privilege IAM for Lambdas and deployments.

## Next Decisions
1. Confirm staging strategy:
   - separate subdomains per env, or
   - shared subdomains with bucket suffixes.
2. Confirm whether `assets.marketbrewer.com` should allow uploads.
3. If uploads are needed, add signed URL endpoints in the API.
