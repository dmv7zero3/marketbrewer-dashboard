# Operations Runbooks

Practical procedures for common operational events.

## Deploy (Serverless)
1) Verify CI is green
2) Ensure required env vars or SSM params are set
3) Run `scripts/deploy-serverless.sh`
4) Verify API health and dashboard access

## Rollback
1) Identify last known good Lambda versions
2) Re‑deploy previous build artifacts
3) Validate API `/health` and job creation
4) Update incident notes

## DLQ Handling
1) Check DLQ alarm details and message count
2) Inspect a sample message to confirm root cause
3) Fix underlying issue
4) Re‑drive messages to main queue or re‑enqueue manually

## Queue Backlog Recovery
1) Confirm backlog size and processing rate
2) Temporarily increase Lambda concurrency (within quotas)
3) Monitor error rates and DLQ
4) Scale down once backlog clears
