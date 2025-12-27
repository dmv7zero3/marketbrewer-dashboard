#!/usr/bin/env ts-node
/**
 * Generate SEO Pages for Street Lawyer Magic
 *
 * Generates page content using Ollama and outputs in pages.json format
 * compatible with the webpack SEOStaticPagesPlugin.
 *
 * Usage:
 *   npx ts-node scripts/generate-seo-pages.ts --count 4
 *   npx ts-node scripts/generate-seo-pages.ts --all
 */

import * as path from "path";
import * as fs from "fs";
import Database from "better-sqlite3";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../packages/server/.env") });
dotenv.config({ path: path.join(__dirname, "../.env") });

const DB_PATH = path.join(__dirname, "../data/seo-platform.db");
const OUTPUT_DIR = path.join(__dirname, "../generated-pages");

// Ollama configuration
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";

// Site configuration
const SITE_URL = "https://streetlawyermagic.com";
const BUSINESS_PHONE = "240-478-2189";
const BUSINESS_EMAIL = "lonny@streetlawyermagic.com";
const BUSINESS_NAME = "Street Lawyer Magic";

interface ServiceOffering {
  name: string;
  nameEs: string;
  slug: string;
  isPrimary: boolean;
}

interface ServiceArea {
  city: string;
  state: string;
  slug: string;
}

interface GeneratedPage {
  slug: string;
  language: "en" | "es";
  service: {
    name: string;
    nameEs?: string;
    slug: string;
  };
  location: {
    city: string;
    state: string;
    slug: string;
  };
  meta: {
    title: string;
    description: string;
    canonical: string;
    ogImage: string;
    siteUrl: string;
  };
  content: {
    h1: string;
    intro: string;
    sections: Array<{ heading: string; body: string }>;
    cta: string;
  };
  business: {
    name: string;
    phone: string;
    email: string;
  };
  structuredData: object;
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toServiceSlug(serviceName: string, language: "en" | "es"): string {
  // Create SEO-friendly slug like "criminal-defense-lawyer"
  const slug = toSlug(serviceName);
  if (language === "en") {
    return slug.replace(/-defense$/, "-defense-lawyer").replace(/-injury$/, "-injury-lawyer");
  }
  return `abogado-${slug}`;
}

function toCityStateSlug(city: string, state: string): string {
  return `${toSlug(city)}-${state.toLowerCase()}`;
}

async function generateWithOllama(prompt: string): Promise<string> {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        num_predict: 2048,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.response;
}

function buildPrompt(
  service: ServiceOffering,
  location: ServiceArea,
  language: "en" | "es"
): string {
  const serviceName = language === "en" ? service.name : service.nameEs;
  const isSpanish = language === "es";

  return `You are an SEO content writer for a criminal defense law firm. Generate content for a location-specific service page.

## BUSINESS INFO
- Name: Street Lawyer Magic
- Attorney: Lonny "The Street Lawyer" Bramzon, Esq.
- Phone: ${BUSINESS_PHONE}
- Experience: 4,000+ cases since 2005
- Available 24/7 for emergencies

## PAGE TARGET
- Service: ${serviceName}
- Location: ${location.city}, ${location.state}
- Language: ${isSpanish ? "Spanish" : "English"}

## OUTPUT FORMAT
Return a JSON object with this exact structure (no markdown, just raw JSON):

{
  "h1": "Main headline including service and location",
  "intro": "<p>Opening paragraph addressing the reader's situation and introducing the firm. 2-3 sentences. Include HTML tags.</p>",
  "sections": [
    {
      "heading": "Why Choose Street Lawyer Magic",
      "body": "<p>Paragraph about experience, 4,000+ cases, aggressive defense. Include <strong>bold</strong> for emphasis.</p>"
    },
    {
      "heading": "Our ${serviceName} Experience in ${location.city}",
      "body": "<p>Local expertise, knowledge of ${location.state} courts. 2-3 sentences.</p>"
    },
    {
      "heading": "${isSpanish ? "Lo Que Hacemos Por Usted" : "What We Do For You"}",
      "body": "<ul><li>Point 1</li><li>Point 2</li><li>Point 3</li><li>Point 4</li></ul>"
    }
  ],
  "cta": "Call to action text mentioning free consultation",
  "metaDescription": "150-160 character meta description for SEO"
}

IMPORTANT:
- Write entirely in ${isSpanish ? "Spanish" : "English"}
- Include HTML tags in intro and section bodies
- Keep h1 under 70 characters
- Meta description must be 150-160 characters
- Be confident but not guarantee outcomes
- Mention the phone number ${BUSINESS_PHONE} naturally
- Return ONLY valid JSON, no other text`;
}

function parseGeneratedContent(rawContent: string): {
  h1: string;
  intro: string;
  sections: Array<{ heading: string; body: string }>;
  cta: string;
  metaDescription: string;
} {
  // Try to extract JSON from the response
  let jsonStr = rawContent.trim();

  // Remove markdown code blocks if present
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    // Try to find JSON object in the response
    const match = rawContent.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error(`Failed to parse JSON: ${e}`);
  }
}

