/**
 * Database test fixtures for server tests
 * Creates in-memory SQLite databases with schema for isolated testing
 */

import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

/**
 * Generate a unique ID (UUID v4)
 */
function generateId(): string {
  return randomUUID();
}

/**
 * Create and initialize an in-memory test database with full schema
 */
export function createTestDb(): Database.Database {
  const db = new Database(":memory:");

  // Enable foreign keys for testing
  db.pragma("foreign_keys = ON");

  // Load and execute schema
  const schemaPath = path.join(
    __dirname,
    "../../../migrations/001_initial_schema.sql"
  );
  const schema = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schema);

  return db;
}

/**
 * Seed a test business with default values
 */
export function seedTestBusiness(
  db: Database.Database,
  overrides?: Partial<{
    id: string;
    name: string;
    industry: string;
    phone: string;
  }>
): string {
  const id = overrides?.id || generateId();
  const data = {
    id,
    name: overrides?.name || "Test Co",
    industry: overrides?.industry || "technology",
    phone: overrides?.phone || "555-0000",
  };

  db.prepare(
    `INSERT INTO businesses (id, name, industry, phone) VALUES (?, ?, ?, ?)`
  ).run(data.id, data.name, data.industry, data.phone);

  return id;
}

/**
 * Seed a test questionnaire for a business
 */
export function seedTestQuestionnaire(
  db: Database.Database,
  businessId: string,
  overrides?: Partial<{
    completeness_score: number;
    data: Record<string, unknown>;
  }>
): void {
  const defaultData = {
    business_name: "Test Co",
    industry: "technology",
    phone: "555-0000",
    services: ["consulting"],
    service_areas: ["Sterling, VA"],
    target_audience: "small businesses",
  };

  const data = overrides?.data || defaultData;
  const score = overrides?.completeness_score || 60;

  db.prepare(
    `INSERT INTO questionnaires (business_id, completeness_score, data) VALUES (?, ?, ?)`
  ).run(businessId, score, JSON.stringify(data));
}

/**
 * Seed test keywords for a business
 */
export function seedTestKeywords(
  db: Database.Database,
  businessId: string,
  keywords?: string[]
): void {
  const defaultKeywords = ["consulting", "web development"];
  const keywordList = keywords || defaultKeywords;

  const stmt = db.prepare(
    `INSERT INTO keywords (business_id, keyword, priority) VALUES (?, ?, ?)`
  );

  keywordList.forEach((keyword, index) => {
    stmt.run(businessId, keyword, 10 - index);
  });
}

/**
 * Seed test service areas for a business
 */
export function seedTestServiceAreas(
  db: Database.Database,
  businessId: string,
  areas?: string[]
): void {
  const defaultAreas = ["Sterling, VA", "Reston, VA"];
  const areaList = areas || defaultAreas;

  const stmt = db.prepare(
    `INSERT INTO service_areas (business_id, city, state, slug) VALUES (?, ?, ?, ?)`
  );

  areaList.forEach((area) => {
    const [city, state] = area.split(", ");
    const slug = `${city.toLowerCase()}-${state.toLowerCase()}`;
    stmt.run(businessId, city, state, slug);
  });
}

/**
 * Seed a test generation job
 */
export function seedTestJob(
  db: Database.Database,
  businessId: string,
  overrides?: Partial<{
    id: string;
    page_type: string;
    status: string;
    total_pages: number;
  }>
): string {
  const id = overrides?.id || generateId();
  const pageType = overrides?.page_type || "service";
  const status = overrides?.status || "pending";
  const totalPages = overrides?.total_pages || 5;

  db.prepare(
    `INSERT INTO generation_jobs (id, business_id, page_type, status, total_pages, completed_pages, failed_pages) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, businessId, pageType, status, totalPages, 0, 0);

  return id;
}

/**
 * Seed test job pages
 */
export function seedTestJobPages(
  db: Database.Database,
  jobId: string,
  count?: number
): string[] {
  const pageCount = count || 3;
  const pageIds: string[] = [];

  const stmt = db.prepare(
    `INSERT INTO job_pages (id, job_id, keyword_id, service_area_id, status) VALUES (?, ?, ?, ?, ?)`
  );

  for (let i = 0; i < pageCount; i++) {
    const pageId = generateId();
    // Use NULL for keyword/area for now (can be joined later in tests)
    stmt.run(pageId, jobId, null, null, "pending");
    pageIds.push(pageId);
  }

  return pageIds;
}
