/**
 * Seed Street Lawyer Magic Business Profile
 *
 * Updates the business profile with:
 * - Identity: tagline, year established (2025), owner name (Lonny Bramzon)
 * - Audience: target description, languages (English, Spanish)
 * - Brand: voice tone, call to action, forbidden terms
 * - Business hours: 9am-5pm Mon-Fri, closed weekends
 * - Social profiles
 *
 * Usage: npx ts-node scripts/seed-street-lawyer-magic-profile.ts
 */

import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(__dirname, "../data/seo-platform.db");
const db = new Database(DB_PATH);

db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

console.log("🌱 Seeding Street Lawyer Magic business profile...\n");

const now = new Date().toISOString();
const BUSINESS_ID = "street-lawyer-magic";

// ============================================
// 1. UPDATE QUESTIONNAIRE DATA
// ============================================

const questionnaireData = {
  identity: {
    tagline: "The Best at Trial. The Best at Negotiation.",
    yearEstablished: "2025",
    ownerName: "Lonny Bramzon",
  },
  services: {
    offerings: [
      {
        name: "Criminal Defense",
        description: "Comprehensive criminal defense representation for felonies and misdemeanors across DC, Maryland, and Virginia.",
        isPrimary: true,
      },
      {
        name: "DUI/DWI Defense",
        description: "Aggressive defense against drunk driving charges with a track record of favorable outcomes.",
        isPrimary: true,
      },
      {
        name: "Drug Charges Defense",
        description: "Defense for drug possession, distribution, and trafficking charges at state and federal levels.",
        isPrimary: true,
      },
      {
        name: "Cannabis Defense",
        description: "Specialized cannabis defense and advocacy, helping clients navigate marijuana-related charges.",
        isPrimary: true,
      },
      {
        name: "Gun Charges Defense",
        description: "Defense for weapons offenses including illegal possession and firearms violations.",
        isPrimary: false,
      },
      {
        name: "Violent Crimes Defense",
        description: "Defense for assault, robbery, and other violent crime charges.",
        isPrimary: false,
      },
      {
        name: "Domestic Violence Defense",
        description: "Representation for domestic violence allegations with sensitivity and aggressive advocacy.",
        isPrimary: false,
      },
      {
        name: "Sex Crimes Defense",
        description: "Confidential and aggressive defense for sex crime allegations.",
        isPrimary: false,
      },
      {
        name: "Personal Injury",
        description: "Representation for accident victims seeking compensation for injuries caused by negligence.",
        isPrimary: false,
      },
    ],
  },
  audience: {
    targetDescription: "Individuals facing criminal charges in the DC, Maryland, and Virginia (DMV) area who need aggressive, experienced legal representation. This includes people charged with DUI/DWI, drug offenses, violent crimes, weapons charges, and cannabis-related offenses. Also serves the Hispanic community with Spanish-language legal services, and personal injury victims seeking compensation.",
    languages: ["English", "Spanish"],
  },
  brand: {
    voiceTone: "authoritative",
    forbiddenTerms: [
      "cheap",
      "discount",
      "budget",
      "guaranteed outcome",
      "win your case guaranteed",
    ],
    callToAction: "Call Now for a Free Consultation: 240-478-2189",
  },
  serviceType: "onsite",
  socialProfiles: {
    instagram: "https://instagram.com/lonnythestreetlawyer",
    linkedin: "https://linkedin.com/in/lonny-bramzon",
    google: "",
    facebook: "",
    twitter: "",
    linktree: "",
  },
};

// Update questionnaire data in questionnaires table
console.log("📝 Updating questionnaire data...");

// Check if questionnaire exists for this business
const existingQuestionnaire = db
  .prepare("SELECT id FROM questionnaires WHERE business_id = ?")
  .get(BUSINESS_ID) as { id: string } | undefined;