function buildStructuredData(
  service: ServiceOffering,
  location: ServiceArea,
  language: "en" | "es"
): object {
  const serviceName = language === "en" ? service.name : service.nameEs;

  return {
    "@context": "https://schema.org",
    "@type": "LegalService",
    "name": `${serviceName} - Street Lawyer Magic`,
    "description": `${serviceName} in ${location.city}, ${location.state}`,
    "telephone": BUSINESS_PHONE,
    "email": BUSINESS_EMAIL,
    "url": `${SITE_URL}/${toServiceSlug(service.name, language)}/${toCityStateSlug(location.city, location.state)}`,
    "priceRange": "Free Consultation",
    "areaServed": {
      "@type": "City",
      "name": location.city,
      "addressRegion": location.state,
      "addressCountry": "US"
    },
    "provider": {
      "@type": "Attorney",
      "name": "Lonny Bramzon",
      "jobTitle": "Criminal Defense Attorney",
      "telephone": BUSINESS_PHONE
    },
    "serviceType": serviceName,
    "availableLanguage": language === "es" ? ["Spanish", "English"] : ["English", "Spanish"]
  };
}

async function generatePage(
  service: ServiceOffering,
  location: ServiceArea,
  language: "en" | "es"
): Promise<GeneratedPage> {
  const serviceName = language === "en" ? service.name : service.nameEs;
  const serviceSlug = toServiceSlug(service.name, language);
  const locationSlug = toCityStateSlug(location.city, location.state);
  const pageSlug = `${serviceSlug}/${locationSlug}`;

  console.log(`  Generating: ${pageSlug} (${language})...`);

  const prompt = buildPrompt(service, location, language);
  const rawContent = await generateWithOllama(prompt);
  const content = parseGeneratedContent(rawContent);

  // Build the title
  const title = language === "en"
    ? `${serviceName} Lawyer in ${location.city}, ${location.state} | Street Lawyer Magic`
    : `${serviceName} en ${location.city}, ${location.state} | Street Lawyer Magic`;

  return {
    slug: pageSlug,
    language,
    service: {
      name: service.name,
      nameEs: service.nameEs,
      slug: serviceSlug,
    },
    location: {
      city: location.city,
      state: location.state,
      slug: locationSlug,
    },
    meta: {
      title: title.length > 60 ? title.substring(0, 57) + "..." : title,
      description: content.metaDescription,
      canonical: `${SITE_URL}/${pageSlug}`,
      ogImage: "/images/og-image/street-lawyer-magic-og.jpg",
      siteUrl: SITE_URL,
    },
    content: {
      h1: content.h1,
      intro: content.intro,
      sections: content.sections,
      cta: content.cta,
    },
    business: {
      name: BUSINESS_NAME,
      phone: BUSINESS_PHONE,
      email: BUSINESS_EMAIL,
    },
    structuredData: buildStructuredData(service, location, language),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const countArg = args.find(a => a.startsWith("--count="));
  const count = countArg ? parseInt(countArg.split("=")[1]) : 4;
  const generateAll = args.includes("--all");

  console.log("\n=== Street Lawyer Magic SEO Page Generation ===\n");

  const db = new Database(DB_PATH);

  try {
    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Get questionnaire data for services
    const questionnaire = db.prepare(`
      SELECT data FROM questionnaires WHERE business_id = 'street-lawyer-magic'
    `).get() as { data: string } | undefined;

    if (!questionnaire) {
      console.error("Questionnaire not found for street-lawyer-magic");
      process.exit(1);
    }

    const questionnaireData = JSON.parse(questionnaire.data);
    const services: ServiceOffering[] = questionnaireData.services?.offerings || [];

    if (services.length === 0) {
      console.error("No services found in questionnaire");
      process.exit(1);
    }

    // Get service areas
    const serviceAreas = db.prepare(`
      SELECT city, state, slug FROM service_areas
      WHERE business_id = 'street-lawyer-magic'
      ORDER BY priority DESC, city ASC
    `).all() as ServiceArea[];

    if (serviceAreas.length === 0) {
      console.error("No service areas found");
      process.exit(1);
    }

    console.log(`Services: ${services.length}`);
    console.log(`Service Areas: ${serviceAreas.length}`);

    // Test Ollama connection
    console.log(`\nTesting Ollama connection at ${OLLAMA_URL}...`);
    try {
      const healthResponse = await fetch(`${OLLAMA_URL}/api/tags`);
      if (!healthResponse.ok) {
        throw new Error("Failed to connect to Ollama");
      }
      console.log(`Ollama connected. Using model: ${OLLAMA_MODEL}\n`);
    } catch (error) {
      console.error(`Cannot connect to Ollama at ${OLLAMA_URL}`);
      console.error("Please ensure Ollama is running: ollama serve");
      process.exit(1);
    }

    // Determine which pages to generate
    let pagesToGenerate: Array<{ service: ServiceOffering; location: ServiceArea; language: "en" | "es" }> = [];

    if (generateAll) {
      // Generate all combinations
      for (const service of services) {
        for (const location of serviceAreas) {
          pagesToGenerate.push({ service, location, language: "en" });
          pagesToGenerate.push({ service, location, language: "es" });
        }
      }
    } else {
      // Generate sample pages: 2 services × 2 cities × 2 languages = 8 pages
      // But limit to requested count
      const sampleServices = services.slice(0, 2);
      const sampleLocations = serviceAreas.slice(0, 2);

      for (const service of sampleServices) {
        for (const location of sampleLocations) {
          if (pagesToGenerate.length < count / 2) {
            pagesToGenerate.push({ service, location, language: "en" });
          }
          if (pagesToGenerate.length < count) {
            pagesToGenerate.push({ service, location, language: "es" });
          }
        }
      }
    }

    console.log(`Generating ${pagesToGenerate.length} pages...\n`);

    const generatedPages: GeneratedPage[] = [];

    for (let i = 0; i < pagesToGenerate.length; i++) {
      const { service, location, language } = pagesToGenerate[i];
      console.log(`[${i + 1}/${pagesToGenerate.length}]`);

      try {
        const startTime = Date.now();
        const page = await generatePage(service, location, language);
        const duration = Date.now() - startTime;

        generatedPages.push(page);

        // Save individual page for preview
        const pageFilename = `${page.slug.replace(/\//g, "_")}.json`;
        fs.writeFileSync(
          path.join(OUTPUT_DIR, pageFilename),
          JSON.stringify(page, null, 2)
        );

        console.log(`    ✓ Generated in ${(duration / 1000).toFixed(1)}s`);
        console.log(`    Saved: ${pageFilename}\n`);
      } catch (error) {
        console.error(`    ✗ Failed: ${error instanceof Error ? error.message : String(error)}\n`);
      }
    }

    // Generate pages.json for webpack plugin
    const pagesJson = {
      generatedAt: new Date().toISOString(),
      business: "street-lawyer-magic",
      siteUrl: SITE_URL,
      pages: generatedPages,
    };

    const pagesJsonPath = path.join(OUTPUT_DIR, "pages.json");
    fs.writeFileSync(pagesJsonPath, JSON.stringify(pagesJson, null, 2));

    console.log("\n=== Generation Complete ===");
    console.log(`Total pages generated: ${generatedPages.length}`);
    console.log(`Output directory: ${OUTPUT_DIR}`);
    console.log(`\nFiles:`);
    console.log(`  - pages.json (for webpack plugin)`);
    generatedPages.forEach(p => {
      console.log(`  - ${p.slug.replace(/\//g, "_")}.json`);
    });

    console.log(`\nTo deploy:`);
    console.log(`  1. Copy pages.json to street-lawyer-magic-website/seo-pages/`);
    console.log(`  2. Run: npm run build`);
    console.log(`  3. Run: npm run deploy`);

  } catch (error) {
    console.error("Error:", error);
    throw error;
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error("Generation failed:", error);
  process.exit(1);
});
