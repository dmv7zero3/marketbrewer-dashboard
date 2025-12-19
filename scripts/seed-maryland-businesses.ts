/**
 * Seed script: Add Maryland businesses with service areas
 *
 * Businesses:
 * - The Babes Club (Baltimore, MD)
 * - The Chronic Agency (Baltimore, MD)
 * - MarketBrewer (Reston, VA)
 *
 * Service Areas: Maryland cities, counties, and suburbs for Local SEO targeting
 *
 * Usage:
 * cd packages/server && npx ts-node ../../scripts/seed-maryland-businesses.ts
 */

import Database from "better-sqlite3";
import path from "path";
import { generateId } from "@marketbrewer/shared";

const DB_PATH = path.join(__dirname, "../data/seo-platform.db");
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma("foreign_keys = ON");

// Maryland Service Areas - Cities, Counties, Suburbs
const MARYLAND_AREAS = [
  // Major Cities - Priority 1
  { city: "Baltimore", state: "MD", county: "Baltimore City", priority: 1 },
  { city: "Rockville", state: "MD", county: "Montgomery County", priority: 1 },
  { city: "Bethesda", state: "MD", county: "Montgomery County", priority: 1 },
  { city: "Potomac", state: "MD", county: "Montgomery County", priority: 1 },

  // Secondary Cities - Priority 2
  {
    city: "Annapolis",
    state: "MD",
    county: "Anne Arundel County",
    priority: 2,
  },
  {
    city: "College Park",
    state: "MD",
    county: "Prince George's County",
    priority: 2,
  },
  { city: "Frederick", state: "MD", county: "Frederick County", priority: 2 },
  { city: "Towson", state: "MD", county: "Baltimore County", priority: 2 },
  {
    city: "Silver Spring",
    state: "MD",
    county: "Montgomery County",
    priority: 2,
  },
  {
    city: "Gaithersburg",
    state: "MD",
    county: "Montgomery County",
    priority: 2,
  },
  { city: "Bowie", state: "MD", county: "Prince George's County", priority: 2 },
  { city: "Columbia", state: "MD", county: "Howard County", priority: 2 },
  { city: "Ellicott City", state: "MD", county: "Howard County", priority: 2 },

  // Suburbs & Areas - Priority 3
  {
    city: "Chevy Chase",
    state: "MD",
    county: "Montgomery County",
    priority: 3,
  },
  {
    city: "Takoma Park",
    state: "MD",
    county: "Montgomery County",
    priority: 3,
  },
  {
    city: "Hyattsville",
    state: "MD",
    county: "Prince George's County",
    priority: 3,
  },
  {
    city: "Greenbelt",
    state: "MD",
    county: "Prince George's County",
    priority: 3,
  },
  { city: "Glen Burnie", state: "MD", county: "Baltimore County", priority: 3 },
  { city: "Wheaton", state: "MD", county: "Montgomery County", priority: 3 },
  { city: "Kensington", state: "MD", county: "Montgomery County", priority: 3 },
  {
    city: "Laurel",
    state: "MD",
    county: "Prince George's County",
    priority: 3,
  },
  {
    city: "Beltsville",
    state: "MD",
    county: "Prince George's County",
    priority: 3,
  },
  {
    city: "Oxon Hill",
    state: "MD",
    county: "Prince George's County",
    priority: 3,
  },
  {
    city: "Suitland",
    state: "MD",
    county: "Prince George's County",
    priority: 3,
  },
  {
    city: "Camp Springs",
    state: "MD",
    county: "Prince George's County",
    priority: 3,
  },
  {
    city: "Fort Washington",
    state: "MD",
    county: "Prince George's County",
    priority: 3,
  },
  {
    city: "Upper Marlboro",
    state: "MD",
    county: "Prince George's County",
    priority: 3,
  },
];

const VA_AREAS = [
  // Northern Virginia - Priority 1
  { city: "Arlington", state: "VA", county: "Arlington County", priority: 1 },
  { city: "Reston", state: "VA", county: "Loudoun County", priority: 1 },
  { city: "Alexandria", state: "VA", county: "Alexandria City", priority: 1 },

  // Secondary - Priority 2
  {
    city: "Falls Church",
    state: "VA",
    county: "Falls Church City",
    priority: 2,
  },
  { city: "Leesburg", state: "VA", county: "Loudoun County", priority: 2 },
  { city: "Vienna", state: "VA", county: "Fairfax County", priority: 2 },
  { city: "Fairfax", state: "VA", county: "Fairfax City", priority: 2 },
];

