# Serverless Deployment (API Gateway + Lambda)

MarketBrewer Dashboard runs serverless with:
- API Gateway HTTP API
- TypeScript Lambda (API + worker)
- DynamoDB single-table (no GSIs)
- SQS queue for job processing
- Claude API for generation

## Resource Prefix
All resources use the project prefix (default: `marketbrewer`).
Table name: `${prefix}-dashboard`
Queue name: `${prefix}-page-generation`

## Deploy

```bash
export AWS_REGION=us-east-1
export PROJECT_PREFIX=marketbrewer
export CLAUDE_API_KEY=your-claude-key
export CLAUDE_MODEL=claude-3-5-sonnet-20240620
export CLAUDE_PRICE_INPUT_PER_1K=0
export CLAUDE_PRICE_OUTPUT_PER_1K=0
export API_TOKEN=your-secure-token
export GOOGLE_CLIENT_ID=a455cf980-6701-4910-a8b2-52915f160806
export GOOGLE_ALLOWED_EMAILS=j@marketbrewer.com

export EXISTING_QUEUE_ARN=arn:aws:sqs:us-east-1:752567131183:marketbrewer-page-generation
export EXISTING_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/752567131183/marketbrewer-page-generation
export EXISTING_TABLE_NAME=marketbrewer-dashboard
export CORS_ALLOW_ORIGINS=https://admin.marketbrewer.com,https://portal.marketbrewer.com
export RATE_LIMIT_PER_MIN=120

./scripts/deploy-serverless.sh
```

The script builds both lambdas, deploys the CloudFormation stack, and updates the Lambda code.

## API URL
Stack output:
`https://sno9m87ab4.execute-api.us-east-1.amazonaws.com`

Production domain:
`https://api.marketbrewer.com`

```bash
REACT_APP_API_URL=https://api.marketbrewer.com
```

## Google Login

Current IAM OAuth client (from gcloud):
`a455cf980-6701-4910-a8b2-52915f160806`

Configured redirect URIs:
- `https://admin.marketbrewer.com`
- `http://localhost:3002`

If Google Identity Services rejects this client ID, create a standard Web OAuth
client in Google Cloud Console and replace `GOOGLE_CLIENT_ID` with the
`*.apps.googleusercontent.com` client ID.

### Production API Domain (api.marketbrewer.com)

1. Request an ACM certificate in `us-east-1` for `api.marketbrewer.com`.
2. Create an API Gateway custom domain and attach the certificate.
3. Map the custom domain to the HTTP API stage.
4. In Route 53 (hosted zone: `marketbrewer.com`), create an A/AAAA alias to the API Gateway domain.

This keeps a stable production URL for the dashboard and external tooling.

## Immutable Job Costs
Each cost event is written as an immutable item under:
- `PK = JOB#<jobId>`
- `SK = COST#<timestamp>#<uuid>`

Jobs can be hidden from default lists using `is_hidden=true` while preserving the immutable cost ledger.
