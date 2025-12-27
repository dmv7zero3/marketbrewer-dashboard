#!/usr/bin/env ts-node
/**
 * Generate Test Pages for Street Lawyer Magic
 *
 * Generates 5 sample pages to review content quality before running full generation.
 *
 * Usage: npx ts-node scripts/generate-test-pages.ts
 */

import * as path from "path";
import * as fs from "fs";
import Database from "better-sqlite3";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../packages/server/.env") });
dotenv.config({ path: path.join(__dirname, "../.env") });

const DB_PATH = path.join(__dirname, "../packages/server/data/seo-platform.db");
const OUTPUT_DIR = path.join(__dirname, "../test-pages");

// Sample pages to generate - mix of keywords and locations
const TEST_PAGES = [
  { keyword: "criminal defense attorney", city: "Washington", state: "DC", language: "en" },
  { keyword: "DUI lawyer", city: "Bethesda", state: "MD", language: "en" },
  { keyword: "drug crime lawyer", city: "Silver Spring", state: "MD", language: "en" },
  { keyword: "abogado criminalista", city: "Washington", state: "DC", language: "es" },
  { keyword: "domestic violence lawyer", city: "Rockville", state: "MD", language: "en" },
];

// Ollama configuration
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";

interface PromptTemplate {
  id: string;
  template: string;
  word_count_target: number;
}

interface BusinessData {
  id: string;
  name: string;
  industry: string;
  phone: string;
  email: string;
  website: string;
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toCityStateSlug(city: string, state: string): string {
  return `${toSlug(city)}-${state.toLowerCase()}`;
}

function substituteVariables(template: string, vars: Record<string, string>): string {
  let result = template;

  for (const [key, value] of Object.entries(vars)) {
    const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
    result = result.replace(pattern, value);
  }

  return result;
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

async function main() {
  console.log("\n=== Street Lawyer Magic Test Page Generation ===\n");

  const db = new Database(DB_PATH);

  try {
    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Get business data
    const business = db.prepare(`
      SELECT id, name, industry, phone, email, website
      FROM businesses WHERE name = 'Street Lawyer Magic'
    `).get() as BusinessData | undefined;

    if (!business) {
      console.error("Business 'Street Lawyer Magic' not found!");
      process.exit(1);
    }

    console.log(`Business: ${business.name} (${business.id})`);

    // Get prompt template
    const template = db.prepare(`
      SELECT id, template, word_count_target
      FROM prompt_templates
      WHERE business_id = ? AND page_type = 'service-area' AND is_active = 1
      ORDER BY version DESC LIMIT 1
    `).get(business.id) as PromptTemplate | undefined;

    if (!template) {
      console.error("No active prompt template found!");
      process.exit(1);
    }

    console.log(`Using prompt template: ${template.id}`);
    console.log(`Target word count: ${template.word_count_target}`);
    console.log();

    // Test Ollama connection
    console.log(`Testing Ollama connection at ${OLLAMA_URL}...`);
    try {
      const healthResponse = await fetch(`${OLLAMA_URL}/api/tags`);
      if (!healthResponse.ok) {
        throw new Error("Failed to connect to Ollama");
      }
      const models = await healthResponse.json();
      const hasModel = models.models?.some((m: { name: string }) => m.name.includes(OLLAMA_MODEL));
      if (!hasModel) {
        console.warn(`Warning: Model '${OLLAMA_MODEL}' not found. Available models:`);
        models.models?.forEach((m: { name: string }) => console.log(`  - ${m.name}`));
      }
      console.log(`Ollama connected. Using model: ${OLLAMA_MODEL}\n`);
    } catch (error) {
      console.error(`Cannot connect to Ollama at ${OLLAMA_URL}`);
      console.error("Please ensure Ollama is running: ollama serve");
      process.exit(1);
    }

    // Generate test pages
    console.log(`Generating ${TEST_PAGES.length} test pages...\n`);

    const results: { file: string; wordCount: number; success: boolean }[] = [];

    for (let i = 0; i < TEST_PAGES.length; i++) {
      const testPage = TEST_PAGES[i];
      const urlPath = `/${toSlug(testPage.keyword)}/${toCityStateSlug(testPage.city, testPage.state)}`;

      console.log(`[${i + 1}/${TEST_PAGES.length}] Generating: ${testPage.keyword} in ${testPage.city}, ${testPage.state}...`);

      // Build variables
      const variables: Record<string, string> = {
        business_name: business.name,
        industry: business.industry,
        phone: business.phone,
        email: business.email,
        website: business.website,
        keyword: testPage.keyword,
        city: testPage.city,
        state: testPage.state,
        url_path: urlPath,
        output_language: testPage.language === "es" ? "Spanish" : "English",
        language: testPage.language,
      };

      // Substitute variables in template
      const prompt = substituteVariables(template.template, variables);

      try {
        const startTime = Date.now();
        const content = await generateWithOllama(prompt);
        const duration = Date.now() - startTime;

        // Count words
        const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;

        // Create filename
        const filename = `${i + 1}-${toSlug(testPage.keyword)}-${toCityStateSlug(testPage.city, testPage.state)}.md`;
        const filepath = path.join(OUTPUT_DIR, filename);

        // Write file with metadata
        const fileContent = `---
keyword: ${testPage.keyword}
city: ${testPage.city}
state: ${testPage.state}
language: ${testPage.language}
url_path: ${urlPath}
word_count: ${wordCount}
generation_time_ms: ${duration}
model: ${OLLAMA_MODEL}
---

${content}
`;

        fs.writeFileSync(filepath, fileContent);

        console.log(`   ✓ Generated ${wordCount} words in ${(duration / 1000).toFixed(1)}s`);
        console.log(`   Saved to: ${filename}\n`);

        results.push({ file: filename, wordCount, success: true });
      } catch (error) {
        console.error(`   ✗ Failed: ${error instanceof Error ? error.message : String(error)}\n`);
        results.push({ file: "", wordCount: 0, success: false });
      }
    }

    // Summary
    console.log("\n=== Summary ===");
    console.log(`Output directory: ${OUTPUT_DIR}`);
    console.log("\nGenerated files:");

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    for (const result of successful) {
      console.log(`  ✓ ${result.file} (${result.wordCount} words)`);
    }

    if (failed.length > 0) {
      console.log(`\n${failed.length} page(s) failed to generate.`);
    }

    const avgWordCount = successful.length > 0
      ? Math.round(successful.reduce((sum, r) => sum + r.wordCount, 0) / successful.length)
      : 0;

    console.log(`\nAverage word count: ${avgWordCount} (target: ${template.word_count_target})`);
    console.log("\nReview these pages before running full generation.");
    console.log("Edit the prompt template if content quality needs improvement.");

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
