/**
 * Seed script for Nash & Smashed business metadata and keywords
 *
 * Adds:
 * - Business metadata (URLs, description, specialties, social media)
 * - Location coordinates and hours
 * - All SEO keywords (both original and new)
 * - Content themes
 *
 * Usage: npx ts-node scripts/seed-nash-smashed-metadata.ts
 */

import Database from "better-sqlite3";
import { generateId } from "../packages/shared/src/utils";
import path from "path";
import fs from "fs";

const dbPath = path.join(__dirname, "../data/seo-platform.db");

const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

console.log("🌱 Seeding Nash & Smashed metadata and keywords...\n");

const businessId = "nash-and-smashed";

// Business metadata
const businessMetadata = {
  baseUrl: "nashandsmashed.com",
  orderOnlineUrl: "https://order.online/business/13049370/",
  description:
    "Nash & Smashed is a restaurant specializing in Nashville hot chicken and smashed burgers with multiple locations across Virginia, Maryland, and Washington DC. Known for our quality ingredients, signature spice blends, and classic comfort food with a modern twist, we offer dine-in, takeout, and online ordering options.",
  specialties: [
    "Nashville Hot Chicken",
    "Smashed Burgers",
    "Hot Wings",
    "Loaded Fries",
    "Mac and Cheese",
    "Craft Shakes",
  ],
  socialMedia: {
    instagram: "https://www.instagram.com/nashandsmashed_/",
    facebook: "https://www.facebook.com/profile.php?id=61550824665169",
    tiktok: "https://www.tiktok.com/@nashandsmashed_",
    appStore: "https://apps.apple.com/us/app/nash-smash/id6502666435",
    googlePlay:
      "https://play.google.com/store/apps/details?id=io.ueat.nashsmash",
  },
  contactInfo: {
    phone: "202-751-0731",
    email: "info@nashandsmashed.com",
    ukFranchisingEmail: "franchising@nashandsmashed.co.uk",
  },
};

// Content themes for SEO/content generation
const contentThemes = {
  nashville_hot_chicken: [
    "authentic Nashville flavors",
    "heat levels",
    "spice blends",
    "crispy coating",
    "juicy chicken",
    "signature recipe",
    "hot and spicy",
    "southern comfort food",
    "halal certified chicken",
    "halal Nashville style",
  ],
  smashed_burgers: [
    "fresh ground beef",
    "crispy edges",
    "melted cheese",
    "toasted buns",
    "perfect sear",
    "juicy patties",
    "artisan burgers",
    "premium ingredients",
    "halal ground beef",
    "halal burger options",
  ],
  southern_comfort_food: [
    "authentic southern recipes",
    "comfort food classics",
    "home-style cooking",
    "traditional flavors",
    "hearty meals",
    "family recipes",
    "halal comfort food",
    "halal southern cuisine",
  ],
  waffle_fries: [
    "crispy waffle-cut fries",
    "golden brown",
    "perfectly seasoned",
    "signature sides",
    "loaded options",
    "made fresh daily",
    "halal preparation",
  ],
  southern_food: [
    "southern cuisine",
    "traditional cooking",
    "regional specialties",
    "authentic recipes",
    "comfort classics",
    "southern hospitality",
    "halal southern food",
    "halal certified ingredients",
  ],
  halal_dining: [
    "halal certified",
    "Islamic dietary laws",
    "halal meat preparation",
    "family friendly dining",
    "community focused",
    "authentic halal flavors",
    "trusted halal source",
    "religiously compliant",
  ],
};

// All keywords - original + new
const keywords = [
  // Original keywords
  "Best Chicken Wings",
  "Best Fried Chicken",
  "Best Nashville Sandwiches",
  "Best Smashed Burgers",
  "Best Chicken Tenders",
  "Craft Mocktails",
  "Family Friendly Restaurant",
  "Fast Food",
  "Finger Licking Fried Chicken",
  "Gourmet Burgers Restaurant",
  "Best Halal Restaurant",
  "Halal Burgers",
  "Halal Fried Chicken",
  "Halal American Restaurant",
  "Halal Desi Restaurant",
  "Best in Town Fried Chicken & Burgers",
  "Dine in & Takeout Restaurant",
  "Open Till Late",
  "Quick Bites",
  "Best Milk Shakes",
  "Best Waffles in Town",
  // New keywords
  "Smash Burger",
  "Nashville Hot Chicken",
  "Halal Food Near Me",
  "Burgers Near Me",
  "Restaurants Near Me",
  "Late Night Food",
  "Halal Wings",
  "Chicken Sandwich",
  "Loaded Fries",
  "Mac and Cheese Restaurant",
  "Craft Shakes",
  "Takeout Restaurant",
  "Delivery Restaurant",
  "Catering Services",
  "Best Burger Restaurant",
  "Halal Fast Food",
  "Southern Fried Chicken",
  "Hot Chicken Sandwich",
  "Smashed Burger Near Me",
  "Best Late Night Food",
  "Halal Chicken Wings",
  "Nashville Style Chicken",
  "Comfort Food Restaurant",
  "Best Chicken Restaurant",
  "Halal Comfort Food",
  "Spicy Fried Chicken",
  "American Halal Food",
  "Fast Casual Restaurant",
  "Best Food Near Me",
];

