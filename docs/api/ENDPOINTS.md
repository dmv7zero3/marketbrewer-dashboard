# API Endpoints

REST API reference for MarketBrewer SEO Platform.

---

## Base URL

| Environment | URL                              |
| ----------- | -------------------------------- |
| Local       | `http://localhost:3001`          |
| Tailscale   | `http://{hostname}.tailnet:3001` |

---

## Authentication

All endpoints require Bearer token:

```
Authorization: Bearer {API_TOKEN}
```

See [AUTH.md](./AUTH.md) for details.

---

## Businesses

### Health Check

```
GET /health
```

Response:

```json
{ "status": "ok" }
```

---

### List Businesses

```
GET /businesses
```

Response:

```json
{
  "businesses": [
    {
      "id": "bus-123",
      "name": "Nash & Smashed",
      "industry": "restaurant"
    }
  ]
}
```

### Get Business

```
GET /businesses/:id
```

### Create Business

```
POST /businesses
Content-Type: application/json

{
  "name": "Nash & Smashed",
  "industry": "restaurant",
  "website": "https://nashandsmashed.com",
  "phone": "703-555-1234"
}
```

### Update Business

```
PUT /businesses/:id
Content-Type: application/json

{
  "name": "Nash & Smashed",
  "phone": "703-555-9999"
}
```

### Delete Business

```
DELETE /businesses/:id
```

---

## Questionnaire

### Get Questionnaire

```
GET /businesses/:id/questionnaire
```

Response:

```json
{
  "questionnaire": {
    "id": "quest-123",
    "businessId": "bus-123",
    "data": { ... },
    "completenessScore": 75
  }
}
```

### Update Questionnaire

```
PUT /businesses/:id/questionnaire
Content-Type: application/json

{
  "data": {
    "businessIdentity": { ... },
    "targetAudience": { ... }
  }
}
```

---

## Keywords

### List Keywords

```
GET /api/businesses/:id/keywords
```

Response:

```json
{
  "keywords": [
    {
      "id": "kw-123",
      "slug": "halal-fried-chicken",
      "keyword": "halal fried chicken",
      "language": "en",
      "search_intent": "Find halal-certified fried chicken restaurants"
    }
  ]
}
```

### Create Keyword

```
POST /api/businesses/:id/keywords
Content-Type: application/json

{
  "keyword": "halal fried chicken",
  "searchIntent": "Find halal-certified fried chicken restaurants",
  "language": "en"
}
```

Note: Keywords support bilingual pairs (EN/ES) with shared slugs.

### Update Keyword

```
PUT /api/businesses/:id/keywords/:slug
```

### Delete Keyword

```
DELETE /api/businesses/:id/keywords/:slug
```

---

## Service Areas

### List Service Areas

```
GET /api/businesses/:id/service-areas
```

Response (sorted by priority DESC, updated_at DESC):

```json
{
  "service_areas": [
    {
      "id": "sa-123",
      "slug": "sterling-va",
      "city": "Sterling",
      "state": "VA",
      "county": "Loudoun",
      "country": "USA",
      "priority": 10,
      "location_id": null,
      "updated_at": "2024-12-20T10:30:00Z"
    }
  ]
}
```

### Create Service Area

```
POST /api/businesses/:id/service-areas
Content-Type: application/json

{
  "city": "Sterling",
  "state": "VA",
  "county": "Loudoun",
  "country": "USA",
  "priority": 10
}
```

### Update Service Area

```
PUT /api/businesses/:id/service-areas/:slug
```

### Delete Service Area

```
DELETE /api/businesses/:id/service-areas/:slug
```

---

## Locations

Physical store locations (linked to service areas).

### List Locations

```
GET /api/businesses/seo/:id/locations
```

Query params: `?status=active`, `?state=VA`

### Create Location

```
POST /api/businesses/seo/:id/locations
Content-Type: application/json

{
  "name": "Sterling Store",
  "city": "Sterling",
  "state": "VA",
  "country": "USA",
  "status": "active"
}
```

### Bulk Import

