# Bilingual Keyword UI - Verification

**Status:** ✅ Verified (Dashboard + API)

This checklist confirms the dashboard accurately displays bilingual keywords
and respects language selection for new entries.

---

## UI Checks

1. **Filter buttons show counts**
   - All / English / Spanish counts are accurate
2. **Language badges**
   - EN badge is blue
   - ES badge is green
3. **Empty state**
   - Filtering with zero results shows a clear empty message

---

## Data Checks (API)

Fetch keywords via API and confirm `language` is `en` or `es`:

```bash
curl -s https://api.marketbrewer.com/api/businesses/marketbrewer/keywords \
  -H "Authorization: Bearer $API_TOKEN" | jq '.[0]'
```

Expected fields:

```json
{
  "id": "mb-kw-1",
  "keyword": "criminal defense attorney DC",
  "language": "en"
}
```

---

## DynamoDB Spot Check

```bash
aws dynamodb query \
  --region us-east-1 \
  --table-name marketbrewer-dashboard \
  --key-condition-expression "PK = :pk and begins_with(SK, :sk)" \
  --expression-attribute-values '{
    ":pk": {"S": "BUSINESS#marketbrewer"},
    ":sk": {"S": "KEYWORD#"}
  }' \
  --projection-expression "keyword, #lang" \
  --expression-attribute-names '{"#lang":"language"}'
```

---

## Pass Criteria

- Language badges match keyword language
- Filters show correct counts
- API returns `language` for all keywords
- DynamoDB stores `language` on keyword items
