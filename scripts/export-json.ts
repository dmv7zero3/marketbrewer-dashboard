#!/usr/bin/env ts-node
/**
 * Export completed job pages to JSON files
 * 
 * Usage: ts-node scripts/export-json.ts --business-id <id> [--job-id <id>]
 * 
 * Output structure:
 *   output/{business_id}/manifest.json
 *   output/{business_id}/pages/{keyword-slug}--{city-state}.json
 */

import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

interface ExportArgs {
  businessId: string;
  jobId?: string;
}

interface PageRow {
  id: string;
  job_id: string;
  business_id: string;
  keyword_slug: string | null;
  service_area_slug: string;
  url_path: string;
  status: string;
  content: string | null;
  section_count: number;
  model_name: string | null;
  prompt_version: string | null;
  generation_duration_ms: number | null;
  word_count: number | null;
  created_at: string;
  completed_at: string | null;
}

interface BusinessRow {
  id: string;
  name: string;
  industry: string;
  website: string | null;
  phone: string | null;
}

interface ManifestPage {
  url: string;
  title: string;
  keyword_slug: string | null;
  service_area_slug: string;
  filename: string;
}

interface Manifest {
  business_id: string;
  business_name: string;
  exported_at: string;
  total_pages: number;
  pages: ManifestPage[];
}

interface PageContent {
  title?: string;
  meta_description?: string;
  h1?: string;
  body?: string;
  sections?: Array<{ heading: string; content: string }>;
  cta?: { text: string; url: string };
}

interface ExportedPage {
  routing: {
    url: string;
    canonical: string;
  };
  seo: {
    title: string;
    meta_description: string;
    h1: string;
  };
  location: {
    city: string;
    state: string;
    keyword_slug: string | null;
    service_area_slug: string;
  };
  content: {
    body: string;
    sections: Array<{ heading: string; content: string }>;
    cta: { text: string; url: string };
  };
  generation: {
    model: string | null;
    prompt_version: string | null;
    generated_at: string | null;
    duration_ms: number | null;
    word_count: number | null;
  };
  timestamps: {
    created_at: string;
    exported_at: string;
  };
}

function parseArgs(): ExportArgs {
  const args: Partial<ExportArgs> = {};

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];

    if (arg === '--business-id' && process.argv[i + 1]) {
      args.businessId = process.argv[++i];
    } else if (arg === '--job-id' && process.argv[i + 1]) {
      args.jobId = process.argv[++i];
    } else if (arg.startsWith('--business-id=')) {
      args.businessId = arg.split('=')[1];
    } else if (arg.startsWith('--job-id=')) {
      args.jobId = arg.split('=')[1];
    }
  }

  if (!args.businessId) {
    console.error('Error: --business-id is required');
    console.error('Usage: ts-node scripts/export-json.ts --business-id <id> [--job-id <id>]');
    process.exit(1);
  }

  return args as ExportArgs;
}

function generateFilename(page: PageRow): string {
  const parts: string[] = [];
  if (page.keyword_slug) {
    parts.push(page.keyword_slug);
  }
  parts.push(page.service_area_slug);
  return `${parts.join('--')}.json`;
}

function parseContent(contentJson: string | null): PageContent {
  if (!contentJson) {
    return {};
  }
  try {
    return JSON.parse(contentJson);
  } catch {
    return { body: contentJson };
  }
}

async function main(): Promise<void> {
  const args = parseArgs();
  const dbPath = process.env.DATABASE_PATH || './data/seo-platform.db';

  console.log('📦 Export JSON Script');
  console.log(`   Business ID: ${args.businessId}`);
  console.log(`   Job ID: ${args.jobId || 'all'}`);
  console.log(`   Database: ${dbPath}`);

  // Open database
  if (!fs.existsSync(dbPath)) {
    console.error(`Error: Database not found at ${dbPath}`);
    process.exit(1);
  }

  const db = new Database(dbPath, { readonly: true });

  // Get business info
  const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(args.businessId) as BusinessRow | undefined;
  if (!business) {
    console.error(`Error: Business not found: ${args.businessId}`);
    process.exit(1);
  }

  console.log(`   Business Name: ${business.name}`);

  // Build query for completed pages
  let query = `
    SELECT * FROM job_pages 
    WHERE business_id = ? AND status = 'completed'
  `;
  const params: unknown[] = [args.businessId];

  if (args.jobId) {
    query += ' AND job_id = ?';
    params.push(args.jobId);
  }

  query += ' ORDER BY created_at ASC';

  const pages = db.prepare(query).all(...params) as PageRow[];

  if (pages.length === 0) {
    console.log('⚠️  No completed pages found to export');
    process.exit(0);
  }

  console.log(`   Found ${pages.length} completed pages`);

  // Create output directories
  const outputDir = path.join(process.cwd(), 'output', args.businessId);
  const pagesDir = path.join(outputDir, 'pages');
  fs.mkdirSync(pagesDir, { recursive: true });

  // Export pages and build manifest
  const manifestPages: ManifestPage[] = [];
  const now = new Date().toISOString();

  for (const page of pages) {
    const content = parseContent(page.content);
    const filename = generateFilename(page);

    // Parse city and state from service_area_slug
    const slugParts = page.service_area_slug.split('-');
    const state = slugParts.pop()?.toUpperCase() || '';
    const city = slugParts.join(' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const exportedPage: ExportedPage = {
      routing: {
        url: page.url_path,
        canonical: page.url_path,
      },
      seo: {
        title: content.title || '',
        meta_description: content.meta_description || '',
        h1: content.h1 || content.title || '',
      },
      location: {
        city,
        state,
        keyword_slug: page.keyword_slug,
        service_area_slug: page.service_area_slug,
      },
      content: {
        body: content.body || '',
        sections: content.sections || [],
        cta: content.cta || { text: 'Contact Us', url: '/contact' },
      },
      generation: {
        model: page.model_name,
        prompt_version: page.prompt_version,
        generated_at: page.completed_at,
        duration_ms: page.generation_duration_ms,
        word_count: page.word_count,
      },
      timestamps: {
        created_at: page.created_at,
        exported_at: now,
      },
    };

    // Write page file
    const pagePath = path.join(pagesDir, filename);
    fs.writeFileSync(pagePath, JSON.stringify(exportedPage, null, 2));

    // Add to manifest
    manifestPages.push({
      url: page.url_path,
      title: content.title || page.url_path,
      keyword_slug: page.keyword_slug,
      service_area_slug: page.service_area_slug,
      filename,
    });
  }

  // Write manifest
  const manifest: Manifest = {
    business_id: args.businessId,
    business_name: business.name,
    exported_at: now,
    total_pages: manifestPages.length,
    pages: manifestPages,
  };

  const manifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log('✅ Export complete!');
  console.log(`   Output directory: ${outputDir}`);
  console.log(`   Manifest: ${manifestPath}`);
  console.log(`   Pages exported: ${manifestPages.length}`);

  db.close();
}

main().catch((error) => {
  console.error('Export failed:', error);
  process.exit(1);
});
