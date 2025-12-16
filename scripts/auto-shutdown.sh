#!/usr/bin/env bash
set -euo pipefail

# Stops the EC2 instance to control costs. Requires AWS CLI and instance role/credentials.
# Usage: add to cron: 0 2 * * * /opt/marketbrewer-seo-platform/scripts/auto-shutdown.sh

INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
REGION=${AWS_REGION:-us-east-1}

echo "Stopping instance ${INSTANCE_ID} in ${REGION}..."
aws ec2 stop-instances --instance-ids "${INSTANCE_ID}" --region "${REGION}" --output text || {
  echo "Failed to stop instance. Check IAM permissions and AWS CLI installation." >&2
  exit 1
}
