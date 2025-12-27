#!/usr/bin/env ts-node
/**
 * Setup Script for Street Lawyer Magic
 *
 * Creates the business profile, keywords, and service areas for Street Lawyer Magic,
 * then syncs to DynamoDB for persistent storage.
 *
 * Usage: npx ts-node scripts/setup-street-lawyer-magic.ts
 */

import * as path from "path";
import Database from "better-sqlite3";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../packages/server/.env") });
dotenv.config({ path: path.join(__dirname, "../.env") });

import { syncBusinessToDynamoDB, isDynamoDBAvailable } from "../packages/server/src/services/profile-sync";
import { toSlug, toCityStateSlug } from "@marketbrewer/shared";

const DB_PATH = path.join(__dirname, "../packages/server/data/seo-platform.db");

// Generate UUID
function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Street Lawyer Magic Business Data
const BUSINESS = {
  id: generateId(),
  name: "Street Lawyer Magic",
  industry: "Legal Services",
  phone: "240-478-2189",
  email: "lonny@streetlawyermagic.com",
  website: "https://streetlawyermagic.com",
};

// Questionnaire data from the AI Coding Instructions document
const QUESTIONNAIRE_DATA = {
  business_description: "Street Lawyer Magic is a criminal defense law firm led by Lonny 'The Street Lawyer' Bramzon, Esq. With over 4,000 cases since 2005, we specialize in aggressive, client-focused defense. We handle criminal defense cases including DUIs, drug crimes, violent offenses, white-collar crimes, and cannabis-related legal matters across Washington DC and Maryland.",

  owner_name: "Lonny Bramzon",
  owner_title: "Esq., Managing Attorney",
  owner_bio: "Lonny 'The Street Lawyer' Bramzon is a seasoned criminal defense attorney with a reputation for aggressive representation. Since 2005, he has handled over 4,000 cases, earning the trust of clients facing serious charges. Known for his street-smart approach and courtroom tenacity, Lonny fights for justice with a personal touch that sets him apart.",

  services: [
    "Criminal Defense",
    "DUI/DWI Defense",
    "Drug Crime Defense",
    "Violent Crime Defense",
    "White Collar Crime Defense",
    "Cannabis Law",
    "Expungement Services",
    "Bail Hearings",
    "Probation Violations",
    "Traffic Violations"
  ],

  unique_selling_points: [
    "Over 4,000 cases handled since 2005",
    "Aggressive, street-smart defense strategy",
    "Personal attention to every case",
    "Available 24/7 for emergencies",
    "Free initial consultation",
    "Spanish language services available"
  ],

  target_audience: "Individuals facing criminal charges in Washington DC and Maryland, including first-time offenders, those with prior records, and anyone seeking aggressive legal representation for criminal matters.",

  years_in_business: 19,

  certifications_licenses: [
    "Licensed to practice in Washington DC",
    "Licensed to practice in Maryland",
    "Member, National Association of Criminal Defense Lawyers"
  ],

  tone_of_voice: "Confident, direct, and reassuring. We speak plainly without legal jargon while maintaining professionalism. Our tone conveys strength and determination to fight for our clients.",

  content_preferences: {
    avoid_topics: ["Guaranteeing case outcomes", "Discussing specific case details"],
    emphasize: ["Experience and case count", "Aggressive representation", "Personal attention", "Availability"]
  }
};

// Keywords for criminal defense - English
const KEYWORDS_EN = [
  // Core Criminal Defense
  "criminal defense attorney",
  "criminal defense lawyer",
  "criminal lawyer",
  "defense attorney",

  // DUI/DWI
  "DUI lawyer",
  "DUI attorney",
  "DWI lawyer",
  "DWI attorney",
  "drunk driving lawyer",
  "impaired driving attorney",

  // Drug Crimes
  "drug crime lawyer",
  "drug crime attorney",
  "drug possession lawyer",
  "drug trafficking attorney",
  "marijuana lawyer",
  "cannabis attorney",
  "drug charge defense",

  // Violent Crimes
  "assault lawyer",
  "assault attorney",
  "domestic violence lawyer",
  "domestic violence attorney",
  "violent crime lawyer",
  "battery attorney",

  // Theft/Property
  "theft lawyer",
  "theft attorney",
  "robbery lawyer",
  "burglary attorney",
  "shoplifting lawyer",

  // White Collar
  "white collar crime lawyer",
  "fraud attorney",
  "embezzlement lawyer",

  // Traffic/Misdemeanor
  "traffic violation lawyer",
  "reckless driving attorney",
  "misdemeanor lawyer",

  // Other Services
  "expungement lawyer",
  "expungement attorney",
  "record sealing lawyer",
  "bail hearing attorney",
  "probation violation lawyer",

  // Near Me Variations
  "criminal defense attorney near me",
  "criminal lawyer near me",
  "DUI lawyer near me",
  "drug lawyer near me"
];

