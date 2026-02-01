# ADR 005: Serverless Platform (API Gateway + Lambda + DynamoDB)

**Status:** Accepted  
**Date:** 2026-01-15

## Context

MarketBrewer needs a low-cost, scalable platform for internal SEO operations and content generation. EC2, local SQLite, and Ollama-based generation add operational overhead and risk unexpected costs.

## Decision

Adopt a serverless architecture:

- API Gateway (HTTP API)
- TypeScript Lambdas for API + worker
- DynamoDB single-table (no GSIs)
- SQS for page generation tasks
- Claude API for content generation
- S3 + CloudFront for dashboard hosting
- Google Workspace login gating for internal access

## Consequences

- No EC2 infrastructure is required.
- Costs scale with usage (pay-per-request).
- DynamoDB access patterns must be designed around single-table queries.
- Cost tracking is immutable and stored in DynamoDB to preserve billing history.