// Location-specific hours
const locationHours: Record<string, Record<string, string>> = {
  manassas: {
    monday: "11:00 AM - 12:00 AM",
    tuesday: "11:00 AM - 12:00 AM",
    wednesday: "11:00 AM - 12:00 AM",
    thursday: "11:00 AM - 12:00 AM",
    friday: "11:00 AM - 2:00 AM",
    saturday: "11:00 AM - 2:00 AM",
    sunday: "11:00 AM - 12:00 AM",
  },
  dumfries: {
    monday: "11:00 AM - 10:00 PM",
    tuesday: "11:00 AM - 10:00 PM",
    wednesday: "11:00 AM - 10:00 PM",
    thursday: "11:00 AM - 10:00 PM",
    friday: "11:00 AM - 11:00 PM",
    saturday: "11:00 AM - 11:00 PM",
    sunday: "12:00 PM - 9:00 PM",
  },
  hampton: {
    monday: "11:00 AM - 10:00 PM",
    tuesday: "11:00 AM - 10:00 PM",
    wednesday: "11:00 AM - 10:00 PM",
    thursday: "11:00 AM - 10:00 PM",
    friday: "11:00 AM - 11:00 PM",
    saturday: "11:00 AM - 11:00 PM",
    sunday: "12:00 PM - 9:00 PM",
  },
  norfolk: {
    monday: "11:00 AM - 10:00 PM",
    tuesday: "11:00 AM - 10:00 PM",
    wednesday: "11:00 AM - 10:00 PM",
    thursday: "11:00 AM - 10:00 PM",
    friday: "11:00 AM - 11:00 PM",
    saturday: "11:00 AM - 11:00 PM",
    sunday: "12:00 PM - 9:00 PM",
  },
  "silver-spring": {
    monday: "10:45 AM - 10:00 PM",
    tuesday: "10:45 AM - 10:00 PM",
    wednesday: "10:45 AM - 10:00 PM",
    thursday: "10:45 AM - 10:00 PM",
    friday: "10:45 AM - 11:00 PM",
    saturday: "10:45 AM - 11:00 PM",
    sunday: "10:45 AM - 10:00 PM",
  },
  baltimore: {
    monday: "11:00 AM - 11:00 PM",
    tuesday: "11:00 AM - 11:00 PM",
    wednesday: "11:00 AM - 11:00 PM",
    thursday: "11:00 AM - 2:00 AM",
    friday: "11:00 AM - 3:00 AM",
    saturday: "11:00 AM - 3:00 AM",
    sunday: "11:00 AM - 12:00 AM",
  },
  "connecticut-ave-nw": {
    monday: "11:00 AM - 11:00 PM",
    tuesday: "11:00 AM - 11:00 PM",
    wednesday: "11:00 AM - 11:00 PM",
    thursday: "11:00 AM - 11:00 PM",
    friday: "11:00 AM - 3:00 AM",
    saturday: "11:00 AM - 3:00 AM",
    sunday: "12:00 PM - 9:00 PM",
  },
};

// Location coordinates
const locationCoordinates: Record<string, { lat: number; lng: number }> = {
  manassas: { lat: 38.7312, lng: -77.4753 },
  dumfries: { lat: 38.5732, lng: -77.3269 },
  hampton: { lat: 37.0299, lng: -76.3452 },
  norfolk: { lat: 36.8851, lng: -76.3018 },
  "silver-spring": { lat: 39.0046, lng: -77.0261 },
  baltimore: { lat: 39.2731, lng: -76.6108 },
  "connecticut-ave-nw": { lat: 38.9584, lng: -77.0638 },
};

// 1. Insert business metadata
console.log("Adding business metadata...");
const metadataId = generateId();
db.prepare(
  `
  INSERT INTO business_metadata (
    id, business_id, base_url, order_online_url, description, specialties,
    social_media, content_themes, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`
).run(
  metadataId,
  businessId,
  businessMetadata.baseUrl,
  businessMetadata.orderOnlineUrl,
  businessMetadata.description,
  JSON.stringify(businessMetadata.specialties),
  JSON.stringify(businessMetadata.socialMedia),
  JSON.stringify(contentThemes),
  new Date().toISOString(),
  new Date().toISOString()
);
console.log("✓ Business metadata added");

// 2. Update locations with coordinates and hours
console.log("\nUpdating locations with coordinates and hours...");
const updateLocationStmt = db.prepare(`
  UPDATE locations 
  SET latitude = ?, longitude = ?, hours_json = ?
  WHERE business_id = ? AND name = ?
`);

Object.entries(locationCoordinates).forEach(([locName, coords]) => {
  const hours = locationHours[locName];
  if (hours) {
    const location = db
      .prepare(
        `SELECT name FROM locations WHERE business_id = ? AND name LIKE ?`
      )
      .get(businessId, `%${locName.replace(/-/g, " ")}%`) as
      | { name: string }
      | undefined;

    if (location) {
      updateLocationStmt.run(
        coords.lat,
        coords.lng,
        JSON.stringify(hours),
        businessId,
        location.name
      );
    }
  }
});
console.log("✓ Location coordinates and hours added");

// 3. Insert keywords
console.log("\nAdding SEO keywords...");
const insertKeywordStmt = db.prepare(`
  INSERT INTO keywords (id, business_id, slug, keyword)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(business_id, slug) DO UPDATE SET 
    keyword = excluded.keyword
`);

keywords.forEach((keyword) => {
  const slug = keyword
    .toLowerCase()
    .replace(/[&]/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  insertKeywordStmt.run(generateId(), businessId, slug, keyword);
});
console.log(`✓ ${keywords.length} keywords added`);

console.log("\n✅ Metadata and keywords seeding complete!");
console.log(`   Business metadata: 1 record`);
console.log(`   Keywords: ${keywords.length} keywords`);
console.log(`   Locations: Updated with coordinates and hours`);
console.log(`   Content themes: 6 theme categories`);

db.close();
