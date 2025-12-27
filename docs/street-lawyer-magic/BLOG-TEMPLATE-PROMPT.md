# Street Lawyer Magic - SEO Blog Template Development

## Task Overview

Design and implement a professional, mobile-responsive blog template for Street Lawyer Magic's 1,734 SEO landing pages. These pages are generated dynamically from content stored in AWS DynamoDB and need to be rendered as static HTML for optimal SEO performance.

---

## Business Context

**Client:** Street Lawyer Magic
**Attorney:** Lonny "The Street Lawyer" Bramzon, Esq.
**Phone:** 240-478-2189
**Email:** lonny@streetlawyermagic.com
**Website:** streetlawyermagic.com

**Practice Areas:** Criminal Defense, DUI Defense, Drug Charges, Cannabis Defense, Personal Injury, Car/Truck/Motorcycle Accidents, Slip and Fall, Medical Malpractice, Wrongful Death, Violent Crimes, Domestic Violence, Sex Crimes, Gun Charges, Federal Criminal Defense, Probation Violation

**Service Area:** 51 cities across Maryland (Montgomery County, Prince George's County, Anne Arundel County, Howard County, Baltimore County)

**Languages:** English and Spanish (867 pages each)

---

## DynamoDB Data Source

### Connection Details

| Property | Value |
|----------|-------|
| **Table ARN** | `arn:aws:dynamodb:us-east-1:752567131183:table/marketbrewer-seo-pages` |
| **Table Name** | `marketbrewer-seo-pages` |
| **Region** | `us-east-1` |
| **Business ID** | `33307749-4e9f-4246-9a5b-6d69fd0a6913` |

### Key Schema

- **Partition Key (PK):** `businessId` (String)
- **Sort Key (SK):** `pageSlug` (String) - format: `{serviceSlug}/{citySlug}`

### Item Structure

Each page item contains the following attributes:

```json
{
  "businessId": "33307749-4e9f-4246-9a5b-6d69fd0a6913",
  "pageSlug": "cannabis-defense/annapolis-md",
  "status": "generated",
  "language": "en",
  "serviceSlug": "cannabis-defense",
  "citySlug": "annapolis-md",
  "generatedAt": "2025-12-23T11:42:07.921Z",
  "content": {
    "seo": {
      "title": "Cannabis Defense in Annapolis, MD | Street Lawyer Magic",
      "meta_description": "Trust Lonny Bramzon at Street Lawyer Magic for expert cannabis defense in Annapolis, MD. Call us now at 240-478-2189.",
      "keywords": ["cannabis defense attorney", "marijuana lawyer annapolis md", "medical marijuana law"],
      "language": "en"
    },
    "location": {
      "service": "Cannabis Defense",
      "serviceSlug": "cannabis-defense",
      "city": "Annapolis",
      "citySlug": "annapolis-md",
      "state": "MD",
      "stateSlug": "md"
    },
    "h1": "Cannabis Defense in Annapolis, MD",
    "sections": [
      {
        "heading": "Expert Cannabis Defense Representation in Annapolis, MD",
        "content": "At Street Lawyer Magic, we understand the complexities of cannabis law and its impact on individuals and businesses in Maryland. Our experienced attorney, Lonny Bramzon, is dedicated to providing top-notch defense representation for those facing charges related to marijuana possession, cultivation, or distribution. With a deep understanding of state and federal laws, we will work tirelessly to protect your rights and freedoms."
      },
      {
        "heading": "Local Expertise in Annapolis, MD",
        "content": "As a seasoned attorney with years of experience practicing law in Maryland, Lonny Bramzon has developed a unique understanding of the local court system and its nuances. He has successfully defended numerous clients facing cannabis-related charges in Annapolis and surrounding areas, earning a reputation as a trusted and effective advocate for those in need."
      },
      {
        "heading": "Get Expert Cannabis Defense Representation Today",
        "content": "Don't face cannabis charges alone. At Street Lawyer Magic, we are committed to providing exceptional defense representation that will protect your rights and freedoms. Contact us today at 240-478-2189 or schedule a consultation with Lonny Bramzon to discuss your case and learn more about our services."
      }
    ],
    "related_services": ["dui-defense", "traffic-ticket-defense", "criminal-law"]
  }
}
```

---

## Template Requirements

### 1. SEO Optimization (Critical)

- **Title Tag:** Use `content.seo.title`
- **Meta Description:** Use `content.seo.meta_description` (150 chars with phone)
- **Keywords Meta:** Use `content.seo.keywords[]`
- **Canonical URL:** `https://streetlawyermagic.com/{serviceSlug}/{citySlug}`
- **Language Attribute:** `<html lang="en">` or `<html lang="es">`
- **Hreflang Tags:** Link English/Spanish alternate versions
- **Schema.org Markup:** LegalService structured data (see below)

### 2. Page Structure

```
Header (sticky)
├── Logo (links to home)
├── Navigation (Practice Areas, About, Contact)
├── Phone CTA button
└── Language Toggle (EN/ES)

Main Content
├── Breadcrumbs (Home > Service > City)
├── Hero Section
│   ├── H1 (content.h1)
│   ├── Subtitle/tagline
│   └── Primary CTA (phone button)
├── Content Sections (3x)
│   ├── H2 heading (sections[].heading)
│   └── Paragraph (sections[].content)
├── Related Services sidebar/section
│   └── Links to related_services[] in same city
├── CTA Section
│   ├── "Contact Us Today"
│   ├── Phone button
│   └── Contact form link
└── Attorney Bio snippet (optional)

Footer
├── Business info (name, address, phone, email)
├── Practice area links
├── Legal disclaimer
└── Copyright
```

### 3. Design Guidelines

**Brand Colors:**
- Primary Dark: `#1a1a2e` (dark navy)
- Accent: `#e94560` (red/crimson)
- Secondary: `#16213e` (deep blue)
- Text: `#333333`
- Background: `#ffffff`

**Typography:**
- Headings: Bold, professional serif or sans-serif
- Body: Clean, readable sans-serif (16px minimum)
- Line height: 1.6-1.8 for readability

**Visual Elements:**
- Professional, trustworthy legal aesthetic
- Subtle gradients on hero sections
- Icon accents for features/benefits
- High contrast for accessibility (WCAG AA)

### 4. Mobile Responsiveness

- Mobile-first design approach
- Sticky phone button on mobile
- Collapsible navigation
- Touch-friendly CTA buttons (min 44px)
- Readable text without zooming

### 5. Performance

- Target: < 3s load time
- Minimize CSS/JS
- Lazy load images
- Static HTML generation (no client-side rendering)

---

## Schema.org Structured Data

Include this JSON-LD in the `<head>`:

```json
{
  "@context": "https://schema.org",
  "@type": "LegalService",
  "name": "Street Lawyer Magic",
  "description": "{content.seo.meta_description}",
  "url": "https://streetlawyermagic.com/{serviceSlug}/{citySlug}",
  "telephone": "+1-240-478-2189",
  "email": "lonny@streetlawyermagic.com",
  "areaServed": {
    "@type": "City",
    "name": "{content.location.city}",
    "containedInPlace": {
      "@type": "State",
      "name": "Maryland"
    }
  },
  "serviceType": "{content.location.service}",
  "priceRange": "$$",
  "founder": {
    "@type": "Person",
    "name": "Lonny Bramzon",
    "jobTitle": "Attorney at Law"
  },
  "sameAs": [
    "https://www.facebook.com/streetlawyermagic",
    "https://www.instagram.com/streetlawyermagic"
  ]
}
```

---

## Bilingual Support

### English Pages
- URL: `/criminal-defense/silver-spring-md`
- Navigation: Home, Practice Areas, About, Contact
- CTA: "Call Now for a Free Consultation"
- Footer disclaimer: "Attorney Advertising. Past results do not guarantee future outcomes."

### Spanish Pages
- URL: `/defensa-criminal/silver-spring-md`
- Navigation: Inicio, Áreas de Práctica, Sobre Nosotros, Contacto
- CTA: "Llame Ahora para una Consulta Gratuita"
- Footer disclaimer: "Publicidad de Abogados. Los resultados pasados no garantizan resultados futuros."

### Language Toggle
- Add toggle in header to switch between EN/ES versions
- Use hreflang for SEO cross-linking

---

## File Export & Build Process

### Step 1: Export Pages from DynamoDB

```bash
# Using AWS CLI
aws dynamodb query \
  --table-name marketbrewer-seo-pages \
  --key-condition-expression "businessId = :bid" \
  --expression-attribute-values '{":bid":{"S":"33307749-4e9f-4246-9a5b-6d69fd0a6913"}}' \
  --region us-east-1 \
  --output json > all-pages.json
```

### Step 2: Generate Static HTML

Use Webpack, Next.js SSG, or custom Node.js script to:
1. Read page content from JSON
2. Apply template
3. Output static HTML files

### Step 3: Directory Structure

```
dist/
├── index.html
├── criminal-defense/
│   ├── silver-spring-md/index.html
│   ├── bethesda-md/index.html
│   └── ...
├── defensa-criminal/
│   ├── silver-spring-md/index.html
│   └── ...
└── css/
    └── styles.css
```

---

## Page Count Summary

| Category | Count |
|----------|-------|
| English Pages | 867 |
| Spanish Pages | 867 |
| **Total Pages** | **1,734** |
| Services | 17 |
| Cities | 51 |

---

## Deliverables

1. **HTML Template** - Single reusable template with placeholders for dynamic content
2. **CSS Stylesheet** - Responsive styles matching brand guidelines
3. **Build Script** - Node.js/Webpack script to generate all 1,734 pages
4. **Documentation** - Instructions for regenerating pages when content updates

---

## Example Output

For the page `cannabis-defense/annapolis-md`, the generated HTML should look like:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cannabis Defense in Annapolis, MD | Street Lawyer Magic</title>
  <meta name="description" content="Trust Lonny Bramzon at Street Lawyer Magic for expert cannabis defense in Annapolis, MD. Call us now at 240-478-2189.">
  <meta name="keywords" content="cannabis defense attorney, marijuana lawyer annapolis md, medical marijuana law">
  <link rel="canonical" href="https://streetlawyermagic.com/cannabis-defense/annapolis-md">
  <link rel="alternate" hreflang="es" href="https://streetlawyermagic.com/defensa-de-cannabis/annapolis-md">

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "LegalService",
    "name": "Street Lawyer Magic",
    ...
  }
  </script>

  <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
  <header class="site-header">
    <nav class="navbar">
      <a href="/" class="logo">Street Lawyer Magic</a>
      <ul class="nav-links">
        <li><a href="/practice-areas">Practice Areas</a></li>
        <li><a href="/about">About</a></li>
        <li><a href="/contact">Contact</a></li>
      </ul>
      <a href="tel:2404782189" class="cta-phone">240-478-2189</a>
    </nav>
  </header>

  <main class="seo-page">
    <nav class="breadcrumbs">
      <ol>
        <li><a href="/">Home</a></li>
        <li><a href="/cannabis-defense">Cannabis Defense</a></li>
        <li>Annapolis, MD</li>
      </ol>
    </nav>

    <section class="hero">
      <h1>Cannabis Defense in Annapolis, MD</h1>
      <p class="hero-subtitle">Experienced Legal Defense When You Need It Most</p>
      <a href="tel:2404782189" class="cta-button">Call 240-478-2189</a>
    </section>

    <article class="content">
      <section class="content-section">
        <h2>Expert Cannabis Defense Representation in Annapolis, MD</h2>
        <p>At Street Lawyer Magic, we understand the complexities of cannabis law...</p>
      </section>

      <section class="content-section">
        <h2>Local Expertise in Annapolis, MD</h2>
        <p>As a seasoned attorney with years of experience practicing law in Maryland...</p>
      </section>

      <section class="content-section">
        <h2>Get Expert Cannabis Defense Representation Today</h2>
        <p>Don't face cannabis charges alone. At Street Lawyer Magic, we are committed...</p>
      </section>
    </article>

    <aside class="related-services">
      <h3>Related Services in Annapolis</h3>
      <ul>
        <li><a href="/dui-defense/annapolis-md">DUI Defense</a></li>
        <li><a href="/drug-charges-defense/annapolis-md">Drug Charges Defense</a></li>
        <li><a href="/criminal-defense/annapolis-md">Criminal Defense</a></li>
      </ul>
    </aside>

    <section class="cta-section">
      <h2>Contact Street Lawyer Magic Today</h2>
      <p>Get the legal representation you deserve. Call now for a free consultation.</p>
      <a href="tel:2404782189" class="cta-button primary">240-478-2189</a>
      <a href="/contact" class="cta-button secondary">Send Message</a>
    </section>
  </main>

  <footer class="site-footer">
    <div class="footer-content">
      <div class="footer-info">
        <strong>Street Lawyer Magic</strong>
        <p>Lonny "The Street Lawyer" Bramzon, Esq.</p>
        <p>Phone: <a href="tel:2404782189">240-478-2189</a></p>
        <p>Email: <a href="mailto:lonny@streetlawyermagic.com">lonny@streetlawyermagic.com</a></p>
      </div>
      <div class="footer-disclaimer">
        <p>Attorney Advertising. Past results do not guarantee future outcomes.</p>
        <p>&copy; 2025 Street Lawyer Magic. All rights reserved.</p>
      </div>
    </div>
  </footer>
</body>
</html>
```

---

## Questions to Consider

1. Should the template include a contact form on each page, or just link to a central contact page?
2. Do you want an attorney photo/bio section on each landing page?
3. Should there be testimonials or trust badges?
4. Do you need a sitemap.xml generator for all 1,734 pages?
5. Any specific fonts or icon libraries preferred?

---

## Resources

- [DynamoDB Integration Guide](./WEBPACK-PAGE-INTEGRATION.md)
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/)
- [Schema.org LegalService](https://schema.org/LegalService)
- [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
