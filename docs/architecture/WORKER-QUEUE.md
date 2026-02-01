# Worker Queue Strategy (SQS + Lambda)

MarketBrewer uses SQS to fan out page generation work and a Lambda worker to process each page.

---

## Flow

```
Dashboard → POST /api/businesses/:id/generate
            └── Lambda API creates Job + Pages in DynamoDB
            └── Lambda API sends SQS messages (page tasks)

SQS → Lambda Worker → Claude API → DynamoDB updates
```

---

## SQS Message Payload

```json
{
  "job_id": "job-uuid",
  "page_id": "page-uuid",
  "business_id": "business-uuid",
  "page_type": "keyword-service-area"
}
```

---

## Concurrency

- Lambda scales by SQS depth (no manual worker pools).
- Each message processes a single page.
- Retries are handled by SQS/Lambda retry policy.

---

## Failure Handling

- If the worker throws, the message is retried.
- When retries are exhausted, the page is marked `failed`.
- Immutable cost entries are only written on successful Claude calls.

---

## Cost Ledger

Each successful page generation writes an immutable cost item under:

```
PK = JOB#{jobId}
SK = COST#{timestamp}#{uuid}
```

These entries are never deleted, even if jobs are hidden.
