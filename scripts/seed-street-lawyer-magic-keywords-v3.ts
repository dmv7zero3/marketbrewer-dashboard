/**
 * Seed Street Lawyer Magic keywords - V3
 *
 * Bilingual keyword pairs with proper slug sharing.
 * Both EN and ES keywords in a pair share the same slug (derived from English).
 * English keyword is always created first to establish the primary.
 */

import Database from "better-sqlite3";
import path from "path";

// Simple slug function (same as shared package)
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const DB_PATH = path.join(__dirname, "../data/seo-platform.db");
const db = new Database(DB_PATH);

const BUSINESS_ID = "street-lawyer-magic";

// Keyword pairs: [english, spanish]
const KEYWORD_PAIRS: [string, string][] = [
  // Criminal Defense
  ["criminal defense lawyer", "abogado de defensa criminal"],
  ["federal criminal defense lawyer", "abogado de defensa criminal federal"],
  ["DUI lawyer", "abogado de DUI"],
  ["drug charges lawyer", "abogado de cargos de drogas"],
  ["cannabis defense lawyer", "abogado de defensa de cannabis"],
  ["gun charges lawyer", "abogado de cargos de armas"],
  ["violent crimes defense lawyer", "abogado de defensa por crímenes violentos"],
  ["domestic violence defense lawyer", "abogado de defensa por violencia doméstica"],
  ["sex crimes defense lawyer", "abogado de defensa por delitos sexuales"],
  ["probation violation lawyer", "abogado por violación de libertad condicional"],
  // Personal Injury
  ["personal injury lawyer", "abogado de lesiones personales"],
  ["car accident lawyer", "abogado de accidente de auto"],
  ["truck accident lawyer", "abogado de accidente de camión"],
  ["motorcycle accident lawyer", "abogado de accidente de motocicleta"],
  ["slip and fall lawyer", "abogado de resbalón y caída"],
  ["medical malpractice lawyer", "abogado por negligencia médica"],
  ["wrongful death lawyer", "abogado de muerte injusta"],
];

const now = new Date().toISOString();

console.log(`\n🔑 Seeding Street Lawyer Magic Keywords (V3 - Proper Pairing)\n`);
console.log(`Business ID: ${BUSINESS_ID}`);
console.log(`Total pairs: ${KEYWORD_PAIRS.length}`);
console.log(`Total keywords: ${KEYWORD_PAIRS.length * 2}\n`);

const insertStmt = db.prepare(`
  INSERT INTO keywords (id, business_id, keyword, slug, language, search_intent, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

let insertedCount = 0;

for (const [enKeyword, esKeyword] of KEYWORD_PAIRS) {
  // Generate slug from English keyword (shared by both)
  const sharedSlug = toSlug(enKeyword);
  const baseId = `slm-kw-${sharedSlug}`;

  // Insert English keyword FIRST (primary)
  const enId = `${baseId}-en`;
  try {
    insertStmt.run(
      enId,
      BUSINESS_ID,
      enKeyword,
      sharedSlug,  // Shared slug
      "en",
      "transactional",
      now,
      now
    );
    insertedCount++;
    console.log(`  ✓ EN: ${enKeyword} (/${sharedSlug})`);
  } catch (e: any) {
    if (e.code === "SQLITE_CONSTRAINT_PRIMARYKEY") {
      console.log(`  ⏭ EN: ${enKeyword} (already exists)`);
    } else {
      throw e;
    }
  }

  // Insert Spanish keyword SECOND (paired with English)
  const esId = `${baseId}-es`;
  try {
    insertStmt.run(
      esId,
      BUSINESS_ID,
      esKeyword,
      sharedSlug,  // SAME shared slug as English
      "es",
      "transactional",
      now,
      now
    );
    insertedCount++;
    console.log(`  ✓ ES: ${esKeyword} (/${sharedSlug})`);
  } catch (e: any) {
    if (e.code === "SQLITE_CONSTRAINT_PRIMARYKEY") {
      console.log(`  ⏭ ES: ${esKeyword} (already exists)`);
    } else {
      throw e;
    }
  }

  console.log(""); // Blank line between pairs
}

// Verify the data
const verifyStmt = db.prepare(`
  SELECT slug,
         COUNT(*) as total,
         SUM(CASE WHEN language = 'en' THEN 1 ELSE 0 END) as en_count,
         SUM(CASE WHEN language = 'es' THEN 1 ELSE 0 END) as es_count
  FROM keywords
  WHERE business_id = ?
  GROUP BY slug
  HAVING en_count != 1 OR es_count != 1
`);

const orphans = verifyStmt.all(BUSINESS_ID) as { slug: string; total: number; en_count: number; es_count: number }[];

console.log(`\n📊 Summary:`);
console.log(`   Inserted: ${insertedCount} keywords`);
console.log(`   Pairs: ${KEYWORD_PAIRS.length}`);

if (orphans.length > 0) {
  console.log(`\n⚠️  Found ${orphans.length} orphaned/incomplete pairs:`);
  for (const o of orphans) {
    console.log(`   - /${o.slug}: EN=${o.en_count}, ES=${o.es_count}`);
  }
} else {
  console.log(`   ✅ All keywords properly paired (no orphans)`);
}

// Show final counts
const finalCount = db.prepare(`
  SELECT language, COUNT(*) as count
  FROM keywords
  WHERE business_id = ?
  GROUP BY language
`).all(BUSINESS_ID) as { language: string; count: number }[];

console.log(`\n📈 Final keyword counts:`);
for (const row of finalCount) {
  console.log(`   ${row.language.toUpperCase()}: ${row.count}`);
}

db.close();
console.log(`\n✅ Done!\n`);
