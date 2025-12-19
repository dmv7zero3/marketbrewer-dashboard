/**
 * Seed Additional Businesses
 *
 * Adds 4 new businesses to the database:
 * - Street Lawyer Magic (Law Office)
 * - The Babes Club (Ecommerce Jewelry)
 * - MarketBrewer (Digital Marketing & Web Development)
 * - The Chronic Agency (Modeling Agency)
 *
 * Usage: npx ts-node scripts/seed-additional-businesses.ts
 */

import Database from "better-sqlite3";
import { generateId } from "../packages/shared/src/utils";
import path from "path";
import fs from "fs";

const dbPath = path.join(__dirname, "../data/seo-platform.db");

if (!fs.existsSync(dbPath)) {
  console.error(`❌ Database not found at ${dbPath}`);
  console.error("Run migrations first: npm run migrate");
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

console.log("🌱 Seeding additional businesses...\n");

const now = new Date().toISOString();

type SeedBusiness = {
  id: string;
  name: string;
  industry: string;
  primary_city: string;
  primary_state: string;
  website?: string;
  phone?: string;
  email?: string;
  industry_type?: string;
};

const businesses: SeedBusiness[] = [
  {
    id: "street-lawyer-magic",
    name: "Street Lawyer Magic",
    industry: "Criminal Defense & Cannabis Advocacy",
    industry_type: "Criminal Defense & Cannabis Advocacy",
    website: "https://streetlawyermagic.com",
    phone: "240-478-2189",
    email: "lonny79@aol.com",
    primary_city: "Washington",
    primary_state: "DC",
  },
  {
    id: "the-babes-club",
    name: "The Babes Club",
    industry: "Ecommerce Jewelry",
    primary_city: "Fairfax",
    primary_state: "VA",
  },
  {
    id: "marketbrewer",
    name: "MarketBrewer",
    industry: "Digital Marketing & Web Development",
    primary_city: "Fairfax",
    primary_state: "VA",
  },
  {
    id: "the-chronic-agency",
    name: "The Chronic Agency",
    industry: "Modeling Agency",
    primary_city: "Fairfax",
    primary_state: "VA",
  },
];

const upsertBusinessStmt = db.prepare(`
  INSERT INTO businesses (
    id, name, industry, website, phone, email, industry_type,
    primary_city, primary_state, created_at, updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    industry = excluded.industry,
    website = COALESCE(excluded.website, businesses.website),
    phone = COALESCE(excluded.phone, businesses.phone),
    email = COALESCE(excluded.email, businesses.email),
    industry_type = COALESCE(excluded.industry_type, businesses.industry_type),
    primary_city = excluded.primary_city,
    primary_state = excluded.primary_state,
    updated_at = excluded.updated_at
`);

let added = 0;
let updated = 0;

for (const business of businesses) {
  const existing = db
    .prepare("SELECT id FROM businesses WHERE id = ?")
    .get(business.id);

  upsertBusinessStmt.run(
    business.id,
    business.name,
    business.industry,
    business.website ?? null,
    business.phone ?? null,
    business.email ?? null,
    business.industry_type ?? null,
    business.primary_city,
    business.primary_state,
    existing ? null : now,
    now
  );

  if (existing) {
    updated++;
    console.log(`✓ Updated: ${business.name}`);
  } else {
    added++;
    console.log(`✓ Added: ${business.name}`);
  }
}

// Ensure Street Lawyer Magic has a headquarters location
const upsertLocationStmt = db.prepare(`
  INSERT INTO locations (
    id, business_id, name, display_name, address, full_address,
    city, state, zip_code, country, phone, email,
    status, is_headquarters, priority, created_at, updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    display_name = excluded.display_name,
    address = excluded.address,
    full_address = excluded.full_address,
    city = excluded.city,
    state = excluded.state,
    zip_code = excluded.zip_code,
    country = excluded.country,
    phone = excluded.phone,
    email = excluded.email,
    status = excluded.status,
    is_headquarters = excluded.is_headquarters,
    priority = excluded.priority,
    updated_at = excluded.updated_at
`);

upsertLocationStmt.run(
  "street-lawyer-magic-hq",
  "street-lawyer-magic",
  "Street Lawyer Magic - Main Office",
  "Main Office",
  "3400 Connecticut Avenue NW",
  "3400 Connecticut Avenue NW, Washington, DC",
  "Washington",
  "DC",
  null,
  "USA",
  "240-478-2189",
  "lonny79@aol.com",
  "active",
  1,
  1,
  now,
  now
);

console.log(`\n✅ Seeding complete!`);
console.log(`   Added: ${added} businesses`);
console.log(`   Updated: ${updated} businesses`);

// Show all businesses
const allBusinesses = db
  .prepare("SELECT id, name, industry FROM businesses ORDER BY name")
  .all() as Array<{ id: string; name: string; industry: string }>;

console.log(`\n📊 Total businesses in database: ${allBusinesses.length}`);
allBusinesses.forEach((biz) => {
  console.log(`   • ${biz.name} (${biz.industry})`);
});

db.close();
console.log("\n🎉 Done!");
