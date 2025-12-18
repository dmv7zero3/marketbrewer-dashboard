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

const businesses = [
  {
    id: "street-lawyer-magic",
    name: "Street Lawyer Magic",
    industry: "Law Office",
    primary_city: "Fairfax",
    primary_state: "VA",
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

const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO businesses (id, name, industry, primary_city, primary_state, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

let added = 0;
let updated = 0;

for (const business of businesses) {
  const existing = db
    .prepare("SELECT id FROM businesses WHERE id = ?")
    .get(business.id);

  insertStmt.run(
    business.id,
    business.name,
    business.industry,
    business.primary_city,
    business.primary_state,
    now,
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