// Keywords for criminal defense - Spanish
const KEYWORDS_ES = [
  "abogado de defensa criminal",
  "abogado criminalista",
  "abogado de DUI",
  "abogado de drogas",
  "abogado de violencia domestica",
  "abogado penalista",
  "defensor criminal",
  "abogado de trafico",
  "abogado cerca de mi"
];

// Service Areas - DC and MD ONLY (no Virginia)
const SERVICE_AREAS = [
  // Washington DC (priority 100)
  { city: "Washington", state: "DC", county: null, priority: 100 },

  // Maryland - Priority areas (priority 80-90)
  { city: "Bethesda", state: "MD", county: "Montgomery County", priority: 90 },
  { city: "Silver Spring", state: "MD", county: "Montgomery County", priority: 90 },
  { city: "Rockville", state: "MD", county: "Montgomery County", priority: 85 },
  { city: "College Park", state: "MD", county: "Prince George's County", priority: 85 },
  { city: "Hyattsville", state: "MD", county: "Prince George's County", priority: 85 },

  // Montgomery County (priority 70-80)
  { city: "Gaithersburg", state: "MD", county: "Montgomery County", priority: 80 },
  { city: "Germantown", state: "MD", county: "Montgomery County", priority: 75 },
  { city: "Wheaton", state: "MD", county: "Montgomery County", priority: 75 },
  { city: "Takoma Park", state: "MD", county: "Montgomery County", priority: 75 },
  { city: "Chevy Chase", state: "MD", county: "Montgomery County", priority: 70 },
  { city: "Potomac", state: "MD", county: "Montgomery County", priority: 70 },
  { city: "Kensington", state: "MD", county: "Montgomery County", priority: 70 },

  // Prince George's County (priority 60-75)
  { city: "Bowie", state: "MD", county: "Prince George's County", priority: 75 },
  { city: "Greenbelt", state: "MD", county: "Prince George's County", priority: 75 },
  { city: "Laurel", state: "MD", county: "Prince George's County", priority: 70 },
  { city: "Upper Marlboro", state: "MD", county: "Prince George's County", priority: 70 },
  { city: "Largo", state: "MD", county: "Prince George's County", priority: 65 },
  { city: "Landover", state: "MD", county: "Prince George's County", priority: 65 },
  { city: "Capitol Heights", state: "MD", county: "Prince George's County", priority: 65 },
  { city: "District Heights", state: "MD", county: "Prince George's County", priority: 60 },
  { city: "Suitland", state: "MD", county: "Prince George's County", priority: 60 },
  { city: "Temple Hills", state: "MD", county: "Prince George's County", priority: 60 },
  { city: "Oxon Hill", state: "MD", county: "Prince George's County", priority: 60 },
  { city: "Fort Washington", state: "MD", county: "Prince George's County", priority: 60 },
  { city: "Clinton", state: "MD", county: "Prince George's County", priority: 55 },
  { city: "Bladensburg", state: "MD", county: "Prince George's County", priority: 55 },
  { city: "Mount Rainier", state: "MD", county: "Prince George's County", priority: 55 },
  { city: "Riverdale Park", state: "MD", county: "Prince George's County", priority: 55 },

  // Anne Arundel County (priority 50-60)
  { city: "Annapolis", state: "MD", county: "Anne Arundel County", priority: 60 },
  { city: "Glen Burnie", state: "MD", county: "Anne Arundel County", priority: 55 },
  { city: "Odenton", state: "MD", county: "Anne Arundel County", priority: 50 },
  { city: "Severn", state: "MD", county: "Anne Arundel County", priority: 50 },
  { city: "Pasadena", state: "MD", county: "Anne Arundel County", priority: 50 },
  { city: "Crofton", state: "MD", county: "Anne Arundel County", priority: 50 },

  // Howard County (priority 45-55)
  { city: "Columbia", state: "MD", county: "Howard County", priority: 55 },
  { city: "Ellicott City", state: "MD", county: "Howard County", priority: 50 },
  { city: "Elkridge", state: "MD", county: "Howard County", priority: 45 },

  // Baltimore Area (priority 40-50)
  { city: "Baltimore", state: "MD", county: "Baltimore City", priority: 50 },
  { city: "Towson", state: "MD", county: "Baltimore County", priority: 45 },
  { city: "Catonsville", state: "MD", county: "Baltimore County", priority: 45 },
  { city: "Dundalk", state: "MD", county: "Baltimore County", priority: 40 },
  { city: "Essex", state: "MD", county: "Baltimore County", priority: 40 },
  { city: "Parkville", state: "MD", county: "Baltimore County", priority: 40 },

  // Frederick County (priority 35-45)
  { city: "Frederick", state: "MD", county: "Frederick County", priority: 45 },

  // Charles County (priority 35-45)
  { city: "Waldorf", state: "MD", county: "Charles County", priority: 45 },
  { city: "La Plata", state: "MD", county: "Charles County", priority: 40 },
  { city: "Indian Head", state: "MD", county: "Charles County", priority: 35 },

  // Calvert County (priority 30-40)
  { city: "Prince Frederick", state: "MD", county: "Calvert County", priority: 40 },
  { city: "Dunkirk", state: "MD", county: "Calvert County", priority: 35 },
  { city: "Chesapeake Beach", state: "MD", county: "Calvert County", priority: 30 }
];