function seedBusinesses() {
  console.log("\n📍 Seeding businesses...");

  const insertBusiness = db.prepare(`
    INSERT OR REPLACE INTO businesses (id, name, industry, phone, primary_city, primary_state, website)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const businesses = [
    [
      "the-babes-club",
      "The Babes Club",
      "Entertainment",
      "240-478-2189",
      "Baltimore",
      "MD",
      "https://thebabesclub.com",
    ],
    [
      "the-chronic-agency",
      "The Chronic Agency",
      "Marketing",
      "240-478-2189",
      "Baltimore",
      "MD",
      "https://thechronicagency.com",
    ],
    [
      "marketbrewer-va",
      "MarketBrewer",
      "Local SEO",
      "703-463-6323",
      "Reston",
      "VA",
      "https://marketbrewer.com",
    ],
  ];

  for (const business of businesses) {
    insertBusiness.run(...business);
    console.log(`  ✅ ${business[1]}`);
  }

  return businesses.map((b) => b[0]); // Return IDs
}

function seedLocations(businessIds: string[]) {
  console.log("\n📍 Seeding locations...");

  const now = new Date().toISOString();
  const insertLocation = db.prepare(`
    INSERT INTO locations (
      id, business_id, name, address, city, state, zip_code, country, phone, status, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const locations = [
    [
      generateId(),
      "the-babes-club",
      "The Babes Club - Baltimore Headquarters",
      "3400 Connecticut Avenue NW",
      "Baltimore",
      "MD",
      "21218",
      "US",
      "240-478-2189",
      "active",
      now,
      now,
    ],
    [
      generateId(),
      "the-chronic-agency",
      "The Chronic Agency - Baltimore Office",
      "3400 Connecticut Avenue NW",
      "Baltimore",
      "MD",
      "21218",
      "US",
      "240-478-2189",
      "active",
      now,
      now,
    ],
    [
      generateId(),
      "marketbrewer-va",
      "MarketBrewer - Headquarters",
      "1900 Reston Metro Plaza",
      "Reston",
      "VA",
      "20190",
      "US",
      "703-463-6323",
      "active",
      now,
      now,
    ],
  ];

  for (const location of locations) {
    insertLocation.run(...location);
    console.log(`  ✅ ${location[2]} - ${location[4]}, ${location[5]}`);
  }

  return locations.map((l) => l[0]); // Return location IDs
}

function seedServiceAreas() {
  console.log("\n📍 Seeding service areas...");

  const insertServiceArea = db.prepare(`
    INSERT OR IGNORE INTO service_areas (id, business_id, slug, city, state, county, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  let count = 0;

  // Add Maryland areas for Maryland businesses
  for (const businessId of ["the-babes-club", "the-chronic-agency"]) {
    console.log(`\n  ${businessId}:`);

    for (const area of MARYLAND_AREAS) {
      const slug = `${area.city
        .toLowerCase()
        .replace(/\s+/g, "-")}-${area.state.toLowerCase()}`;
      insertServiceArea.run(
        generateId(),
        businessId,
        slug,
        area.city,
        area.state,
        area.county,
        area.priority
      );
      count++;
    }
    console.log(`    ✅ Added ${MARYLAND_AREAS.length} Maryland service areas`);
  }

  // Add VA areas for MarketBrewer
  console.log(`\n  marketbrewer-va:`);
  for (const area of VA_AREAS) {
    const slug = `${area.city
      .toLowerCase()
      .replace(/\s+/g, "-")}-${area.state.toLowerCase()}`;
    insertServiceArea.run(
      generateId(),
      "marketbrewer-va",
      slug,
      area.city,
      area.state,
      area.county,
      area.priority
    );
    count++;
  }
  console.log(`    ✅ Added ${VA_AREAS.length} Virginia service areas`);

  return count;
}

function displaySummary() {
  console.log("\n" + "=".repeat(70));
  console.log("📊 SEEDING SUMMARY");
  console.log("=".repeat(70));

  const businessCount = (
    db.prepare("SELECT COUNT(*) as count FROM businesses").get() as any
  ).count;
  const locationCount = (
    db.prepare("SELECT COUNT(*) as count FROM locations").get() as any
  ).count;
  const serviceAreaCount = (
    db.prepare("SELECT COUNT(*) as count FROM service_areas").get() as any
  ).count;

  console.log(`\nTotal Businesses: ${businessCount}`);
  console.log(`Total Locations: ${locationCount}`);
  console.log(`Total Service Areas: ${serviceAreaCount}`);

  console.log("\n📍 Businesses & Locations:");
  const businesses = db
    .prepare("SELECT * FROM businesses WHERE id IN (?, ?, ?)")
    .all("the-babes-club", "the-chronic-agency", "marketbrewer-va") as any[];

  for (const business of businesses) {
    console.log(`\n  ${business.name} (${business.id})`);
    console.log(`    📞 ${business.phone}`);
    console.log(`    🌐 ${business.website}`);
    console.log(
      `    📍 Primary: ${business.primary_city}, ${business.primary_state}`
    );

    const locations = db
      .prepare("SELECT * FROM locations WHERE business_id = ?")
      .all(business.id) as any[];
    for (const location of locations) {
      console.log(`\n    Location: ${location.name}`);
      console.log(`      ${location.address}`);
      console.log(
        `      ${location.city}, ${location.state} ${location.zip_code}`
      );
      console.log(`      📞 ${location.phone}`);
    }

    const areas = db
      .prepare(
        "SELECT COUNT(*) as count FROM service_areas WHERE business_id = ?"
      )
      .get(business.id) as any;
    console.log(`\n    Service Areas: ${areas.count}`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("✅ Seeding completed successfully!");
  console.log("=".repeat(70) + "\n");
}

function seedQuestionnaires() {
  console.log("\n📋 Seeding questionnaires...");

  const now = new Date().toISOString();
  const insertQuestionnaire = db.prepare(`
    INSERT OR REPLACE INTO questionnaires (id, business_id, data, completeness_score, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Get all businesses from the database
  const allBusinesses = db
    .prepare(
      "SELECT id, name, phone, website, primary_city, primary_state FROM businesses"
    )
    .all() as any[];

  // Default hours for all businesses
  const defaultHours = JSON.stringify({
    Monday: { open: "09:00", close: "17:00" },
    Tuesday: { open: "09:00", close: "17:00" },
    Wednesday: { open: "09:00", close: "17:00" },
    Thursday: { open: "09:00", close: "17:00" },
    Friday: { open: "09:00", close: "17:00" },
    Saturday: { open: "10:00", close: "16:00" },
    Sunday: { open: "closed", close: "closed" },
  });

  const defaultSocialProfiles = {
    google: "",
    facebook: "",
    instagram: "",
    linkedin: "",
    twitter: "",
  };

  // Seed questionnaire for every business
  for (const business of allBusinesses) {
    // Get primary location for this business
    const location = db
      .prepare(
        "SELECT address, city, state, zip_code FROM locations WHERE business_id = ? LIMIT 1"
      )
      .get(business.id) as any;

    const fullAddress = location
      ? `${location.address}, ${location.city}, ${location.state} ${location.zip_code}`
      : `${business.primary_city}, ${business.primary_state}`;

    const questionnaire = {
      businessName: business.name,
      industry: business.name.includes("MarketBrewer")
        ? "Local SEO"
        : "Entertainment",
      website: business.website || "https://example.com",
      phone: business.phone || "000-000-0000",
      email: "",
      description: `Professional business services in ${business.primary_city}, ${business.primary_state}`,
      address: fullAddress,
      hoursJson: defaultHours,
      socialProfiles: defaultSocialProfiles,
    };

    // Determine completeness score based on data filled in
    const score = business.website && business.phone ? 70 : 50;

    insertQuestionnaire.run(
      generateId(),
      business.id,
      JSON.stringify(questionnaire),
      score,
      now,
      now
    );
    console.log(`  ✅ Questionnaire for ${business.name}`);
  }
}

function main() {
  try {
    console.log("\n🚀 Starting Maryland/VA businesses seeding...");
    console.log(`Database: ${DB_PATH}\n`);

    const businessIds = seedBusinesses();
    seedLocations(businessIds);
    seedServiceAreas();
    seedQuestionnaires();
    displaySummary();

    db.close();
  } catch (error) {
    console.error("\n❌ Error during seeding:", error);
    db.close();
    process.exit(1);
  }
}

main();
