/**
 * Link service areas to nearby locations.
 *
 * ⚠️  IMPORTANT DISTINCTION:
 * - LOCATIONS = Cities where physical stores exist
 * - SERVICE AREAS = Nearby/surrounding cities for SEO targeting (NOT store cities)
 *
 * This script should NOT mirror locations into service areas.
 * Instead, it links existing service areas to their nearest location via location_id.
 *
 * TODO: Create a separate script to generate service areas from a list of
 * nearby cities around each location (e.g., Manassas location → add service
 * areas for Centreville, Bull Run, Gainesville, etc.)
 *
 * Usage:
 *   BUSINESS_ID=nash-and-smashed npx ts-node scripts/sync-service-areas-from-locations.ts
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { generateId, toCityStateSlug } from "../packages/shared/src/utils";

const businessId = process.env.BUSINESS_ID || "nash-and-smashed";
const dbPath = path.join(__dirname, "../data/seo-platform.db");

if (!fs.existsSync(dbPath)) {
  console.error(`Database not found at ${dbPath}. Run migrations/seed first.`);
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

type LocationRow = {
  id: string;
  business_id: string;
  city: string;
  state: string;
  country: string;
  status: string;
  priority: number | null;
};

// Determine if service_areas has location_id column (migration 002)
const hasLocationIdColumn = (() => {
  const cols = db.prepare("PRAGMA table_info(service_areas)").all() as Array<{
    name: string;
  }>;
  return cols.some((c) => c.name === "location_id");
})();

const locations = db
  .prepare(
    "SELECT id, business_id, city, state, country, status, priority FROM locations WHERE business_id = ?"
  )
  .all(businessId) as LocationRow[];

if (locations.length === 0) {
  console.error(`No locations found for business '${businessId}'.`);
  process.exit(1);
}

// Reset service areas for this business to mirror locations
const deleteStmt = db.prepare(
  "DELETE FROM service_areas WHERE business_id = ?"
);
deleteStmt.run(businessId);

const now = new Date().toISOString();
const seenSlug = new Set<string>();

const insertBase = hasLocationIdColumn
  ? `INSERT INTO service_areas (id, business_id, slug, city, state, county, priority, created_at, location_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  : `INSERT INTO service_areas (id, business_id, slug, city, state, county, priority, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

const insertStmt = db.prepare(insertBase);

let created = 0;

for (const loc of locations) {
  const slug = toCityStateSlug(loc.city, loc.state);
  if (seenSlug.has(slug)) {
    continue; // avoid duplicate city/state combos
  }
  seenSlug.add(slug);

  const id = generateId();
  const priority = loc.priority ?? 0;
  if (hasLocationIdColumn) {
    insertStmt.run(
      id,
      businessId,
      slug,
      loc.city,
      loc.state,
      null,
      priority,
      now,
      loc.id
    );
  } else {
    insertStmt.run(
      id,
      businessId,
      slug,
      loc.city,
      loc.state,
      null,
      priority,
      now
    );
  }
  created += 1;
}

console.log(`Service areas reset for business '${businessId}'.`);
console.log(
  `Created ${created} service areas from ${locations.length} locations.`
);
console.log(
  `location_id linkage ${hasLocationIdColumn ? "enabled" : "not available"}.`
);

db.close();
