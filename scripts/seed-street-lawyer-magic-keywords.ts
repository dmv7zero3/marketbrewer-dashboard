/**
 * Seed Street Lawyer Magic Keywords
 *
 * Adds 34 criminal defense & cannabis advocacy keywords:
 * - 19 English keywords targeting DC/MD/VA criminal defense
 * - 15 Spanish keywords for Hispanic community outreach
 *
 * Categories:
 * - Local/Regional legal services (DC, MD, VA)
 * - Cannabis-specific defense (marijuana, weed charges)
 * - Specialized services (federal, violent crime, gun charges, drugs)
 * - Quality/reputation searches (top trial lawyer, best negotiation, etc.)
 *
 * Usage: npx ts-node scripts/seed-street-lawyer-magic-keywords.ts
 */

import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(__dirname, "../data/seo-platform.db");
const db = new Database(DB_PATH);

db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

console.log("🌱 Seeding Street Lawyer Magic keywords...\n");

const now = new Date().toISOString();

type KeywordRow = {
  id: string;
  business_id: string;
  slug: string;
  keyword: string;
  search_intent: string;
  language: "en" | "es";
};

// English keywords (19 total)
const englishKeywords: KeywordRow[] = [
  {
    id: "slm-kw-criminal-defense-attorney-dc",
    business_id: "street-lawyer-magic",
    slug: "criminal-defense-attorney-dc",
    keyword: "criminal defense attorney DC",
    search_intent: "Local Legal Services",
    language: "en",
  },
  {
    id: "slm-kw-criminal-lawyer-washington-dc",
    business_id: "street-lawyer-magic",
    slug: "criminal-lawyer-washington-dc",
    keyword: "criminal lawyer in Washington DC",
    search_intent: "Local Legal Services",
    language: "en",
  },
  {
    id: "slm-kw-maryland-criminal-defense-lawyer",
    business_id: "street-lawyer-magic",
    slug: "maryland-criminal-defense-lawyer",
    keyword: "Maryland criminal defense lawyer",
    search_intent: "Regional Legal Services",
    language: "en",
  },
  {
    id: "slm-kw-virginia-criminal-defense-attorney",
    business_id: "street-lawyer-magic",
    slug: "virginia-criminal-defense-attorney",
    keyword: "Virginia criminal defense attorney",
    search_intent: "Regional Legal Services",
    language: "en",
  },
  {
    id: "slm-kw-best-criminal-attorney-near-me-dc",
    business_id: "street-lawyer-magic",
    slug: "best-criminal-attorney-near-me-dc",
    keyword: "best criminal attorney near me DC",
    search_intent: "Proximity Search",
    language: "en",
  },
  {
    id: "slm-kw-federal-criminal-defense-lawyer-dc",
    business_id: "street-lawyer-magic",
    slug: "federal-criminal-defense-lawyer-dc",
    keyword: "federal criminal defense lawyer DC",
    search_intent: "Specialized Legal Services",
    language: "en",
  },
  {
    id: "slm-kw-violent-crime-defense-attorney-maryland",
    business_id: "street-lawyer-magic",
    slug: "violent-crime-defense-attorney-maryland",
    keyword: "violent crime defense attorney Maryland",
    search_intent: "Specialized Legal Services",
    language: "en",
  },
  {
    id: "slm-kw-drug-distribution-lawyer-dc",
    business_id: "street-lawyer-magic",
    slug: "drug-distribution-lawyer-dc",
    keyword: "drug distribution lawyer DC",
    search_intent: "Specialized Legal Services",
    language: "en",
  },
  {
    id: "slm-kw-gun-charges-lawyer-washington-dc",
    business_id: "street-lawyer-magic",
    slug: "gun-charges-lawyer-washington-dc",
    keyword: "gun charges lawyer in Washington DC",
    search_intent: "Specialized Legal Services",
    language: "en",
  },
  {
    id: "slm-kw-cannabis-defense-lawyer-dc",
    business_id: "street-lawyer-magic",
    slug: "cannabis-defense-lawyer-dc",
    keyword: "cannabis defense lawyer DC",
    search_intent: "Cannabis Legal Services",
    language: "en",
  },
  {
    id: "slm-kw-marijuana-possession-lawyer-maryland",
    business_id: "street-lawyer-magic",
    slug: "marijuana-possession-lawyer-maryland",
    keyword: "marijuana possession lawyer Maryland",
    search_intent: "Cannabis Legal Services",
    language: "en",
  },
  {
    id: "slm-kw-cannabis-distribution-attorney-dc",
    business_id: "street-lawyer-magic",
    slug: "cannabis-distribution-attorney-dc",
    keyword: "cannabis distribution attorney DC",
    search_intent: "Cannabis Legal Services",
    language: "en",
  },
  {
    id: "slm-kw-weed-charge-attorney-silver-spring",
    business_id: "street-lawyer-magic",
    slug: "weed-charge-attorney-silver-spring",
    keyword: "weed charge attorney Silver Spring",
    search_intent: "Cannabis Legal Services",
    language: "en",
  },
  {
    id: "slm-kw-dc-cannabis-arrest-lawyer",
    business_id: "street-lawyer-magic",
    slug: "dc-cannabis-arrest-lawyer",
    keyword: "DC cannabis arrest lawyer",
    search_intent: "Cannabis Legal Services",
    language: "en",
  },
  {
    id: "slm-kw-top-trial-lawyer-washington-dc",
    business_id: "street-lawyer-magic",
    slug: "top-trial-lawyer-washington-dc",
    keyword: "top trial lawyer in Washington DC",
    search_intent: "Quality/Reputation Search",
    language: "en",
  },
  {
    id: "slm-kw-best-negotiation-attorney-criminal-cases-dc",
    business_id: "street-lawyer-magic",
    slug: "best-negotiation-attorney-criminal-cases-dc",
    keyword: "best negotiation attorney for criminal cases DC",
    search_intent: "Quality/Reputation Search",
    language: "en",
  },
  {
    id: "slm-kw-experienced-criminal-trial-lawyer-maryland",
    business_id: "street-lawyer-magic",
    slug: "experienced-criminal-trial-lawyer-maryland",
    keyword: "experienced criminal trial lawyer Maryland",
    search_intent: "Quality/Reputation Search",
    language: "en",
  },
  {
    id: "slm-kw-high-profile-criminal-defense-attorney-dc",
    business_id: "street-lawyer-magic",
    slug: "high-profile-criminal-defense-attorney-dc",
    keyword: "high profile criminal defense attorney DC",
    search_intent: "Quality/Reputation Search",
    language: "en",
  },
  {
    id: "slm-kw-dmv-defense-attorney-proven-trial-success",
    business_id: "street-lawyer-magic",
    slug: "dmv-defense-attorney-proven-trial-success",
    keyword: "DMV defense attorney with proven trial success",
    search_intent: "Quality/Reputation Search",
    language: "en",
  },
];

