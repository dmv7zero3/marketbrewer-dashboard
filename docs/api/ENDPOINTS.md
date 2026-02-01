# API Endpoints

Serverless HTTP API for MarketBrewer Dashboard.

---

## Base URL

| Environment | URL                             |
| ---------- | -------------------------------- |
| Local      | `http://localhost:3001` (dev)    |
| Production | `https://api.marketbrewer.com`   |

All routes below are prefixed with `/api`.

---

## Authentication

All endpoints require `Authorization: Bearer {token}` where the token is either:
- API token (`API_TOKEN`)
- Google ID token (GIS)

---

## Health

```
GET /health
GET /api/health
```

---

## Businesses

```
GET    /api/businesses
POST   /api/businesses
GET    /api/businesses/{businessId}
PUT    /api/businesses/{businessId}
DELETE /api/businesses/{businessId}
```

---

## Questionnaire

```
GET /api/businesses/{businessId}/questionnaire
PUT /api/businesses/{businessId}/questionnaire
```

---

## Business Profile (internal)

```
GET    /api/businesses/{businessId}/locations
POST   /api/businesses/{businessId}/locations
GET    /api/businesses/{businessId}/locations/{locationId}
PUT    /api/businesses/{businessId}/locations/{locationId}
DELETE /api/businesses/{businessId}/locations/{locationId}

GET /api/businesses/{businessId}/hours
PUT /api/businesses/{businessId}/hours

GET    /api/businesses/{businessId}/social
POST   /api/businesses/{businessId}/social
DELETE /api/businesses/{businessId}/social/{platform}
```

---

## Keywords

```
GET    /api/businesses/{businessId}/keywords
POST   /api/businesses/{businessId}/keywords
PUT    /api/businesses/{businessId}/keywords/{keywordId}
DELETE /api/businesses/{businessId}/keywords/{keywordId}
```

---

## Service Areas

```
GET    /api/businesses/{businessId}/service-areas
POST   /api/businesses/{businessId}/service-areas
PUT    /api/businesses/{businessId}/service-areas/{areaId}
DELETE /api/businesses/{businessId}/service-areas/{areaId}
```

---

## SEO Locations

```
GET    /api/businesses/seo/{businessId}/locations
POST   /api/businesses/seo/{businessId}/locations
GET    /api/businesses/seo/{businessId}/locations/{locationId}
PUT    /api/businesses/seo/{businessId}/locations/{locationId}
DELETE /api/businesses/seo/{businessId}/locations/{locationId}

GET  /api/businesses/seo/{businessId}/locations/stats
POST /api/businesses/seo/{businessId}/locations/bulk-import
```

---

## Prompts

```
GET    /api/businesses/{businessId}/prompts
POST   /api/businesses/{businessId}/prompts
PUT    /api/businesses/{businessId}/prompts/{promptId}
DELETE /api/businesses/{businessId}/prompts/{promptId}
```

---

## Jobs + Pages

```
GET /api/businesses/{businessId}/jobs
GET /api/businesses/{businessId}/jobs/{jobId}

POST /api/businesses/{businessId}/generate
POST /api/businesses/{businessId}/generate/preview

GET /api/jobs/{jobId}/pages
```

Query parameters:
- `include_hidden=true` for jobs
- `page`, `limit`, `status`, `language`, `search` for job pages

---

## Webhooks

```
GET    /api/webhooks
POST   /api/webhooks
DELETE /api/webhooks/{webhookId}
```

Events:
- `job.completed`
- `job.failed`

---

## Live Updates (Local)

```
GET /api/stream/jobs/{businessId}/{jobId}?token={bearerToken}
```

Server-sent events stream used by the local dev server for live job updates.
