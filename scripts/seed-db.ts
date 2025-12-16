#!/usr/bin/env ts-node
/**
 * Seed database with initial data from config/seeds/*.json
 * 
 * Usage: ts-node scripts/seed-db.ts [--file <seed-file.json>]
 */

import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

interface SeedBusiness {
  id: string;
  name: string;
  industry: string;
  website?: string;
  phone?: string;
  email?: string;
}

interface SeedKeyword {
  keyword: string;
  search_intent?: string;
  priority?: number;
}

interface SeedServiceArea {
  city: string;
  state: string;
  county?: string;
  priority?: number;
}

interface SeedPrompt {
  page_type: 'service-location' | 'keyword-location';
  template: string;
  required_variables?: string[];
  optional_variables?: string[];
  word_count_target?: number;
}

interface SeedData {
  business: SeedBusiness;
  keywords?: SeedKeyword[];
  service_areas?: SeedServiceArea[];
  prompts?: SeedPrompt[];
  questionnaire?: Record<string, unknown>;
}

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function calculateCompletenessScore(data: Record<string, unknown>): number {
  const requiredFields = ['business_name', 'industry', 'phone', 'services', 'service_areas', 'target_audience'];
  const optionalFields = ['website', 'email', 'address', 'tagline', 'year_established', 'differentiators'];
  
  let score = 0;
  const requiredWeight = 60 / requiredFields.length;
  const optionalWeight = 40 / optionalFields.length;

  for (const field of requiredFields) {
    if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
      score += requiredWeight;
    }
  }

  for (const field of optionalFields) {
    if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
      score += optionalWeight;
    }
  }

  return Math.round(Math.min(100, score));
}

async function seedFromFile(db: Database.Database, filePath: string): Promise<void> {
  console.log(`📄 Loading seed file: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Seed file not found: ${filePath}`);
  }

  const seedData: SeedData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const now = new Date().toISOString();

  // Insert business
  const businessId = seedData.business.id || generateId();
  console.log(`   Creating business: ${seedData.business.name} (${businessId})`);

  db.prepare(`
    INSERT OR REPLACE INTO businesses (id, name, industry, website, phone, email, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    businessId,
    seedData.business.name,
    seedData.business.industry,
    seedData.business.website || null,
    seedData.business.phone || null,
    seedData.business.email || null,
    now,
    now
  );

  // Insert questionnaire
  const questionnaireData = seedData.questionnaire || {};
  const completenessScore = calculateCompletenessScore(questionnaireData);
  
  db.prepare(`
    INSERT OR REPLACE INTO questionnaires (id, business_id, data, completeness_score, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    generateId(),
    businessId,
    JSON.stringify(questionnaireData),
    completenessScore,
    now,
    now
  );
  console.log(`   Questionnaire completeness: ${completenessScore}%`);

  // Insert keywords
  if (seedData.keywords && seedData.keywords.length > 0) {
    const insertKeyword = db.prepare(`
      INSERT OR REPLACE INTO keywords (id, business_id, slug, keyword, search_intent, priority, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const kw of seedData.keywords) {
      insertKeyword.run(
        generateId(),
        businessId,
        toSlug(kw.keyword),
        kw.keyword,
        kw.search_intent || null,
        kw.priority || 5,
        now
      );
    }
    console.log(`   Added ${seedData.keywords.length} keywords`);
  }

  // Insert service areas
  if (seedData.service_areas && seedData.service_areas.length > 0) {
    const insertArea = db.prepare(`
      INSERT OR REPLACE INTO service_areas (id, business_id, slug, city, state, county, priority, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const area of seedData.service_areas) {
      const slug = `${toSlug(area.city)}-${area.state.toLowerCase()}`;
      insertArea.run(
        generateId(),
        businessId,
        slug,
        area.city,
        area.state,
        area.county || null,
        area.priority || 5,
        now
      );
    }
    console.log(`   Added ${seedData.service_areas.length} service areas`);
  }

  // Insert prompt templates
  if (seedData.prompts && seedData.prompts.length > 0) {
    const insertPrompt = db.prepare(`
      INSERT OR REPLACE INTO prompt_templates (id, business_id, page_type, version, template, required_variables, optional_variables, word_count_target, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const prompt of seedData.prompts) {
      insertPrompt.run(
        generateId(),
        businessId,
        prompt.page_type,
        1,
        prompt.template,
        JSON.stringify(prompt.required_variables || []),
        JSON.stringify(prompt.optional_variables || []),
        prompt.word_count_target || 400,
        1,
        now
      );
    }
    console.log(`   Added ${seedData.prompts.length} prompt templates`);
  }
}

async function main(): Promise<void> {
  const dbPath = process.env.DATABASE_PATH || './data/seo-platform.db';

  console.log('🌱 Seed Database Script');
  console.log(`   Database: ${dbPath}`);

  // Ensure data directory exists
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Open database
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  // Check for specific seed file argument
  const seedFileArg = process.argv.indexOf('--file');
  
  if (seedFileArg !== -1 && process.argv[seedFileArg + 1]) {
    const seedFile = process.argv[seedFileArg + 1];
    await seedFromFile(db, seedFile);
  } else {
    // Seed all files in config/seeds/
    const seedsDir = path.join(process.cwd(), 'config', 'seeds');
    
    if (!fs.existsSync(seedsDir)) {
      console.log('⚠️  No seeds directory found at config/seeds/');
      console.log('   Create seed files there or use --file <path> argument');
      db.close();
      return;
    }

    const seedFiles = fs.readdirSync(seedsDir).filter((f) => f.endsWith('.json'));
    
    if (seedFiles.length === 0) {
      console.log('⚠️  No seed files found in config/seeds/');
      db.close();
      return;
    }

    for (const file of seedFiles) {
      await seedFromFile(db, path.join(seedsDir, file));
    }
  }

  console.log('✅ Seeding complete!');
  db.close();
}

main().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