```
POST /api/businesses/seo/:id/locations/bulk-import
Content-Type: application/json

{
  "locations": [...],
  "auto_create_service_areas": true
}
```

---

## Prompts

### List Prompts

```
GET /businesses/:id/prompts
```

### Get Active Prompt

```
GET /businesses/:id/prompts/:pageType
```

### Create Prompt Version

```
POST /businesses/:id/prompts
Content-Type: application/json

{
  "pageType": "location-keyword",  // Store cities × keywords
  "template": "Write a local SEO page for {{business_name}}...",
  "requiredVariables": ["business_name", "city", "state"],
  "optionalVariables": ["phone", "years_experience"],
  "wordCountTarget": 400
}
```

---

## Generation Jobs

### Start Generation

```
POST /businesses/:id/generate
Content-Type: application/json

{
  "pageType": "service-area"  // Nearby cities × keywords
}
```

Response:

```json
{
  "job": {
    "id": "job-456",
    "businessId": "bus-123",
    "status": "pending",
    "totalPages": 525,
    "completedPages": 0
  }
}
```

### List Jobs

```
GET /businesses/:id/jobs
```

### Get Job Status

```
GET /businesses/:id/jobs/:jobId
```

Response:

```json
{
  "job": {
    "id": "job-456",
    "status": "processing",
    "totalPages": 525,
    "completedPages": 123,
    "failedPages": 2
  },
  "pages": {
    "queued": 400,
    "processing": 2,
    "completed": 123,
    "failed": 2
  }
}
```

---

## Worker Endpoints

### Claim Page

```
POST /api/jobs/:jobId/claim
Content-Type: application/json

{
  "workerId": "macbook-pro-1"
}
```

Response (success) — enriched with business, questionnaire, and template data:

```json
{
  "page": {
    "id": "page-789",
    "job_id": "job-456",
    "keyword_slug": "halal-fried-chicken",
    "keyword_text": "halal fried chicken",
    "keyword_language": "en",
    "service_area_slug": "sterling-va",
    "url_path": "/halal-fried-chicken/sterling-va"
  },
  "business": {
    "id": "bus-123",
    "name": "Nash & Smashed",
    "industry": "restaurant",
    "phone": "703-555-1234"
  },
  "questionnaire": {
    "identity": { "tagline": "..." },
    "audience": { "target": "..." }
  },
  "template": {
    "id": "tpl-456",
    "page_type": "service-area",
    "version": 1,
    "template": "Write a page for {{business_name}} in {{city}}, {{state}}..."
  }
}
```

Response (no pages available):

```json
{
  "error": "No pages available",
  "code": "NO_PAGES"
}
```

Status: 409

### Complete Page

```
PUT /jobs/:jobId/pages/:pageId/complete
Content-Type: application/json

{
  "status": "completed",
  "content": {
    "title": "Halal Fried Chicken in Sterling, VA",
    "metaDescription": "...",
    "body": "..."
  }
}
```

### Fail Page

```
PUT /jobs/:jobId/pages/:pageId/complete
Content-Type: application/json

{
  "status": "failed",
  "errorMessage": "Ollama timeout after 120s"
}
```

### Worker Heartbeat

```
POST /workers/heartbeat
Content-Type: application/json

{
  "workerId": "macbook-pro-1",
  "currentPageId": "page-789",
  "timestamp": "2025-12-16T10:30:00Z"
}
```

### Worker Status

```
GET /workers/status
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Human-readable message",
  "code": "MACHINE_CODE",
  "details": { ... }
}
```

| Code                | HTTP | Meaning                  |
| ------------------- | ---- | ------------------------ |
| `VALIDATION_ERROR`  | 400  | Invalid input            |
| `UNAUTHORIZED`      | 401  | Missing/invalid token    |
| `NOT_FOUND`         | 404  | Resource not found       |
| `CONFLICT`          | 409  | Resource conflict        |
| `INSUFFICIENT_DATA` | 422  | Questionnaire incomplete |
| `INTERNAL_ERROR`    | 500  | Server error             |
