# Bilingual Keyword Support

**Status:** ✅ Implemented (DynamoDB + Lambda)

MarketBrewer supports bilingual keyword targeting (English + Spanish) end-to-end.
Language is stored per keyword and carried into job pages so the generator
produces content in the intended language.

---

## Data Model (DynamoDB)

Table: `${prefix}-dashboard` (default `marketbrewer-dashboard`)

**Keyword items**

- `PK = BUSINESS#{businessId}`
- `SK = KEYWORD#{keywordId}`
- Fields: `keyword`, `slug`, `language` (`en` | `es`)

**Job pages**

- `PK = JOB#{jobId}`
- `SK = PAGE#{pageId}`
- Fields: `keyword_text`, `keyword_language`

---

## API Flow

1. **Create/Update Keyword**
   - `POST /api/businesses/:id/keywords`
   - `language` optional; defaults to `en`
2. **Generate Job**
   - `POST /api/businesses/:id/generate`
   - Job pages inherit `keyword_text` + `keyword_language`
3. **Worker Generation**
   - Lambda worker builds prompts with `keyword_language`
   - Spanish keywords produce Spanish output, English keywords produce English output

---

## Verification

### Query keywords by language

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

### Check job pages for language propagation

```bash
aws dynamodb query \
  --region us-east-1 \
  --table-name marketbrewer-dashboard \
  --key-condition-expression "PK = :pk and begins_with(SK, :sk)" \
  --expression-attribute-values '{
    ":pk": {"S": "JOB#<job-id>"},
    ":sk": {"S": "PAGE#"}
  }' \
  --projection-expression "keyword_text, keyword_language"
```

---

## Notes

- Immutable cost ledger entries remain even if a job is hidden.
- The dashboard UI shows EN/ES badges and filters by language.
