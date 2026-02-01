#!/bin/bash

set -euo pipefail

STACK_NAME=${STACK_NAME:-marketbrewer-static-sites}
REGION=${AWS_REGION:-us-east-1}
PROJECT_PREFIX=${PROJECT_PREFIX:-marketbrewer}
ENV_SUFFIX=${ENV_SUFFIX:-prod}
HOSTED_ZONE_ID=${HOSTED_ZONE_ID:-}
ACM_CERT_ARN=${ACM_CERT_ARN:-}
CREATE_ASSETS=${CREATE_ASSETS:-false}

ADMIN_DOMAIN=${ADMIN_DOMAIN:-admin.marketbrewer.com}
PORTAL_DOMAIN=${PORTAL_DOMAIN:-portal.marketbrewer.com}
ASSETS_DOMAIN=${ASSETS_DOMAIN:-assets.marketbrewer.com}

if [ -z "$HOSTED_ZONE_ID" ]; then
  echo "HOSTED_ZONE_ID is required"
  exit 1
fi

if [ -z "$ACM_CERT_ARN" ]; then
  echo "ACM_CERT_ARN is required (must be in us-east-1)"
  exit 1
fi

aws cloudformation deploy \
  --stack-name "$STACK_NAME" \
  --template-file infrastructure/static-sites.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --region "$REGION" \
  --parameter-overrides \
    ProjectPrefix="$PROJECT_PREFIX" \
    EnvSuffix="$ENV_SUFFIX" \
    HostedZoneId="$HOSTED_ZONE_ID" \
    AdminDomain="$ADMIN_DOMAIN" \
    PortalDomain="$PORTAL_DOMAIN" \
    AssetsDomain="$ASSETS_DOMAIN" \
    AcmCertificateArn="$ACM_CERT_ARN" \
    CreateAssets="$CREATE_ASSETS"

echo "\nStack deployed."

ADMIN_BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='AdminBucketName'].OutputValue" --output text)
PORTAL_BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='PortalBucketName'].OutputValue" --output text)
ASSETS_BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='AssetsBucketName'].OutputValue" --output text 2>/dev/null || true)

if [ -n "${ADMIN_BUILD_DIR:-}" ] && [ -d "$ADMIN_BUILD_DIR" ]; then
  echo "Syncing admin dashboard to s3://$ADMIN_BUCKET"
  aws s3 sync "$ADMIN_BUILD_DIR" "s3://$ADMIN_BUCKET" --delete
fi

if [ -n "${PORTAL_BUILD_DIR:-}" ] && [ -d "$PORTAL_BUILD_DIR" ]; then
  echo "Syncing client portal to s3://$PORTAL_BUCKET"
  aws s3 sync "$PORTAL_BUILD_DIR" "s3://$PORTAL_BUCKET" --delete
fi

if [ "$CREATE_ASSETS" = "true" ] && [ -n "${ASSETS_DIR:-}" ] && [ -d "$ASSETS_DIR" ]; then
  echo "Syncing assets to s3://$ASSETS_BUCKET"
  aws s3 sync "$ASSETS_DIR" "s3://$ASSETS_BUCKET" --delete
fi

echo "Done."
