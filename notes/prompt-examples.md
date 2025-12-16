# Reference: Prompt Template Examples

Sample prompt templates for SEO page generation.

---

## Template Structure

Every prompt should return structured output:

```
- Title (≤70 chars)
- Meta Description (≤160 chars)
- Body (350-450 words, ~500-650 tokens)
```

---

## Service-Location Template

```
You are an SEO content writer for {{business_name}}, a {{industry}} business.

Write a local SEO landing page for the service "{{primary_service}}" targeting customers in {{city}}, {{state}}.

BUSINESS CONTEXT:
- Business Name: {{business_name}}
- Phone: {{phone}}
- Website: {{website}}
- Years Experience: {{years_experience}}
- Key Differentiators: {{differentiators}}

TARGET AUDIENCE:
{{target_audience}}

REQUIREMENTS:
1. Title tag (max 70 characters) - include "{{primary_service}}" and "{{city}}"
2. Meta description (max 160 characters) - compelling, include location
3. Body content (400-450 words):
   - Opening paragraph mentioning {{city}} and the service
   - Why choose {{business_name}} (2-3 paragraphs)
   - Local relevance to {{city}}, {{state}}
   - Clear call-to-action with phone number {{phone}}

TONE: {{tone}}

OUTPUT FORMAT (JSON):
{
  "title": "...",
  "metaDescription": "...",
  "body": "..."
}

IMPORTANT:
- Do NOT use placeholder text
- Do NOT invent facts not provided
- Include {{phone}} naturally once in the body
- Mention {{city}} 2-3 times naturally
```

---

## Keyword-Location Template

```
You are an SEO content writer. Create a landing page optimized for the keyword "{{primary_keyword}}" targeting searchers in {{city}}, {{state}}.

BUSINESS:
- Name: {{business_name}}
- Industry: {{industry}}
- Phone: {{phone}}
- Unique Value: {{differentiators}}

SEARCH INTENT:
Someone searching "{{primary_keyword}} {{city}}" is likely looking for: {{search_intent}}

REQUIREMENTS:
1. Title (max 70 chars): Include "{{primary_keyword}}" and "{{city}}"
2. Meta description (max 160 chars): Address search intent, include CTA
3. Body (400-450 words):
   - Answer the search intent immediately
   - Position {{business_name}} as the solution
   - Include local context for {{city}}
   - End with CTA: "{{cta_text}}"

OUTPUT FORMAT (JSON):
{
  "title": "...",
  "metaDescription": "...", 
  "body": "..."
}

Write naturally. Avoid keyword stuffing.
```

---

## Restaurant Template (Nash & Smashed)

```
Write a local SEO page for {{business_name}}, a {{cuisine_type}} restaurant in {{city}}, {{state}}.

RESTAURANT DETAILS:
- Name: {{business_name}}
- Cuisine: {{cuisine_type}}
- Specialty: {{menu_highlights}}
- Dietary Options: {{dietary_options}}
- Phone: {{phone}}

TARGET KEYWORD: {{primary_keyword}}

Create content that:
1. Highlights the {{dietary_options}} options (especially Halal)
2. Mentions signature dishes
3. Appeals to locals in {{city}}
4. Includes phone number for orders

OUTPUT FORMAT (JSON):
{
  "title": "...",
  "metaDescription": "...",
  "body": "..."
}
```

---

## Legal Services Template (Street Lawyer Magic)

```
Write a local SEO page for {{attorney_name}}, a {{practice_area}} attorney serving {{city}}, {{state}}.

ATTORNEY DETAILS:
- Name: {{attorney_name}}
- Firm: {{business_name}}
- Practice Area: {{practice_area}}
- Experience: {{experience_metrics}}
- Education: {{education}}
- Phone: {{phone}}

TARGET KEYWORD: {{primary_keyword}}

IMPORTANT LEGAL NOTES:
- Do NOT guarantee outcomes
- Include disclaimer if provided: {{legal_disclaimer}}
- Focus on experience and credentials

Create content that:
1. Addresses common concerns for {{practice_area}} cases
2. Highlights attorney's credentials
3. Emphasizes local knowledge of {{city}} courts/laws
4. Includes consultation CTA

OUTPUT FORMAT (JSON):
{
  "title": "...",
  "metaDescription": "...",
  "body": "..."
}
```

---

## Quality Validation Rules

After generation, validate:

| Check | Rule | Action if Failed |
|-------|------|------------------|
| Title length | ≤ 70 chars | Truncate or regenerate |
| Meta length | ≤ 160 chars | Truncate or regenerate |
| Word count | 350-500 words | Flag for review |
| Keyword present | In title + 2x in body | Flag for review |
| Phone present | Appears in body | Flag for review |
| City mention | 2+ times in body | Flag for review |
| No placeholders | No {{var}} in output | Regenerate |

---

## Prompt Versioning

Store templates with version numbers:

```
prompt_templates/
├── service-location-v1.txt
├── service-location-v2.txt  (current)
├── keyword-location-v1.txt  (current)
├── restaurant-v1.txt
└── legal-v1.txt
```

Track which version generated each page for rollback capability.