// Spanish keywords (15 total)
const spanishKeywords: KeywordRow[] = [
  {
    id: "slm-kw-es-abogado-defensa-criminal-washington-dc",
    business_id: "street-lawyer-magic",
    slug: "abogado-defensa-criminal-washington-dc",
    keyword: "abogado de defensa criminal en Washington DC",
    search_intent: "Servicios Legales Locales",
    language: "es",
  },
  {
    id: "slm-kw-es-abogado-criminalista-dc",
    business_id: "street-lawyer-magic",
    slug: "abogado-criminalista-dc",
    keyword: "abogado criminalista en DC",
    search_intent: "Servicios Legales Locales",
    language: "es",
  },
  {
    id: "slm-kw-es-abogado-defensa-penal-maryland",
    business_id: "street-lawyer-magic",
    slug: "abogado-defensa-penal-maryland",
    keyword: "abogado de defensa penal en Maryland",
    search_intent: "Servicios Legales Regionales",
    language: "es",
  },
  {
    id: "slm-kw-es-abogado-penalista-virginia",
    business_id: "street-lawyer-magic",
    slug: "abogado-penalista-virginia",
    keyword: "abogado penalista en Virginia",
    search_intent: "Servicios Legales Regionales",
    language: "es",
  },
  {
    id: "slm-kw-es-mejor-abogado-criminal-cerca-dc",
    business_id: "street-lawyer-magic",
    slug: "mejor-abogado-criminal-cerca-dc",
    keyword: "mejor abogado criminal cerca de mí DC",
    search_intent: "Búsqueda de Proximidad",
    language: "es",
  },
  {
    id: "slm-kw-es-abogado-federal-defensa-criminal-dc",
    business_id: "street-lawyer-magic",
    slug: "abogado-federal-defensa-criminal-dc",
    keyword: "abogado federal de defensa criminal DC",
    search_intent: "Servicios Legales Especializados",
    language: "es",
  },
  {
    id: "slm-kw-es-abogado-casos-violencia-maryland",
    business_id: "street-lawyer-magic",
    slug: "abogado-casos-violencia-maryland",
    keyword: "abogado para casos de violencia en Maryland",
    search_intent: "Servicios Legales Especializados",
    language: "es",
  },
  {
    id: "slm-kw-es-abogado-distribucion-drogas-dc",
    business_id: "street-lawyer-magic",
    slug: "abogado-distribucion-drogas-dc",
    keyword: "abogado de distribución de drogas en DC",
    search_intent: "Servicios Legales Especializados",
    language: "es",
  },
  {
    id: "slm-kw-es-abogado-cargos-armas-washington-dc",
    business_id: "street-lawyer-magic",
    slug: "abogado-cargos-armas-washington-dc",
    keyword: "abogado de cargos de armas en Washington DC",
    search_intent: "Servicios Legales Especializados",
    language: "es",
  },
  {
    id: "slm-kw-es-abogado-defensa-cannabis-dc",
    business_id: "street-lawyer-magic",
    slug: "abogado-defensa-cannabis-dc",
    keyword: "abogado de defensa de cannabis en DC",
    search_intent: "Servicios Legales Cannabis",
    language: "es",
  },
  {
    id: "slm-kw-es-abogado-posesion-marihuana-maryland",
    business_id: "street-lawyer-magic",
    slug: "abogado-posesion-marihuana-maryland",
    keyword: "abogado por posesión de marihuana en Maryland",
    search_intent: "Servicios Legales Cannabis",
    language: "es",
  },
  {
    id: "slm-kw-es-abogado-distribucion-cannabis-dc",
    business_id: "street-lawyer-magic",
    slug: "abogado-distribucion-cannabis-dc",
    keyword: "abogado por distribución de cannabis en DC",
    search_intent: "Servicios Legales Cannabis",
    language: "es",
  },
  {
    id: "slm-kw-es-abogado-cargos-marihuana-silver-spring",
    business_id: "street-lawyer-magic",
    slug: "abogado-cargos-marihuana-silver-spring",
    keyword: "abogado para cargos de marihuana en Silver Spring",
    search_intent: "Servicios Legales Cannabis",
    language: "es",
  },
  {
    id: "slm-kw-es-abogado-arrestos-cannabis-dc",
    business_id: "street-lawyer-magic",
    slug: "abogado-arrestos-cannabis-dc",
    keyword: "abogado para arrestos por cannabis en DC",
    search_intent: "Servicios Legales Cannabis",
    language: "es",
  },
  {
    id: "slm-kw-es-abogado-juicios-penales-alta-experiencia-dmv",
    business_id: "street-lawyer-magic",
    slug: "abogado-juicios-penales-alta-experiencia-dmv",
    keyword: "abogado de juicios penales con alta experiencia en el DMV",
    search_intent: "Búsqueda de Calidad/Reputación",
    language: "es",
  },
];

