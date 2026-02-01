# Deployment

MarketBrewer Dashboard uses serverless infrastructure (API Gateway + Lambda + DynamoDB + SQS).

Use:
- `docs/SERVERLESS-DEPLOYMENT.md` for API/worker deployment
- CloudFront + S3 for `admin.marketbrewer.com` (admin dashboard)
- CloudFront + S3 for `portal.marketbrewer.com` (client dashboard)
- CloudFront + S3 for `assets.marketbrewer.com` (shared assets)

Static sites stack:
- `infrastructure/static-sites.yaml`
- Deploy with `scripts/deploy-static-sites.sh`

EC2-based deployment is deprecated and removed.
