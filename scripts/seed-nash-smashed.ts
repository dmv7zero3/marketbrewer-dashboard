/**
 * Seed script for Nash & Smashed business data
 *
 * Populates SQLite database with:
 * - Business profile
 * - Keywords (49 total)
 * - Service areas (24 locations in VA)
 * - Sample questionnaire data
 *
 * Usage: npm run seed:nash-smashed
 */

import Database from "better-sqlite3";
import { generateId } from "../packages/shared/src/utils";
import path from "path";
import fs from "fs";

const dbPath = path.join(__dirname, "../data/seo-platform.db");

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable foreign keys and WAL mode
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

console.log("🌱 Seeding Nash & Smashed data...\n");

// Initialize schema if needed
const migrationPath = path.join(
  __dirname,
  "../packages/server/migrations/001_initial_schema.sql"
);
if (fs.existsSync(migrationPath)) {
  const schema = fs.readFileSync(migrationPath, "utf-8");
  db.exec(schema);
  console.log("✓ Database schema initialized");
}

// Business data
const businessId = "nash-and-smashed";
const now = new Date().toISOString();

// Insert business
db.prepare(
  `
  INSERT OR REPLACE INTO businesses (
    id, name, industry, website, phone, email
  ) VALUES (?, ?, ?, ?, ?, ?)
`
).run(
  businessId,
  "Nash & Smashed",
  "Fast Food Restaurant",
  "https://nashandsmashed.com",
  "571-210-1995",
  "info@nashandsmashed.com"
);

console.log("✓ Inserted business: Nash & Smashed");

// Insert questionnaire with proper data structure
// Using the QuestionnaireDataStructure format from @marketbrewer/shared
const questionnaireData = {
  identity: {
    businessName: "Nash & Smashed",
    industry: "Fast Food Restaurant",
    tagline: "Nashville Heat. Smashed to Perfection.",
    yearEstablished: "2023",
    contactName: "Owner", // Minimal - intentionally incomplete
  },
  location: {
    address: "Multiple locations across DMV", // Minimal - intentionally incomplete
    serviceType: "onsite" as const,
  },
  services: {
    offerings: [
      {
        name: "Nashville Hot Chicken",
        description: "Authentic Nashville-style fried chicken",
        isPrimary: true,
      },
      {
        name: "Smash Burgers",
        description: "Premium smashed burgers",
        isPrimary: true,
      },
    ],
  },
  audience: {
    targetDescription: "", // Missing - incomplete
    demographics: "", // Missing - incomplete
    painPoints: "", // Missing - incomplete
    languages: [],
  },
  brand: {
    voiceTone: "friendly",
    requiredPhrases: [], // Missing - incomplete
    forbiddenWords: [],
    callToAction: "", // Missing - incomplete
  },
};

// Calculate actual completeness: 2 out of 5 sections = 40%
// - identity: ✓ (has businessName, industry, contactName)
// - location: ✓ (has address, serviceType)
// - services: ✓ (has offerings)
// - audience: ✗ (missing targetDescription, demographics, painPoints)
// - brand: ✗ (missing requiredPhrases, callToAction)
const completenessScore = 60; // 3 sections complete out of 5

db.prepare(
  `
  INSERT OR REPLACE INTO questionnaires (
    id, business_id, data, completeness_score
  ) VALUES (?, ?, ?, ?)
`
).run(
  generateId(),
  businessId,
  JSON.stringify(questionnaireData),
  completenessScore
);

console.log("✓ Inserted questionnaire");

