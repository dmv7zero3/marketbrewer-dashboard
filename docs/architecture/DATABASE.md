# DynamoDB Single-Table Design

MarketBrewer uses a single DynamoDB table for all entities. No GSIs.

Table name: `${prefix}-dashboard` (default: `marketbrewer-dashboard`)

---

## Key Patterns

| Entity                          | PK                      | SK                                |
| ------------------------------- | ----------------------- | --------------------------------- |
| Business                        | `BUSINESS`              | `BUSINESS#{businessId}`           |
| Questionnaire                   | `BUSINESS#{businessId}` | `QUESTIONNAIRE`                   |
| Keyword                         | `BUSINESS#{businessId}` | `KEYWORD#{keywordId}`             |
| Service Area                    | `BUSINESS#{businessId}` | `SERVICE_AREA#{areaId}`           |
| SEO Location                    | `BUSINESS#{businessId}` | `LOCATION#{locationId}`           |
| Profile Location                | `BUSINESS#{businessId}` | `PROFILE_LOCATION#{locationId}`   |
| Business Hours                  | `BUSINESS#{businessId}` | `HOURS`                           |
| Social Link                     | `BUSINESS#{businessId}` | `SOCIAL#{platform}`               |
| Prompt Template                 | `BUSINESS#{businessId}` | `PROMPT#{promptId}`               |
| Job                             | `BUSINESS#{businessId}` | `JOB#{jobId}`                     |
| Job Page                        | `JOB#{jobId}`           | `PAGE#{pageId}`                   |
| Job Cost (immutable)            | `JOB#{jobId}`           | `COST#{timestamp}#{uuid}`         |
| Webhook                         | `WEBHOOK`               | `WEBHOOK#{webhookId}`             |

---

## Core Items

### Business
```
PK = BUSINESS
SK = BUSINESS#{businessId}
```
Fields: `name`, `industry`, `industry_type`, `website`, `phone`, `email`, `gbp_url`, `primary_city`, `primary_state`, timestamps.

### Questionnaire
```
PK = BUSINESS#{businessId}
SK = QUESTIONNAIRE
```
Fields: `data` (JSON), `completeness_score`, timestamps.

### Job + Pages
```
PK = BUSINESS#{businessId}
SK = JOB#{jobId}
```
Fields: `status`, `page_type`, counts, `cost_total_usd`, timestamps.

### Webhook
```
PK = WEBHOOK
SK = WEBHOOK#{webhookId}
```
Fields: `url`, `events`, timestamps.

```
PK = JOB#{jobId}
SK = PAGE#{pageId}
```
Fields: `status`, `content`, `keyword_*`, `service_area_*`, `location_*`, timestamps.

---

## Immutable Cost Ledger

Every billable generation run is stored as an immutable cost item:

```
PK = JOB#{jobId}
SK = COST#{timestamp}#{uuid}
```

Fields: `usd_cost`, `input_tokens`, `output_tokens`, `model`, `created_at`.

Even if jobs are hidden (`is_hidden=true`), cost items remain.

---

## Query Patterns

- List businesses: `PK = BUSINESS`
- List business entities: `PK = BUSINESS#{businessId} AND begins_with(SK, '{PREFIX}#')`
- List job pages: `PK = JOB#{jobId} AND begins_with(SK, 'PAGE#')`
- List cost items: `PK = JOB#{jobId} AND begins_with(SK, 'COST#')`
