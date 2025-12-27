# Street Lawyer Magic - SEO Page Webpack Integration

This document provides instructions for integrating generated SEO pages from DynamoDB into the Street Lawyer Magic static website using Webpack.

---

## DynamoDB Table Details

**Table ARN:** `arn:aws:dynamodb:us-east-1:752567131183:table/marketbrewer-seo-pages`

**Table Name:** `marketbrewer-seo-pages`

**Region:** `us-east-1`

### Key Schema

| Key | Type | Description |
|-----|------|-------------|
| `businessId` (PK) | String | Business identifier (e.g., `33307749-4e9f-4246-9a5b-6d69fd0a6913`) |
| `pageSlug` (SK) | String | URL path slug (e.g., `criminal-defense/silver-spring-md`) |

### Item Attributes

Each item in the table contains:

```typescript
interface SEOPageItem {
  // Keys
  businessId: string;           // "33307749-4e9f-4246-9a5b-6d69fd0a6913"
  pageSlug: string;             // "criminal-defense/silver-spring-md"

  // Metadata
  status: string;               // "generated"
  language: string;             // "en" or "es"
  serviceSlug: string;          // "criminal-defense"
  citySlug: string;             // "silver-spring-md"
  generatedAt: string;          // ISO timestamp

  // Content (nested object)
  content: {
    seo: {
      title: string;            // "Criminal Defense in Silver Spring, MD | Street Lawyer Magic"
      meta_description: string; // "Experienced criminal defense attorney..."
      keywords: string[];       // ["criminal defense", "silver spring", ...]
      language: string;         // "en" or "es"
    };
    location: {
      service: string;          // "Criminal Defense"
      serviceSlug: string;      // "criminal-defense"
      city: string;             // "Silver Spring"
      citySlug: string;         // "silver-spring-md"
      state: string;            // "MD"
      stateSlug: string;        // "md"
    };
    h1: string;                 // "Criminal Defense in Silver Spring, MD"
    sections: Array<{
      heading: string;          // H2 heading
      content: string;          // Paragraph content (100-130 words)
    }>;
    related_services: string[]; // ["dui-defense", "drug-charges-defense"]
  };
}
```

---

## Fetching Pages from DynamoDB

### Option 1: Build-Time Fetch (Recommended)

Create a script to export all pages to JSON files during build:

```typescript
// scripts/export-pages.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import * as fs from 'fs';
import * as path from 'path';

const BUSINESS_ID = '33307749-4e9f-4246-9a5b-6d69fd0a6913';
const OUTPUT_DIR = './src/content/pages';

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: 'us-east-1' })
);

async function exportPages() {
  let lastKey: any = undefined;
  const pages: any[] = [];

  do {
    const result = await client.send(new QueryCommand({
      TableName: 'marketbrewer-seo-pages',
      KeyConditionExpression: 'businessId = :bid',
      ExpressionAttributeValues: { ':bid': BUSINESS_ID },
      ExclusiveStartKey: lastKey,
    }));

    pages.push(...(result.Items || []));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  console.log(`Fetched ${pages.length} pages`);

  // Write each page to a JSON file
  for (const page of pages) {
    const [serviceSlug, citySlug] = page.pageSlug.split('/');
    const dir = path.join(OUTPUT_DIR, serviceSlug);

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, `${citySlug}.json`),
      JSON.stringify(page.content, null, 2)
    );
  }

  // Write manifest
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'manifest.json'),
    JSON.stringify({
      businessId: BUSINESS_ID,
      totalPages: pages.length,
      exportedAt: new Date().toISOString(),
      pages: pages.map(p => ({
        slug: p.pageSlug,
        language: p.language,
        service: p.content.location.service,
        city: p.content.location.city,
      }))
    }, null, 2)
  );

  console.log(`Exported to ${OUTPUT_DIR}`);
}

exportPages();
```

### Option 2: AWS CLI Export