// Keywords (49 total from provided list)
const keywords = [
  // Original keywords
  { text: "Best Chicken Wings", slug: "best-chicken-wings" },
  { text: "Best Fried Chicken", slug: "best-fried-chicken" },
  { text: "Best Nashville Sandwiches", slug: "best-nashville-sandwiches" },
  { text: "Best Smashed Burgers", slug: "best-smashed-burgers" },
  { text: "Best Chicken Tenders", slug: "best-chicken-tenders" },
  { text: "Craft Mocktails", slug: "craft-mocktails" },
  { text: "Family Friendly Restaurant", slug: "family-friendly-restaurant" },
  { text: "Fast Food", slug: "fast-food" },
  {
    text: "Finger Licking Fried Chicken",
    slug: "finger-licking-fried-chicken",
  },
  { text: "Gourmet Burgers Restaurant", slug: "gourmet-burgers-restaurant" },
  { text: "Best Halal Restaurant", slug: "best-halal-restaurant" },
  { text: "Halal Burgers", slug: "halal-burgers" },
  { text: "Halal Fried Chicken", slug: "halal-fried-chicken" },
  { text: "Halal American Restaurant", slug: "halal-american-restaurant" },
  { text: "Halal Desi Restaurant", slug: "halal-desi-restaurant" },
  {
    text: "Best in Town Fried Chicken & Burgers",
    slug: "best-in-town-fried-chicken-burgers",
  },
  { text: "Dine in & Takeout Restaurant", slug: "dine-in-takeout-restaurant" },
  { text: "Open Till Late", slug: "open-till-late" },
  { text: "Quick Bites", slug: "quick-bites" },
  { text: "Best Milk Shakes", slug: "best-milk-shakes" },
  { text: "Best Waffles in Town", slug: "best-waffles-in-town" },
  // New keywords
  { text: "Smash Burger", slug: "smash-burger" },
  { text: "Nashville Hot Chicken", slug: "nashville-hot-chicken" },
  { text: "Halal Food Near Me", slug: "halal-food-near-me" },
  { text: "Burgers Near Me", slug: "burgers-near-me" },
  { text: "Restaurants Near Me", slug: "restaurants-near-me" },
  { text: "Late Night Food", slug: "late-night-food" },
  { text: "Halal Wings", slug: "halal-wings" },
  { text: "Chicken Sandwich", slug: "chicken-sandwich" },
  { text: "Loaded Fries", slug: "loaded-fries" },
  { text: "Mac and Cheese Restaurant", slug: "mac-and-cheese-restaurant" },
  { text: "Craft Shakes", slug: "craft-shakes" },
  { text: "Takeout Restaurant", slug: "takeout-restaurant" },
  { text: "Delivery Restaurant", slug: "delivery-restaurant" },
  { text: "Catering Services", slug: "catering-services" },
  { text: "Best Burger Restaurant", slug: "best-burger-restaurant" },
  { text: "Halal Fast Food", slug: "halal-fast-food" },
  { text: "Southern Fried Chicken", slug: "southern-fried-chicken" },
  { text: "Hot Chicken Sandwich", slug: "hot-chicken-sandwich" },
  { text: "Smashed Burger Near Me", slug: "smashed-burger-near-me" },
  { text: "Best Late Night Food", slug: "best-late-night-food" },
  { text: "Halal Chicken Wings", slug: "halal-chicken-wings" },
  { text: "Nashville Style Chicken", slug: "nashville-style-chicken" },
  { text: "Comfort Food Restaurant", slug: "comfort-food-restaurant" },
  { text: "Best Chicken Restaurant", slug: "best-chicken-restaurant" },
  { text: "Halal Comfort Food", slug: "halal-comfort-food" },
  { text: "Spicy Fried Chicken", slug: "spicy-fried-chicken" },
  { text: "American Halal Food", slug: "american-halal-food" },
  { text: "Fast Casual Restaurant", slug: "fast-casual-restaurant" },
  { text: "Best Food Near Me", slug: "best-food-near-me" },
];

const keywordStmt = db.prepare(`
  INSERT OR REPLACE INTO keywords (id, business_id, keyword, slug, priority)
  VALUES (?, ?, ?, ?, ?)
`);

for (let i = 0; i < keywords.length; i++) {
  const kw = keywords[i];
  keywordStmt.run(
    generateId(),
    businessId,
    kw.text,
    kw.slug,
    i + 1 // Priority based on order
  );
}

console.log(`✓ Inserted ${keywords.length} keywords`);