// Prepare upsert statement
const upsertKeyword = db.prepare(`
  INSERT INTO keywords (id, business_id, slug, keyword, search_intent, language, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    slug = excluded.slug,
    keyword = excluded.keyword,
    search_intent = excluded.search_intent,
    language = excluded.language
`);

let added = 0;
let updated = 0;

// Insert English keywords
console.log("📝 English keywords:");
for (const kw of englishKeywords) {
  const existing = db
    .prepare("SELECT id FROM keywords WHERE id = ?")
    .get(kw.id);

  upsertKeyword.run(
    kw.id,
    kw.business_id,
    kw.slug,
    kw.keyword,
    kw.search_intent,
    kw.language,
    now
  );

  if (existing) {
    updated++;
    console.log(`  ✓ Updated: ${kw.keyword}`);
  } else {
    added++;
    console.log(`  ✓ Added: ${kw.keyword}`);
  }
}

// Insert Spanish keywords
console.log("\n📝 Spanish keywords:");
for (const kw of spanishKeywords) {
  const existing = db
    .prepare("SELECT id FROM keywords WHERE id = ?")
    .get(kw.id);

  upsertKeyword.run(
    kw.id,
    kw.business_id,
    kw.slug,
    kw.keyword,
    kw.search_intent,
    kw.language,
    now
  );

  if (existing) {
    updated++;
    console.log(`  ✓ Updated: ${kw.keyword}`);
  } else {
    added++;
    console.log(`  ✓ Added: ${kw.keyword}`);
  }
}

console.log(`\n✅ Seeding complete!`);
console.log(`   Added: ${added} keywords`);
console.log(`   Updated: ${updated} keywords`);
console.log(`   Total: ${added + updated} keywords`);

// Verify
const totalKeywords = db
  .prepare(
    "SELECT COUNT(*) as count FROM keywords WHERE business_id = 'street-lawyer-magic'"
  )
  .get() as { count: number };

console.log(`\n📊 Street Lawyer Magic total keywords: ${totalKeywords.count}`);

db.close();
console.log("\n🎉 Done!");
