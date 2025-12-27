# Street Lawyer Magic - AI Coding Instructions

This document instructs how to integrate generated SEO content from the MarketBrewer SEO Platform into the Street Lawyer Magic static website.

---

## Business Context

**Street Lawyer Magic** is a criminal defense law firm serving the DC, Maryland, and Virginia (DMV) metro area.

| Field | Value |
|-------|-------|
| Business Name | Street Lawyer Magic |
| Attorney | Lonny "The Street Lawyer" Bramzon, Esq. |
| Industry | Legal Services |
| Practice Areas | Criminal Defense, Cannabis Law |
| Phone | 240-478-2189 |
| Email | lonny@streetlawyermagic.com |
| Service Area | DC, MD, VA (DMV Metro) |
| Experience | 4,000+ cases since 2005 |
| Education | Stanford (BA Sociology), Columbia Law (JD) |

---

## MarketBrewer SEO Platform Overview

The MarketBrewer SEO Platform generates SEO-optimized JSON content for service-area landing pages. It does NOT host or render websites - it produces JSON files for consumption by static site generators.

### Architecture

```
┌─────────────────────────────────────────────────┐
│              MARKETBREWER DASHBOARD              │
│           (Configure Keywords & Areas)           │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│                 API SERVER (EC2)                 │
│          Express + SQLite + Job Queue            │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│                   WORKER (EC2)                   │
│           Ollama LLM Content Generation          │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│                  OUTPUT JSON                     │
│           ./output/{business_id}/pages/          │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│          WEBPACK STATIC SITE GENERATOR           │
│        Consumes JSON → Produces HTML Pages       │
└─────────────────────────────────────────────────┘
```

---

## Generated Content Structure

Each page generates a JSON file with this structure:

```json
{
  "title": "Criminal Defense Attorney Silver Spring MD | Street Lawyer Magic",
  "meta_description": "Experienced criminal defense attorney serving Silver Spring, MD. Lonny Bramzon has handled 4,000+ cases. Call 240-478-2189 for a free consultation.",
  "h1": "Criminal Defense Attorney in Silver Spring, Maryland",
  "body": "When facing criminal charges in Silver Spring, MD, you need an experienced defense attorney who understands Montgomery County courts...",
  "sections": [
    {
      "heading": "Why Choose Street Lawyer Magic",
      "content": "Attorney Lonny Bramzon brings 19+ years of criminal defense experience..."
    },
    {
      "heading": "Practice Areas We Handle",
      "content": "DUI/DWI, drug charges, assault, theft, traffic violations..."
    },
    {
      "heading": "Contact Our Silver Spring Office",
      "content": "Call 240-478-2189 for a confidential consultation..."
    }
  ],
  "cta": {
    "text": "Free Consultation",
    "url": "/contact"
  }
}
```

---

## URL Path Structure

Pages follow the pattern: `/{keyword-slug}/{location-slug}`

### Examples for Street Lawyer Magic

| Keyword | Location | URL Path |
|---------|----------|----------|
| Criminal Defense Attorney | Silver Spring MD | `/criminal-defense-attorney/silver-spring-md` |
| DUI Lawyer | Bethesda MD | `/dui-lawyer/bethesda-md` |
| Drug Crime Attorney | Washington DC | `/drug-crime-attorney/washington-dc` |
| Cannabis Lawyer | Alexandria VA | `/cannabis-lawyer/alexandria-va` |
| Assault Defense | Rockville MD | `/assault-defense/rockville-md` |

---

## Template Variables

The worker substitutes these variables in prompt templates:

### Core Business Variables

| Variable | Example Value |
|----------|---------------|
| `{{business_name}}` | Street Lawyer Magic |
| `{{industry}}` | Legal Services |
| `{{phone}}` | 240-478-2189 |
| `{{email}}` | lonny@streetlawyermagic.com |
| `{{website}}` | streetlawyermagic.com |

### Location Variables

| Variable | Example Value |
|----------|---------------|
| `{{city}}` | Silver Spring |
| `{{state}}` | MD |
| `{{primary_city}}` | Silver Spring |
| `{{primary_state}}` | MD |

### Keyword Variables

| Variable | Example Value |
|----------|---------------|
| `{{keyword}}` | Criminal Defense Attorney |
| `{{primary_keyword}}` | Criminal Defense Attorney |
| `{{url_path}}` | /criminal-defense-attorney/silver-spring-md |

### Questionnaire Variables