// Service areas (actual Nash & Smashed locations - 28 total)
const serviceAreas = [
  // Virginia - Active Locations (7)
  { city: "Manassas", state: "VA", status: "active" },
  { city: "Dumfries", state: "VA", status: "active" },
  { city: "Hampton", state: "VA", status: "active" },
  { city: "Manassas Park", state: "VA", status: "active" },
  { city: "Glen Allen", state: "VA", status: "active" },
  { city: "Norfolk", state: "VA", status: "active" },
  { city: "Woodbridge", state: "VA", status: "active" },

  // Virginia - Coming Soon (7)
  { city: "Alexandria", state: "VA", status: "coming-soon" },
  { city: "Arlington", state: "VA", status: "coming-soon" },
  { city: "Lorton", state: "VA", status: "coming-soon" },
  { city: "Reston", state: "VA", status: "coming-soon" },
  { city: "Warrenton", state: "VA", status: "coming-soon" },
  { city: "Bristow", state: "VA", status: "coming-soon" },
  { city: "Fairfax", state: "VA", status: "coming-soon" }, // Headquarters city

  // Maryland - Active Locations (4)
  { city: "Silver Spring", state: "MD", status: "active" },
  { city: "Baltimore", state: "MD", status: "active" },
  { city: "Ellicott City", state: "MD", status: "active" },
  { city: "Silver Spring", state: "MD", status: "active" }, // New Hampshire Ave location

  // Maryland - Coming Soon (5)
  { city: "Abingdon", state: "MD", status: "coming-soon" },
  { city: "District Heights", state: "MD", status: "coming-soon" },
  { city: "Temple Hills", state: "MD", status: "coming-soon" },
  { city: "Lanham", state: "MD", status: "coming-soon" },
  { city: "Columbia", state: "MD", status: "coming-soon" },

  // Washington D.C. - Active (1)
  { city: "Washington", state: "DC", status: "active" },

  // Washington D.C. - Coming Soon (4)
  { city: "Washington", state: "DC", status: "coming-soon" }, // Multiple DC locations coming

  // South Carolina - Active (1)
  { city: "Rock Hill", state: "SC", status: "active" },

  // New York - Coming Soon (2)
  { city: "Albany", state: "NY", status: "coming-soon" },
  { city: "Ronkonkoma", state: "NY", status: "coming-soon" },
];

const serviceAreaStmt = db.prepare(`
  INSERT OR REPLACE INTO service_areas (id, business_id, slug, city, state, priority)
  VALUES (?, ?, ?, ?, ?, ?)
`);

for (let i = 0; i < serviceAreas.length; i++) {
  const area = serviceAreas[i];
  const slug = area.city.toLowerCase().replace(/\s+/g, "-");
  serviceAreaStmt.run(
    generateId(),
    businessId,
    slug,
    area.city,
    area.state,
    i + 1 // Priority based on order
  );
}

console.log(`✓ Inserted ${serviceAreas.length} service areas`);

// Summary
console.log("\n📊 Database Summary:");
const businessCount = db
  .prepare("SELECT COUNT(*) as count FROM businesses")
  .get() as { count: number };
const keywordCount = db
  .prepare("SELECT COUNT(*) as count FROM keywords WHERE business_id = ?")
  .get(businessId) as { count: number };
const areaCount = db
  .prepare("SELECT COUNT(*) as count FROM service_areas WHERE business_id = ?")
  .get(businessId) as { count: number };

console.log(`   Businesses: ${businessCount.count}`);
console.log(`   Keywords: ${keywordCount.count}`);
console.log(`   Service Areas: ${areaCount.count}`);
console.log(
  `   Total potential pages: ${keywordCount.count} × ${areaCount.count} = ${
    keywordCount.count * areaCount.count
  } (keyword-location pages)`
);

// Location breakdown
const activeCount = serviceAreas.filter((a) => a.status === "active").length;
const comingSoonCount = serviceAreas.filter(
  (a) => a.status === "coming-soon"
).length;
console.log(`\n📍 Location Breakdown:`);
console.log(`   Active locations: ${activeCount}`);
console.log(`   Coming soon: ${comingSoonCount}`);
console.log(`   States: VA (14), MD (9), DC (5), SC (1), NY (2)`);

db.close();

console.log("\n✅ Seed complete! Database ready at:", dbPath);
console.log("\n🚀 Next steps:");
console.log("   1. Start server: cd packages/server && npm run dev");
console.log("   2. Create job: POST /api/businesses/nash-and-smashed/jobs");
console.log(
  "   3. Start worker: cd packages/worker && npm run start -- --job-id <JOB_ID>"
);
