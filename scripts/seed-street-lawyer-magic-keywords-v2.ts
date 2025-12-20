/**
 * Seed Street Lawyer Magic Keywords v2
 *
 * Replaces old location-specific keywords with clean bilingual keyword pairs.
 * 17 keyword pairs (EN + ES) covering:
 * - Criminal defense (general, federal, DUI, drugs, cannabis, guns, violent crimes)
 * - Domestic violence, sex crimes, probation violations
 * - Personal injury (car, truck, motorcycle accidents, slip/fall, medical malpractice, wrongful death)
 *
 * Usage: npx ts-node scripts/seed-street-lawyer-magic-keywords-v2.ts
 */

import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(__dirname, "../data/seo-platform.db");
const db = new Database(DB_PATH);

db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

console.log("🌱 Seeding Street Lawyer Magic keywords (v2 - bilingual pairs)...\n");

const now = new Date().toISOString();

// Bilingual keyword pairs - each pair shares a slug
const keywordPairs: Array<{
  slug: string;
  en: string;
  es: string;
  searchIntent: string;
}> = [
  // Criminal Defense
  {
    slug: "criminal-defense-lawyer",
    en: "criminal defense lawyer",
    es: "abogado de defensa criminal",
    searchIntent: "Criminal Defense",
  },
  {
    slug: "federal-criminal-defense-lawyer",
    en: "federal criminal defense lawyer",
    es: "abogado de defensa criminal federal",
    searchIntent: "Criminal Defense",
  },
  {
    slug: "dui-lawyer",
    en: "DUI lawyer",
    es: "abogado de DUI",
    searchIntent: "DUI Defense",
  },
  {
    slug: "drug-charges-lawyer",
    en: "drug charges lawyer",
    es: "abogado de cargos de drogas",
    searchIntent: "Drug Defense",
  },
  {
    slug: "cannabis-defense-lawyer",
    en: "cannabis defense lawyer",
    es: "abogado de defensa de cannabis",
    searchIntent: "Cannabis Defense",
  },
  {
    slug: "gun-charges-lawyer",
    en: "gun charges lawyer",
    es: "abogado de cargos de armas",
    searchIntent: "Gun Defense",
  },
  {
    slug: "violent-crimes-defense-lawyer",
    en: "violent crimes defense lawyer",
    es: "abogado de defensa por crímenes violentos",
    searchIntent: "Violent Crime Defense",
  },
  {
    slug: "domestic-violence-defense-lawyer",
    en: "domestic violence defense lawyer",
    es: "abogado de defensa por violencia doméstica",
    searchIntent: "Domestic Violence Defense",
  },
  {
    slug: "sex-crimes-defense-lawyer",
    en: "sex crimes defense lawyer",
    es: "abogado de defensa por delitos sexuales",
    searchIntent: "Sex Crimes Defense",
  },
  {
    slug: "probation-violation-lawyer",
    en: "probation violation lawyer",
    es: "abogado por violación de libertad condicional",
    searchIntent: "Probation Defense",
  },
  // Personal Injury
  {
    slug: "personal-injury-lawyer",
    en: "personal injury lawyer",
    es: "abogado de lesiones personales",
    searchIntent: "Personal Injury",
  },
  {
    slug: "car-accident-lawyer",
    en: "car accident lawyer",
    es: "abogado de accidente de auto",
    searchIntent: "Personal Injury",
  },
  {
    slug: "truck-accident-lawyer",
    en: "truck accident lawyer",
    es: "abogado de accidente de camión",
    searchIntent: "Personal Injury",
  },
  {
    slug: "motorcycle-accident-lawyer",
    en: "motorcycle accident lawyer",
    es: "abogado de accidente de motocicleta",
    searchIntent: "Personal Injury",
  },
  {
    slug: "slip-and-fall-lawyer",
    en: "slip and fall lawyer",
    es: "abogado de resbalón y caída",
    searchIntent: "Personal Injury",
  },
  {
    slug: "medical-malpractice-lawyer",
    en: "medical malpractice lawyer",
    es: "abogado por negligencia médica",
    searchIntent: "Personal Injury",
  },
  {
    slug: "wrongful-death-lawyer",
    en: "wrongful death lawyer",
    es: "abogado de muerte injusta",
    searchIntent: "Personal Injury",
  },
];

const BUSINESS_ID = "street-lawyer-magic";

// First, delete old keywords for this business
console.log("🗑️  Removing old keywords...");
const deleteResult = db
  .prepare("DELETE FROM keywords WHERE business_id = ?")
  .run(BUSINESS_ID);
console.log(`   Removed ${deleteResult.changes} old keywords\n`);

// Helper to convert text to slug
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Prepare insert statement
const insertKeyword = db.prepare(`
  INSERT INTO keywords (id, business_id, slug, keyword, search_intent, language, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

let added = 0;

console.log("📝 Adding bilingual keyword pairs:\n");

for (const pair of keywordPairs) {
  // Each keyword gets its own slug based on its text (unique constraint on business_id + slug)
  const enSlug = toSlug(pair.en);
  const esSlug = toSlug(pair.es);

  // Insert English keyword
  const enId = `slm-kw-${pair.slug}-en`;
  insertKeyword.run(
    enId,
    BUSINESS_ID,
    enSlug,
    pair.en,
    pair.searchIntent,
    "en",
    now
  );
  added++;

  // Insert Spanish keyword
  const esId = `slm-kw-${pair.slug}-es`;
  insertKeyword.run(
    esId,
    BUSINESS_ID,
    esSlug,
    pair.es,
    pair.searchIntent,
    "es",
    now
  );
  added++;

  console.log(`  ✓ ${pair.en}`);
  console.log(`    ${pair.es}`);
  console.log("");
}

console.log(`✅ Seeding complete!`);
console.log(`   Added: ${added} keywords (${keywordPairs.length} pairs)`);

// Verify
const totalKeywords = db
  .prepare(
    "SELECT COUNT(*) as count FROM keywords WHERE business_id = ?"
  )
  .get(BUSINESS_ID) as { count: number };

const enCount = db
  .prepare(
    "SELECT COUNT(*) as count FROM keywords WHERE business_id = ? AND language = 'en'"
  )
  .get(BUSINESS_ID) as { count: number };

const esCount = db
  .prepare(
    "SELECT COUNT(*) as count FROM keywords WHERE business_id = ? AND language = 'es'"
  )
  .get(BUSINESS_ID) as { count: number };

console.log(`\n📊 Street Lawyer Magic keywords:`);
console.log(`   English: ${enCount.count}`);
console.log(`   Spanish: ${esCount.count}`);
console.log(`   Total: ${totalKeywords.count}`);

db.close();
console.log("\n🎉 Done!");
