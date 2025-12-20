/**
 * Seed Street Lawyer Magic Service Areas
 *
 * Adds service areas for Maryland and Washington DC covering:
 * - Washington DC
 * - Montgomery County suburbs (Bethesda, Silver Spring, Rockville, etc.)
 * - Prince George's County suburbs (Hyattsville, Greenbelt, Laurel, etc.)
 * - Baltimore metro area
 * - Major Maryland counties
 *
 * Usage: npx ts-node scripts/seed-street-lawyer-magic-service-areas.ts
 */

import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(__dirname, "../data/seo-platform.db");
const db = new Database(DB_PATH);

db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

console.log("🌱 Seeding Street Lawyer Magic service areas...\n");

const now = new Date().toISOString();

// Helper to convert text to slug
function toSlug(city: string, state: string): string {
  return `${city}-${state}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface ServiceArea {
  city: string;
  state: string;
  county?: string;
  priority: number;
}

// Service areas organized by region
const serviceAreas: ServiceArea[] = [
  // Washington DC - Priority 1 (primary market)
  { city: "Washington", state: "DC", priority: 1 },

  // Montgomery County, MD - Priority 2 (immediate DC suburbs)
  { city: "Bethesda", state: "MD", county: "Montgomery County", priority: 2 },
  { city: "Silver Spring", state: "MD", county: "Montgomery County", priority: 2 },
  { city: "Rockville", state: "MD", county: "Montgomery County", priority: 2 },
  { city: "Chevy Chase", state: "MD", county: "Montgomery County", priority: 2 },
  { city: "Takoma Park", state: "MD", county: "Montgomery County", priority: 2 },
  { city: "Wheaton", state: "MD", county: "Montgomery County", priority: 2 },
  { city: "Potomac", state: "MD", county: "Montgomery County", priority: 2 },
  { city: "Gaithersburg", state: "MD", county: "Montgomery County", priority: 3 },
  { city: "Germantown", state: "MD", county: "Montgomery County", priority: 3 },
  { city: "Kensington", state: "MD", county: "Montgomery County", priority: 3 },
  { city: "Aspen Hill", state: "MD", county: "Montgomery County", priority: 3 },
  { city: "Olney", state: "MD", county: "Montgomery County", priority: 3 },
  { city: "Damascus", state: "MD", county: "Montgomery County", priority: 4 },
  { city: "Poolesville", state: "MD", county: "Montgomery County", priority: 4 },
  { city: "Burtonsville", state: "MD", county: "Montgomery County", priority: 4 },
  { city: "White Oak", state: "MD", county: "Montgomery County", priority: 3 },
  { city: "Colesville", state: "MD", county: "Montgomery County", priority: 4 },

  // Prince George's County, MD - Priority 2 (immediate DC suburbs)
  { city: "Hyattsville", state: "MD", county: "Prince George's County", priority: 2 },
  { city: "College Park", state: "MD", county: "Prince George's County", priority: 2 },
  { city: "Greenbelt", state: "MD", county: "Prince George's County", priority: 2 },
  { city: "Laurel", state: "MD", county: "Prince George's County", priority: 2 },
  { city: "Bowie", state: "MD", county: "Prince George's County", priority: 2 },
  { city: "Landover", state: "MD", county: "Prince George's County", priority: 2 },
  { city: "Upper Marlboro", state: "MD", county: "Prince George's County", priority: 2 },
  { city: "Fort Washington", state: "MD", county: "Prince George's County", priority: 2 },
  { city: "Oxon Hill", state: "MD", county: "Prince George's County", priority: 2 },
  { city: "Suitland", state: "MD", county: "Prince George's County", priority: 2 },
  { city: "Capitol Heights", state: "MD", county: "Prince George's County", priority: 2 },
  { city: "District Heights", state: "MD", county: "Prince George's County", priority: 3 },
  { city: "New Carrollton", state: "MD", county: "Prince George's County", priority: 3 },
  { city: "Largo", state: "MD", county: "Prince George's County", priority: 3 },
  { city: "Temple Hills", state: "MD", county: "Prince George's County", priority: 3 },
  { city: "Clinton", state: "MD", county: "Prince George's County", priority: 3 },
  { city: "Camp Springs", state: "MD", county: "Prince George's County", priority: 3 },
  { city: "Waldorf", state: "MD", county: "Charles County", priority: 3 },

  // Baltimore Metro - Priority 3
  { city: "Baltimore", state: "MD", county: "Baltimore City", priority: 3 },
  { city: "Towson", state: "MD", county: "Baltimore County", priority: 3 },
  { city: "Dundalk", state: "MD", county: "Baltimore County", priority: 4 },
  { city: "Catonsville", state: "MD", county: "Baltimore County", priority: 3 },
  { city: "Columbia", state: "MD", county: "Howard County", priority: 3 },
  { city: "Ellicott City", state: "MD", county: "Howard County", priority: 3 },
  { city: "Pikesville", state: "MD", county: "Baltimore County", priority: 4 },
  { city: "Owings Mills", state: "MD", county: "Baltimore County", priority: 4 },
  { city: "Essex", state: "MD", county: "Baltimore County", priority: 4 },
  { city: "Parkville", state: "MD", county: "Baltimore County", priority: 4 },
  { city: "Randallstown", state: "MD", county: "Baltimore County", priority: 4 },
  { city: "Reisterstown", state: "MD", county: "Baltimore County", priority: 4 },
  { city: "Glen Burnie", state: "MD", county: "Anne Arundel County", priority: 3 },
  { city: "Severna Park", state: "MD", county: "Anne Arundel County", priority: 4 },
  { city: "Pasadena", state: "MD", county: "Anne Arundel County", priority: 4 },

  // Other Major Cities - Priority 3-4
  { city: "Annapolis", state: "MD", county: "Anne Arundel County", priority: 3 },
  { city: "Frederick", state: "MD", county: "Frederick County", priority: 3 },

  // County-level entries for broader reach - Priority 5
  { city: "Montgomery County", state: "MD", priority: 5 },
  { city: "Prince George's County", state: "MD", priority: 5 },
  { city: "Baltimore County", state: "MD", priority: 5 },
  { city: "Anne Arundel County", state: "MD", priority: 5 },
  { city: "Howard County", state: "MD", priority: 5 },
  { city: "Frederick County", state: "MD", priority: 5 },
  { city: "Charles County", state: "MD", priority: 5 },
  { city: "Harford County", state: "MD", priority: 5 },
  { city: "Carroll County", state: "MD", priority: 5 },
  { city: "Washington County", state: "MD", priority: 5 },
];

const BUSINESS_ID = "street-lawyer-magic";

// First, delete old service areas for this business
console.log("🗑️  Removing old service areas...");
const deleteResult = db
  .prepare("DELETE FROM service_areas WHERE business_id = ?")
  .run(BUSINESS_ID);
console.log(`   Removed ${deleteResult.changes} old service areas\n`);

// Prepare insert statement
const insertServiceArea = db.prepare(`
  INSERT INTO service_areas (id, business_id, slug, city, state, county, priority, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

let added = 0;

console.log("📝 Adding service areas:\n");

// Group by priority for display
const byPriority = new Map<number, ServiceArea[]>();
for (const area of serviceAreas) {
  if (!byPriority.has(area.priority)) {
    byPriority.set(area.priority, []);
  }
  byPriority.get(area.priority)!.push(area);
}

for (const [priority, areas] of [...byPriority.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(`Priority ${priority}:`);
  for (const area of areas) {
    const slug = toSlug(area.city, area.state);
    const id = `slm-sa-${slug}`;

    insertServiceArea.run(
      id,
      BUSINESS_ID,
      slug,
      area.city,
      area.state,
      area.county || null,
      area.priority,
      now
    );
    added++;

    const countyInfo = area.county ? ` (${area.county})` : "";
    console.log(`  ✓ ${area.city}, ${area.state}${countyInfo}`);
  }
  console.log("");
}

console.log(`✅ Seeding complete!`);
console.log(`   Added: ${added} service areas`);

// Verify and show summary
const totalAreas = db
  .prepare("SELECT COUNT(*) as count FROM service_areas WHERE business_id = ?")
  .get(BUSINESS_ID) as { count: number };

const dcCount = db
  .prepare("SELECT COUNT(*) as count FROM service_areas WHERE business_id = ? AND state = 'DC'")
  .get(BUSINESS_ID) as { count: number };

const mdCount = db
  .prepare("SELECT COUNT(*) as count FROM service_areas WHERE business_id = ? AND state = 'MD'")
  .get(BUSINESS_ID) as { count: number };

console.log(`\n📊 Street Lawyer Magic service areas:`);
console.log(`   Washington DC: ${dcCount.count}`);
console.log(`   Maryland: ${mdCount.count}`);
console.log(`   Total: ${totalAreas.count}`);

db.close();
console.log("\n🎉 Done!");