| Variable | Example Value |
|----------|---------------|
| `{{owner_name}}` | Lonny Bramzon |
| `{{tagline}}` | Dazzling trial skills, shockingly good results |
| `{{years_experience}}` | 19 |
| `{{year_established}}` | 2005 |
| `{{target_audience}}` | Individuals facing criminal charges in the DMV area |
| `{{voice_tone}}` | Confident, authoritative, approachable |
| `{{cta_text}}` | Free Consultation |

### Legal-Specific Variables

| Variable | Example Value |
|----------|---------------|
| `{{practice_area}}` | Criminal Defense |
| `{{attorney_name}}` | Lonny Bramzon, Esq. |
| `{{primary_service}}` | Criminal Defense |
| `{{services_list}}` | Criminal Defense, DUI/DWI, Drug Crimes, Cannabis Law |

---

## Webpack Integration

The static site generator reads JSON from `./output/{business_id}/pages/` and produces HTML.

### Directory Structure

```
street-lawyer-magic-website/
├── src/
│   ├── templates/
│   │   ├── service-area-page.tsx    # Template for generated pages
│   │   └── layout.tsx               # Shared layout
│   ├── content/                     # Copied from MarketBrewer output
│   │   └── pages/
│   │       ├── criminal-defense-attorney/
│   │       │   ├── silver-spring-md.json
│   │       │   ├── bethesda-md.json
│   │       │   └── washington-dc.json
│   │       └── dui-lawyer/
│   │           ├── rockville-md.json
│   │           └── alexandria-va.json
│   └── index.tsx
├── webpack/
│   ├── webpack.common.ts
│   ├── webpack.dev.ts
│   └── webpack.prod.ts
└── dist/                            # Built static HTML
```

### Page Generation Flow

1. **MarketBrewer Worker** generates JSON content via Ollama
2. **Export Script** writes JSON to `./output/{business_id}/pages/`
3. **Copy to Website** JSON files copied to `src/content/pages/`
4. **Webpack Build** reads JSON, applies template, outputs HTML

### Webpack Plugin Example

```typescript
// webpack/plugins/page-generator.ts
import * as fs from 'fs';
import * as path from 'path';

interface PageContent {
  title: string;
  meta_description: string;
  h1: string;
  body: string;
  sections: Array<{ heading: string; content: string }>;
  cta: { text: string; url: string };
}

export class ServiceAreaPagePlugin {
  private contentDir: string;

  constructor(contentDir: string) {
    this.contentDir = contentDir;
  }

  apply(compiler: any) {
    compiler.hooks.emit.tapAsync('ServiceAreaPagePlugin', (compilation: any, callback: any) => {
      const pages = this.loadAllPages();

      pages.forEach(({ urlPath, content }) => {
        const html = this.renderPage(content);
        const outputPath = `${urlPath}/index.html`;

        compilation.assets[outputPath] = {
          source: () => html,
          size: () => html.length
        };
      });

      callback();
    });
  }

  private loadAllPages(): Array<{ urlPath: string; content: PageContent }> {
    const pages: Array<{ urlPath: string; content: PageContent }> = [];

    // Read all JSON files from content directory
    const keywords = fs.readdirSync(this.contentDir);

    keywords.forEach(keyword => {
      const keywordDir = path.join(this.contentDir, keyword);
      if (!fs.statSync(keywordDir).isDirectory()) return;

      const locations = fs.readdirSync(keywordDir)
        .filter(f => f.endsWith('.json'));

      locations.forEach(locationFile => {
        const location = locationFile.replace('.json', '');
        const filePath = path.join(keywordDir, locationFile);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        pages.push({
          urlPath: `/${keyword}/${location}`,
          content
        });
      });
    });

    return pages;
  }

  private renderPage(content: PageContent): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title}</title>
  <meta name="description" content="${content.meta_description}">
</head>
<body>
  <header>
    <nav>
      <a href="/">Street Lawyer Magic</a>
      <a href="/practice-areas">Practice Areas</a>
      <a href="/about">About</a>
      <a href="/contact">Contact</a>
    </nav>
  </header>

  <main>
    <h1>${content.h1}</h1>

    <div class="body-content">
      ${content.body}
    </div>

    ${content.sections.map(section => `
    <section>
      <h2>${section.heading}</h2>
      <p>${section.content}</p>
    </section>
    `).join('')}

    <div class="cta">
      <a href="${content.cta.url}" class="cta-button">${content.cta.text}</a>
      <p>Call <a href="tel:2404782189">240-478-2189</a></p>
    </div>
  </main>

  <footer>
    <p>&copy; Street Lawyer Magic. Attorney Advertising.</p>
  </footer>
</body>
</html>`;
  }
}
```

### Webpack Configuration

```typescript
// webpack/webpack.prod.ts
import { ServiceAreaPagePlugin } from './plugins/page-generator';
import * as path from 'path';

