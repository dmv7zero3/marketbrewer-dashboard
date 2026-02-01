#!/bin/bash
set -euo pipefail

STACK_NAME=${STACK_NAME:-marketbrewer-dashboard-serverless}
PROJECT_PREFIX=${PROJECT_PREFIX:-marketbrewer}
REGION=${AWS_REGION:-us-east-1}

if [[ -z "${CLAUDE_API_KEY:-}" ]]; then
  echo "CLAUDE_API_KEY is required" >&2
  exit 1
fi

if [[ -z "${API_TOKEN:-}" ]]; then
  echo "API_TOKEN is required" >&2
  exit 1
fi

GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-""}
GOOGLE_ALLOWED_EMAILS=${GOOGLE_ALLOWED_EMAILS:-"j@marketbrewer.com"}
CLAUDE_MODEL=${CLAUDE_MODEL:-"claude-3-5-sonnet-20240620"}
CLAUDE_PRICE_INPUT_PER_1K=${CLAUDE_PRICE_INPUT_PER_1K:-0}
CLAUDE_PRICE_OUTPUT_PER_1K=${CLAUDE_PRICE_OUTPUT_PER_1K:-0}
EXISTING_QUEUE_ARN=${EXISTING_QUEUE_ARN:-""}
EXISTING_QUEUE_URL=${EXISTING_QUEUE_URL:-""}
EXISTING_TABLE_NAME=${EXISTING_TABLE_NAME:-""}
CORS_ALLOW_ORIGINS=${CORS_ALLOW_ORIGINS:-"https://admin.marketbrewer.com"}
RATE_LIMIT_PER_MIN=${RATE_LIMIT_PER_MIN:-120}

PATH="/usr/local/opt/node@20/bin:$PATH"

npm install
npm run --workspace=packages/lambda-api build
npm run --workspace=packages/lambda-worker build

mkdir -p dist/lambda
zip -j dist/lambda/api.zip packages/lambda-api/dist/index.js > /dev/null
zip -j dist/lambda/worker.zip packages/lambda-worker/dist/index.js > /dev/null

aws cloudformation deploy \
  --stack-name "$STACK_NAME" \
  --template-file infrastructure/serverless.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --region "$REGION" \
  --parameter-overrides \
    ProjectPrefix="$PROJECT_PREFIX" \
    ClaudeApiKey="$CLAUDE_API_KEY" \
    ClaudeModel="$CLAUDE_MODEL" \
    ClaudePriceInputPer1K="$CLAUDE_PRICE_INPUT_PER_1K" \
    ClaudePriceOutputPer1K="$CLAUDE_PRICE_OUTPUT_PER_1K" \
    ApiToken="$API_TOKEN" \
    GoogleClientId="$GOOGLE_CLIENT_ID" \
    GoogleAllowedEmails="$GOOGLE_ALLOWED_EMAILS" \
    ExistingQueueArn="$EXISTING_QUEUE_ARN" \
    ExistingQueueUrl="$EXISTING_QUEUE_URL" \
    ExistingTableName="$EXISTING_TABLE_NAME" \
    CorsAllowOrigins="$CORS_ALLOW_ORIGINS" \
    RateLimitPerMinute="$RATE_LIMIT_PER_MIN"

API_FUNCTION_NAME="$PROJECT_PREFIX-dashboard-api"
WORKER_FUNCTION_NAME="$PROJECT_PREFIX-dashboard-worker"

aws lambda update-function-code \
  --function-name "$API_FUNCTION_NAME" \
  --zip-file fileb://dist/lambda/api.zip \
  --region "$REGION" > /dev/null

aws lambda update-function-code \
  --function-name "$WORKER_FUNCTION_NAME" \
  --zip-file fileb://dist/lambda/worker.zip \
  --region "$REGION" > /dev/null

aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query "Stacks[0].Outputs" \
  --output table