```bash
# Export all pages for Street Lawyer Magic
aws dynamodb query \
  --table-name marketbrewer-seo-pages \
  --key-condition-expression "businessId = :bid" \
  --expression-attribute-values '{":bid":{"S":"33307749-4e9f-4246-9a5b-6d69fd0a6913"}}' \
  --region us-east-1 \
  --output json > pages.json
```

---

## Webpack Page Generator Plugin

### Directory Structure

```
street-lawyer-magic/
├── src/
│   ├── content/
│   │   └── pages/
│   │       ├── manifest.json
│   │       ├── criminal-defense/
│   │       │   ├── silver-spring-md.json
│   │       │   ├── bethesda-md.json
│   │       │   └── ...
│   │       ├── dui-defense/
│   │       │   └── ...
│   │       └── defensa-criminal/  (Spanish)
│   │           └── ...
│   ├── templates/
│   │   ├── seo-page.tsx
│   │   └── seo-page-es.tsx
│   └── index.tsx
├── webpack/
│   ├── webpack.common.ts
│   ├── webpack.prod.ts
│   └── plugins/
│       └── seo-page-generator.ts
└── dist/
```

### Webpack Plugin

```typescript
// webpack/plugins/seo-page-generator.ts
import * as fs from 'fs';
import * as path from 'path';
import { Compilation, Compiler } from 'webpack';

interface PageContent {
  seo: {
    title: string;
    meta_description: string;
    keywords: string[];
    language: string;
  };
  location: {
    service: string;
    serviceSlug: string;
    city: string;
    citySlug: string;
    state: string;
    stateSlug: string;
  };
  h1: string;
  sections: Array<{ heading: string; content: string }>;
  related_services: string[];
}

export class SEOPageGeneratorPlugin {
  private contentDir: string;

  constructor(options: { contentDir: string }) {
    this.contentDir = options.contentDir;
  }

  apply(compiler: Compiler) {
    compiler.hooks.thisCompilation.tap('SEOPageGeneratorPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'SEOPageGeneratorPlugin',
          stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
        },
        () => {
          const pages = this.loadAllPages();

          for (const { urlPath, content, language } of pages) {
            const html = this.renderPage(content, language);
            const outputPath = `${urlPath}/index.html`;

            compilation.emitAsset(
              outputPath,
              new compiler.webpack.sources.RawSource(html)
            );
          }

          console.log(`Generated ${pages.length} SEO pages`);
        }
      );
    });
  }

  private loadAllPages(): Array<{ urlPath: string; content: PageContent; language: string }> {
    const pages: Array<{ urlPath: string; content: PageContent; language: string }> = [];
    const services = fs.readdirSync(this.contentDir).filter(
      f => fs.statSync(path.join(this.contentDir, f)).isDirectory()
    );

    for (const service of services) {
      const serviceDir = path.join(this.contentDir, service);
      const cities = fs.readdirSync(serviceDir).filter(f => f.endsWith('.json'));

      for (const cityFile of cities) {
        const city = cityFile.replace('.json', '');
        const content: PageContent = JSON.parse(
          fs.readFileSync(path.join(serviceDir, cityFile), 'utf-8')
        );

        pages.push({
          urlPath: `/${service}/${city}`,
          content,
          language: content.seo.language,
        });
      }
    }

    return pages;
  }

  private renderPage(content: PageContent, language: string): string {
    const isSpanish = language === 'es';

    return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(content.seo.title)}</title>
  <meta name="description" content="${this.escapeHtml(content.seo.meta_description)}">
  <meta name="keywords" content="${content.seo.keywords.join(', ')}">
  <link rel="canonical" href="https://streetlawyermagic.com/${content.location.serviceSlug}/${content.location.citySlug}">
  ${isSpanish ? '<link rel="alternate" hreflang="en" href="https://streetlawyermagic.com/...">' : ''}

  <!-- Schema.org LocalBusiness -->
  <script type="application/ld+json">
  ${JSON.stringify(this.generateSchema(content), null, 2)}
  </script>

  <link rel="stylesheet" href="/css/main.css">
</head>
<body>
  <header>
    <nav class="navbar">
      <a href="/" class="logo">Street Lawyer Magic</a>
      <ul class="nav-links">
        <li><a href="/practice-areas">${isSpanish ? 'Áreas de Práctica' : 'Practice Areas'}</a></li>
        <li><a href="/about">${isSpanish ? 'Sobre Nosotros' : 'About'}</a></li>
        <li><a href="/contact">${isSpanish ? 'Contacto' : 'Contact'}</a></li>
        <li><a href="tel:2404782189" class="phone-link">240-478-2189</a></li>
      </ul>
    </nav>
  </header>

  <main class="seo-page">
    <!-- Breadcrumbs -->
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        <li><a href="/">${isSpanish ? 'Inicio' : 'Home'}</a></li>
        <li><a href="/${content.location.serviceSlug}">${content.location.service}</a></li>
        <li aria-current="page">${content.location.city}, ${content.location.state}</li>
      </ol>
    </nav>

    <!-- Hero Section -->
    <section class="hero">
      <h1>${this.escapeHtml(content.h1)}</h1>
      <p class="hero-subtitle">
        ${isSpanish ? 'Llame ahora para una consulta gratuita' : 'Call now for a free consultation'}
      </p>
      <a href="tel:2404782189" class="cta-button">240-478-2189</a>
    </section>

    <!-- Content Sections -->
    <article class="content">
      ${content.sections.map(section => `
      <section class="content-section">
        <h2>${this.escapeHtml(section.heading)}</h2>
        <p>${this.escapeHtml(section.content)}</p>
      </section>
      `).join('')}
    </article>

    <!-- Related Services -->
    <aside class="related-services">
      <h3>${isSpanish ? 'Servicios Relacionados' : 'Related Services'}</h3>
      <ul>
        ${content.related_services.map(slug => `
        <li><a href="/${slug}/${content.location.citySlug}">${this.slugToTitle(slug)}</a></li>
        `).join('')}
      </ul>
    </aside>

    <!-- CTA Section -->
    <section class="cta-section">
      <h2>${isSpanish ? 'Contáctenos Hoy' : 'Contact Us Today'}</h2>
      <p>${isSpanish
        ? 'Obtenga la representación legal que merece. Llámenos ahora.'
        : 'Get the legal representation you deserve. Call us now.'}</p>
      <div class="cta-buttons">
        <a href="tel:2404782189" class="cta-button primary">240-478-2189</a>
        <a href="/contact" class="cta-button secondary">${isSpanish ? 'Enviar Mensaje' : 'Send Message'}</a>
      </div>
    </section>
  </main>

  <footer>
    <div class="footer-content">
      <div class="footer-info">
        <p><strong>Street Lawyer Magic</strong></p>
        <p>Lonny "The Street Lawyer" Bramzon, Esq.</p>
        <p>Phone: <a href="tel:2404782189">240-478-2189</a></p>
        <p>Email: <a href="mailto:lonny@streetlawyermagic.com">lonny@streetlawyermagic.com</a></p>
      </div>
      <div class="footer-disclaimer">
        <p>${isSpanish
          ? 'Publicidad de Abogados. Los resultados pasados no garantizan resultados futuros.'
          : 'Attorney Advertising. Past results do not guarantee future outcomes.'}</p>
        <p>&copy; ${new Date().getFullYear()} Street Lawyer Magic. All rights reserved.</p>
      </div>
    </div>
  </footer>

  <script src="/js/main.js"></script>
</body>
</html>`;
  }

  private generateSchema(content: PageContent): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'LegalService',
      name: 'Street Lawyer Magic',
      description: content.seo.meta_description,
      url: `https://streetlawyermagic.com/${content.location.serviceSlug}/${content.location.citySlug}`,
      telephone: '+1-240-478-2189',
      email: 'lonny@streetlawyermagic.com',
      areaServed: {
        '@type': 'City',
        name: content.location.city,
        containedInPlace: {
          '@type': 'State',
          name: content.location.state,
        },
      },
      serviceType: content.location.service,
      priceRange: '$$',
      founder: {
        '@type': 'Person',
        name: 'Lonny Bramzon',
        jobTitle: 'Attorney',
      },
    };
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private slugToTitle(slug: string): string {
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
```

### Webpack Configuration

```typescript
// webpack/webpack.prod.ts
import path from 'path';
import { SEOPageGeneratorPlugin } from './plugins/seo-page-generator';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

export default {
  mode: 'production',
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: 'js/[name].[contenthash].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
    }),
    new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash].css',
    }),
    new SEOPageGeneratorPlugin({
      contentDir: path.resolve(__dirname, '../src/content/pages'),
    }),
  ],
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
};
```

---

## Build & Deploy Workflow

### 1. Export Pages from DynamoDB

```bash
# Install dependencies
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb

# Run export script
npx ts-node scripts/export-pages.ts
```

### 2. Build Static Site

```bash
npm run build
```

### 3. Deploy to Hosting

```bash
# Deploy to S3 + CloudFront
aws s3 sync dist/ s3://streetlawyermagic.com --delete
aws cloudfront create-invalidation --distribution-id XXXXX --paths "/*"
```

---

## Page URL Structure

| Language | Service | City | URL |
|----------|---------|------|-----|
| English | Criminal Defense | Silver Spring, MD | `/criminal-defense/silver-spring-md` |
| English | DUI Defense | Bethesda, MD | `/dui-defense/bethesda-md` |
| Spanish | Defensa Criminal | Silver Spring, MD | `/defensa-criminal/silver-spring-md` |
| Spanish | Defensa de DUI | Bethesda, MD | `/defensa-de-dui/bethesda-md` |

---

## CSS Styling (Recommended)

```css
/* src/css/seo-page.css */

.seo-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.hero {
  text-align: center;
  padding: 4rem 2rem;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: white;
  border-radius: 8px;
  margin-bottom: 3rem;
}

.hero h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.content-section {
  margin-bottom: 2.5rem;
}

.content-section h2 {
  color: #1a1a2e;
  font-size: 1.75rem;
  margin-bottom: 1rem;
  border-left: 4px solid #e94560;
  padding-left: 1rem;
}