export default {
  mode: 'production',
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: 'bundle.[contenthash].js'
  },
  plugins: [
    new ServiceAreaPagePlugin(
      path.resolve(__dirname, '../src/content/pages')
    )
  ]
};
```

---

## Deployment Workflow

### Step 1: Generate Content (MarketBrewer)

```bash
# On EC2 with MarketBrewer
cd packages/server
npm run start &

cd ../worker
npm run start -- --job-id=<job-id>

# Export completed pages
npm run export -- --business-id=street-lawyer-magic
```

### Step 2: Transfer JSON to Website Repo

```bash
# Copy generated JSON to website
cp -r output/street-lawyer-magic/pages/* \
  ../street-lawyer-magic-website/src/content/pages/
```

### Step 3: Build Static Site

```bash
cd street-lawyer-magic-website
npm run build

# Output in ./dist/
# - /criminal-defense-attorney/silver-spring-md/index.html
# - /dui-lawyer/bethesda-md/index.html
# - etc.
```

### Step 4: Deploy to Hosting

```bash
# Deploy to S3 + CloudFront (example)
aws s3 sync dist/ s3://streetlawyermagic.com --delete
aws cloudfront create-invalidation --distribution-id XXXXX --paths "/*"
```

---

## Legal Content Guidelines

When generating content for Street Lawyer Magic, the LLM prompts enforce:

1. **No outcome guarantees** - Never promise case results
2. **Focus on experience** - Emphasize 4,000+ cases, 19+ years
3. **Local court knowledge** - Reference specific courts (Montgomery County, DC Superior Court)
4. **Credentials over claims** - Stanford/Columbia education, Public Defender background
5. **Attorney advertising disclaimer** - Include in footer

### Example Prompt Template

```
You are writing SEO content for Street Lawyer Magic, a criminal defense law firm.

ATTORNEY: Lonny "The Street Lawyer" Bramzon, Esq.
LOCATION: {{city}}, {{state}}
KEYWORD: {{keyword}}
PHONE: 240-478-2189

CREDENTIALS:
- 4,000+ cases handled since 2005
- Former Public Defender, Baltimore
- Stanford University (BA Sociology)
- Columbia Law School (JD, Human Rights Law emphasis)
- Known for trial skills and negotiation

LEGAL REQUIREMENTS:
- Do NOT guarantee outcomes or results
- Do NOT use phrases like "will win your case"
- Focus on experience, credentials, and approach
- Mention local court familiarity ({{city}} courts, {{state}} jurisdiction)

OUTPUT JSON:
{
  "title": "{{keyword}} {{city}} {{state}} | Street Lawyer Magic",
  "meta_description": "...",
  "h1": "...",
  "body": "...",
  "sections": [...],
  "cta": {"text": "Free Consultation", "url": "/contact"}
}
```

---

## Manifest File

The export generates a manifest for all pages:

```json
{
  "businessId": "street-lawyer-magic",
  "businessName": "Street Lawyer Magic",
  "generatedAt": "2024-12-21T10:00:00Z",
  "totalPages": 150,
  "pages": [
    {
      "urlPath": "/criminal-defense-attorney/silver-spring-md",
      "keyword": "Criminal Defense Attorney",
      "location": "Silver Spring, MD",
      "file": "pages/criminal-defense-attorney/silver-spring-md.json",
      "wordCount": 425,
      "generatedAt": "2024-12-21T09:45:00Z"
    }
  ]
}
```

Use this manifest in Webpack to dynamically generate sitemap.xml and page index.

---

## Summary

1. **MarketBrewer generates JSON** - Content only, no HTML
2. **JSON contains structured SEO content** - title, meta, h1, body, sections, CTA
3. **Webpack reads JSON** - Custom plugin transforms to HTML
4. **Static files deploy** - S3, Netlify, Vercel, or any static host
5. **Legal compliance built-in** - Templates enforce attorney advertising rules

For questions about the MarketBrewer SEO Platform, see the main documentation at `docs/README.md`.
