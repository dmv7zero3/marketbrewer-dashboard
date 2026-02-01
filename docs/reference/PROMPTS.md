# Prompt Templates

SEO page generation prompt templates and guidelines.

---

## Output Structure

Every prompt should return:

```json
{
  "title": "≤70 characters",
  "metaDescription": "≤160 characters",
  "body": "350-450 words"
}
```

---

## Template Variables

### Required (all templates)

| Variable            | Source           | Example                |
| ------------------- | ---------------- | ---------------------- |
| `{{business_name}}` | Business profile | MarketBrewer Client    |
| `{{city}}`          | Service area     | Alexandria             |
| `{{state}}`         | Service area     | VA                     |
| `{{phone}}`         | Business profile | 703-555-1234           |

### Optional (enhance quality)

| Variable               | Source              | Example                          |
| ---------------------- | ------------------- | -------------------------------- |
| `{{years_experience}}` | Questionnaire       | 15                               |
| `{{differentiators}}`  | Questionnaire       | Data-driven SEO, multi-location  |
| `{{target_audience}}`  | Questionnaire       | Local customers seeking services |
| `{{cta_text}}`         | Content preferences | Call now for a free consultation |

---

## Location-Keyword Template

Generates pages for **actual store locations** (cities where physical stores exist).

```
You are an SEO content writer for {{business_name}}, a {{industry}} business.

Write a local SEO landing page for the service "{{primary_service}}" targeting customers in {{city}}, {{state}}.

BUSINESS CONTEXT:
- Business Name: {{business_name}}
- Phone: {{phone}}
- Years Experience: {{years_experience}}
- Key Differentiators: {{differentiators}}

TARGET AUDIENCE:
{{target_audience}}

REQUIREMENTS:
1. Title tag (max 70 characters) - include service and city
2. Meta description (max 160 characters) - compelling, include location
3. Body content (400-450 words):
   - Opening paragraph mentioning {{city}} and the service
   - Why choose {{business_name}} (2-3 paragraphs)
   - Local relevance to {{city}}, {{state}}
   - Clear call-to-action with phone number

TONE: {{tone}}

OUTPUT FORMAT (JSON only, no markdown):
{
  "title": "...",
  "metaDescription": "...",
  "body": "..."
}

IMPORTANT:
- Do NOT use placeholder text
- Do NOT invent facts not provided
- Include {{phone}} naturally once in body
- Mention {{city}} 2-3 times naturally
```

---

## Service-Area Template

Generates pages for **nearby cities** (no physical store, but targeting for SEO).

```
You are an SEO content writer. Create a landing page optimized for "{{primary_keyword}}" targeting {{city}}, {{state}}.

BUSINESS:
- Name: {{business_name}}
- Industry: {{industry}}
- Phone: {{phone}}
- Unique Value: {{differentiators}}

SEARCH INTENT:
Someone searching "{{primary_keyword}} {{city}}" wants: {{search_intent}}

REQUIREMENTS:
1. Title (max 70 chars): Include keyword and city
2. Meta description (max 160 chars): Address search intent
3. Body (400-450 words):
   - Answer search intent immediately
   - Position {{business_name}} as solution
   - Include local context for {{city}}
   - End with CTA

OUTPUT FORMAT (JSON only):
{
  "title": "...",
  "metaDescription": "...",
  "body": "..."
}
```

---

## Industry Templates

### Restaurant (MarketBrewer Client)

```
Write a local SEO page for {{business_name}}, a {{cuisine_type}} restaurant in {{city}}, {{state}}.

RESTAURANT DETAILS:
- Name: {{business_name}}
- Cuisine: {{cuisine_type}}
- Specialty: {{menu_highlights}}
- Dietary Options: {{dietary_options}}
- Phone: {{phone}}

TARGET KEYWORD: {{primary_keyword}}

FOCUS:
1. Highlight {{dietary_options}}
2. Mention signature dishes
3. Appeal to locals in {{city}}
4. Include phone for orders
```

### Legal (MarketBrewer Client)

```
Write a local SEO page for {{attorney_name}}, a {{practice_area}} attorney serving {{city}}, {{state}}.

ATTORNEY DETAILS:
- Name: {{attorney_name}}
- Firm: {{business_name}}
- Practice Area: {{practice_area}}
- Experience: {{experience_metrics}}
- Phone: {{phone}}

LEGAL NOTES:
- Do NOT guarantee outcomes
- Focus on experience and credentials
- Emphasize local court knowledge
```

---

## Quality Validation

After generation, validate:

| Check            | Rule          | Action                 |
| ---------------- | ------------- | ---------------------- |
| Title length     | ≤70 chars     | Truncate or regenerate |
| Meta length      | ≤160 chars    | Truncate or regenerate |
| Word count       | 350-500 words | Flag for review        |
| Keyword in title | Required      | Flag for review        |
| Phone in body    | Required      | Flag for review        |
| City mentions    | 2+ times      | Flag for review        |
| No placeholders  | No `{{var}}`  | Regenerate             |

---

## Versioning

Store templates with versions:

```
config/prompts/
├── location-keyword-v1.json  ← current (store cities)
├── service-area-v1.json  ← current (nearby cities)
├── restaurant-v1.json
└── legal-v1.json
```

Track which version generated each page for rollback.

---

## Template JSON Format

```json
{
  "pageType": "location-keyword",
  "version": 2,
  "template": "You are an SEO content writer...",
  "requiredVariables": ["business_name", "city", "state", "phone"],
  "optionalVariables": ["years_experience", "differentiators"],
  "wordCountTarget": 400,
  "isActive": true
}
```