.content-section p {
  line-height: 1.8;
  color: #333;
}

.cta-button {
  display: inline-block;
  padding: 1rem 2rem;
  background: #e94560;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-weight: bold;
  transition: background 0.3s;
}

.cta-button:hover {
  background: #d63851;
}

.cta-button.secondary {
  background: transparent;
  border: 2px solid #e94560;
  color: #e94560;
}

.breadcrumbs {
  margin-bottom: 2rem;
}

.breadcrumbs ol {
  display: flex;
  list-style: none;
  padding: 0;
  gap: 0.5rem;
}

.breadcrumbs li:not(:last-child)::after {
  content: '›';
  margin-left: 0.5rem;
}

.related-services {
  background: #f8f9fa;
  padding: 2rem;
  border-radius: 8px;
  margin: 2rem 0;
}

.related-services ul {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  list-style: none;
  padding: 0;
}

.related-services a {
  display: block;
  padding: 0.75rem 1.5rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-decoration: none;
  color: #1a1a2e;
}

.cta-section {
  text-align: center;
  padding: 4rem 2rem;
  background: #1a1a2e;
  color: white;
  border-radius: 8px;
  margin-top: 3rem;
}

.cta-buttons {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
}
```

---

## Total Pages Generated

- **English Pages:** 867 (17 services × 51 cities)
- **Spanish Pages:** 867 (17 services × 51 cities)
- **Total:** 1,734 pages

All pages are stored in DynamoDB and can be exported at any time for static site generation.
