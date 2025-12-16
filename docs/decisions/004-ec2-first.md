# ADR 004: EC2-First Deployment for V1

Date: 2025-12-16

## Status

Accepted

## Context

Initial docs proposed a local-first flow with two laptops acting as workers via Tailscale. To simplify operations and avoid multi-machine coordination, we will run the API server and a single worker on one AWS EC2 instance for V1.

## Decision

- V1 will deploy on a single EC2 instance hosting both the API and worker.
- SQLite remains the database.
- Ollama runs locally on the EC2 instance. GPU is opt-in and disabled by default.
- Cost guardrails are mandatory:
  - Default to CPU-only models.
  - Auto-shutdown policy for off-hours.
  - CloudWatch alarms for idle usage and estimated charges.

## Consequences

- Simplifies networking and authentication (no Tailscale for V1).
- Operational footprint limited to one managed instance.
- Easier to test end-to-end.
- Future scaling path remains: replace SQLite with DynamoDB, add SQS, scale workers.