if (existingQuestionnaire) {
  // Update existing questionnaire
  db.prepare(`
    UPDATE questionnaires
    SET data = ?, updated_at = ?
    WHERE business_id = ?
  `).run(JSON.stringify(questionnaireData), now, BUSINESS_ID);
} else {
  // Insert new questionnaire
  db.prepare(`
    INSERT INTO questionnaires (id, business_id, data, completeness_score, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    `slm-questionnaire`,
    BUSINESS_ID,
    JSON.stringify(questionnaireData),
    0,
    now,
    now
  );
}

console.log("  ✓ Identity: tagline, year established (2025), owner (Lonny Bramzon)");
console.log("  ✓ Audience: target description, languages (EN, ES)");
console.log("  ✓ Brand: authoritative tone, CTA, forbidden terms");
console.log("  ✓ Services: 9 practice areas defined");

// ============================================
// 2. SET BUSINESS HOURS (9-5 Mon-Fri, closed weekends)
// ============================================

console.log("\n📅 Setting business hours...");

// First, delete existing hours for this business
db.prepare("DELETE FROM business_hours WHERE business_id = ?").run(BUSINESS_ID);

const insertHours = db.prepare(`
  INSERT INTO business_hours (id, business_id, day_of_week, opens, closes, is_closed)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const days = [
  { day: "monday", opens: "09:00", closes: "17:00", closed: 0 },
  { day: "tuesday", opens: "09:00", closes: "17:00", closed: 0 },
  { day: "wednesday", opens: "09:00", closes: "17:00", closed: 0 },
  { day: "thursday", opens: "09:00", closes: "17:00", closed: 0 },
  { day: "friday", opens: "09:00", closes: "17:00", closed: 0 },
  { day: "saturday", opens: null, closes: null, closed: 1 },
  { day: "sunday", opens: null, closes: null, closed: 1 },
];

for (const d of days) {
  insertHours.run(
    `slm-hours-${d.day}`,
    BUSINESS_ID,
    d.day,
    d.opens,
    d.closes,
    d.closed
  );

  if (d.closed) {
    console.log(`  ✓ ${d.day.charAt(0).toUpperCase() + d.day.slice(1)}: Closed`);
  } else {
    console.log(`  ✓ ${d.day.charAt(0).toUpperCase() + d.day.slice(1)}: 9:00 AM - 5:00 PM`);
  }
}

// ============================================
// 3. VERIFY AND DISPLAY RESULTS
// ============================================

console.log("\n✅ Profile update complete!");

// Verify questionnaire data
const business = db
  .prepare("SELECT name FROM businesses WHERE id = ?")
  .get(BUSINESS_ID) as { name: string } | undefined;

const questionnaireRow = db
  .prepare("SELECT data FROM questionnaires WHERE business_id = ?")
  .get(BUSINESS_ID) as { data: string } | undefined;

if (business && questionnaireRow) {
  const data = JSON.parse(questionnaireRow.data || "{}");
  console.log(`\n📊 ${business.name} Profile Summary:`);
  console.log(`   Owner: ${data.identity?.ownerName || "Not set"}`);
  console.log(`   Year Established: ${data.identity?.yearEstablished || "Not set"}`);
  console.log(`   Tagline: "${data.identity?.tagline || "Not set"}"`);
  console.log(`   Target Audience: ${data.audience?.targetDescription?.substring(0, 80)}...`);
  console.log(`   Languages: ${data.audience?.languages?.join(", ") || "Not set"}`);
  console.log(`   Voice Tone: ${data.brand?.voiceTone || "Not set"}`);
  console.log(`   Services: ${data.services?.offerings?.length || 0} defined`);
}

// Verify hours
const hours = db
  .prepare("SELECT day_of_week, opens, closes, is_closed FROM business_hours WHERE business_id = ? ORDER BY CASE day_of_week WHEN 'monday' THEN 1 WHEN 'tuesday' THEN 2 WHEN 'wednesday' THEN 3 WHEN 'thursday' THEN 4 WHEN 'friday' THEN 5 WHEN 'saturday' THEN 6 WHEN 'sunday' THEN 7 END")
  .all(BUSINESS_ID) as Array<{ day_of_week: string; opens: string; closes: string; is_closed: number }>;

console.log(`\n📅 Business Hours:`);
for (const h of hours) {
  if (h.is_closed) {
    console.log(`   ${h.day_of_week}: Closed`);
  } else {
    console.log(`   ${h.day_of_week}: ${h.opens} - ${h.closes}`);
  }
}

db.close();
console.log("\n🎉 Done!");