async function main() {
  console.log("\n=== Street Lawyer Magic Setup ===\n");

  const db = new Database(DB_PATH);

  try {
    // Check if business already exists
    const existing = db.prepare("SELECT id FROM businesses WHERE name = ?").get(BUSINESS.name);

    if (existing) {
      console.log(`Business "${BUSINESS.name}" already exists with ID: ${(existing as { id: string }).id}`);
      console.log("Skipping creation. Use the sync command if you want to update DynamoDB.");
      db.close();
      return;
    }

    const now = new Date().toISOString();

    // Start transaction
    const transaction = db.transaction(() => {
      console.log("1. Creating business...");

      // Insert business
      db.prepare(`
        INSERT INTO businesses (
          id, name, industry, website, phone, email, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        BUSINESS.id,
        BUSINESS.name,
        BUSINESS.industry,
        BUSINESS.website,
        BUSINESS.phone,
        BUSINESS.email,
        now,
        now
      );

      console.log(`   Business created with ID: ${BUSINESS.id}`);

      // Create questionnaire
      console.log("2. Creating questionnaire...");
      const questionnaireId = generateId();
      db.prepare(`
        INSERT INTO questionnaires (id, business_id, data, completeness_score, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        questionnaireId,
        BUSINESS.id,
        JSON.stringify(QUESTIONNAIRE_DATA),
        85, // Good completeness score
        now,
        now
      );
      console.log(`   Questionnaire created`);

      // Insert keywords
      console.log("3. Creating keywords...");
      const insertKeyword = db.prepare(`
        INSERT INTO keywords (id, business_id, slug, keyword, search_intent, language, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      let keywordCount = 0;

      // English keywords
      for (const keyword of KEYWORDS_EN) {
        insertKeyword.run(
          generateId(),
          BUSINESS.id,
          toSlug(keyword),
          keyword,
          "transactional", // Users looking for a lawyer have transactional intent
          "en",
          now
        );
        keywordCount++;
      }

      // Spanish keywords
      for (const keyword of KEYWORDS_ES) {
        insertKeyword.run(
          generateId(),
          BUSINESS.id,
          toSlug(keyword),
          keyword,
          "transactional",
          "es",
          now
        );
        keywordCount++;
      }

      console.log(`   Created ${keywordCount} keywords (${KEYWORDS_EN.length} EN, ${KEYWORDS_ES.length} ES)`);

      // Insert service areas
      console.log("4. Creating service areas...");
      const insertArea = db.prepare(`
        INSERT INTO service_areas (id, business_id, slug, city, state, county, priority, country, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const area of SERVICE_AREAS) {
        insertArea.run(
          generateId(),
          BUSINESS.id,
          toCityStateSlug(area.city, area.state),
          area.city,
          area.state,
          area.county,
          area.priority,
          "USA",
          now,
          now
        );
      }

      console.log(`   Created ${SERVICE_AREAS.length} service areas (DC and MD only)`);
    });

    transaction();

    console.log("\n5. Syncing to DynamoDB...");

    const dynamoAvailable = await isDynamoDBAvailable();

    if (dynamoAvailable) {
      await syncBusinessToDynamoDB(db, BUSINESS.id);
      console.log("   Successfully synced to DynamoDB!");
    } else {
      console.log("   DynamoDB not available. Data saved to SQLite only.");
      console.log("   Run 'npx ts-node scripts/dynamodb-setup.ts sync-to-dynamo' later to sync.");
    }

    // Summary
    const totalPages = KEYWORDS_EN.length * SERVICE_AREAS.length + KEYWORDS_ES.length * SERVICE_AREAS.length;

    console.log("\n=== Setup Complete ===");
    console.log(`Business: ${BUSINESS.name}`);
    console.log(`Business ID: ${BUSINESS.id}`);
    console.log(`Keywords: ${KEYWORDS_EN.length + KEYWORDS_ES.length} (${KEYWORDS_EN.length} EN, ${KEYWORDS_ES.length} ES)`);
    console.log(`Service Areas: ${SERVICE_AREAS.length} (DC and MD only, no Virginia)`);
    console.log(`Potential Pages: ${totalPages.toLocaleString()}`);
    console.log("\nBreakdown by state:");

    const dcCount = SERVICE_AREAS.filter(a => a.state === "DC").length;
    const mdCount = SERVICE_AREAS.filter(a => a.state === "MD").length;
    console.log(`  DC: ${dcCount} areas`);
    console.log(`  MD: ${mdCount} areas`);

  } catch (error) {
    console.error("Error:", error);
    throw error;
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error("Setup failed:", error);
  process.exit(1);
});
