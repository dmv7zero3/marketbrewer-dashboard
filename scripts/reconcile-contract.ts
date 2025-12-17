#!/usr/bin/env ts-node
/**
 * Reconcile database keywords (and optionally locations) with contract config.
 *
 * Usage:
 *   npx tsx scripts/reconcile-contract.ts \
 *     [--config config/contract/nash-and-smashed.json] \
 *     [--business-id nash-and-smashed] \
 *     [--apply]
 *
 * By default this runs in dry-run mode and prints a diff.
 * With --apply, it inserts missing keywords and removes extras.
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

interface ContractKeyword {
  keyword: string;
  priority?: number;
}

interface ContractLocation {
  city: string;
  state: string;
  county?: string | null;
  priority?: number;
}

interface ContractConfig {
  business_id: string;
  keywords: ContractKeyword[];
  locations?: ContractLocation[];
}

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function loadConfig(configPath: string): ContractConfig {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config not found: ${configPath}`);
  }
  const cfg = JSON.parse(
    fs.readFileSync(configPath, "utf-8")
  ) as ContractConfig;
  if (!cfg.business_id || !Array.isArray(cfg.keywords)) {
    throw new Error("Invalid config: missing business_id or keywords");
  }
  return cfg;
}

function main(): void {
  const dbPath = process.env.DATABASE_PATH || "./data/seo-platform.db";
  const args = process.argv.slice(2);

  const cfgIdx = args.indexOf("--config");
  const configPath =
    cfgIdx !== -1 && args[cfgIdx + 1]
      ? args[cfgIdx + 1]
      : path.join(process.cwd(), "config/contract/nash-and-smashed.json");
  const apply = args.includes("--apply");
  const bidIdx = args.indexOf("--business-id");
  const businessId =
    bidIdx !== -1 && args[bidIdx + 1] ? args[bidIdx + 1] : "nash-and-smashed";

  console.log("🔎 Contract Reconciliation");
  console.log(`   Database: ${dbPath}`);
  console.log(`   Business: ${businessId}`);
  console.log(`   Config:   ${configPath}`);
  console.log(`   Mode:     ${apply ? "APPLY" : "DRY-RUN"}`);

  const cfg = loadConfig(configPath);

  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");

  // Fetch current keywords for business
  const currentKeywords = db
    .prepare(
      "SELECT slug, keyword, priority FROM keywords WHERE business_id = ? ORDER BY priority DESC"
    )
    .all(businessId) as Array<{
    slug: string;
    keyword: string;
    priority: number;
  }>;

  const contractKwSlugs = new Set(cfg.keywords.map((k) => toSlug(k.keyword)));
  const currentKwSlugs = new Set(currentKeywords.map((k) => k.slug));

  const missing = Array.from(contractKwSlugs).filter(
    (s) => !currentKwSlugs.has(s)
  );
  const extra = Array.from(currentKwSlugs).filter(
    (s) => !contractKwSlugs.has(s)
  );

  console.log(`\n📊 Keywords Diff`);
  console.log(`   Contract: ${cfg.keywords.length}`);
  console.log(`   Current:  ${currentKeywords.length}`);
  console.log(`   Missing:  ${missing.length}`);
  console.log(`   Extra:    ${extra.length}`);

  if (missing.length > 0) {
    console.log("   ➕ Missing keywords to insert:");
    for (const s of missing) {
      const kw = cfg.keywords.find((k) => toSlug(k.keyword) === s)!;
      console.log(`     - ${kw.keyword}`);
    }
  }

  if (extra.length > 0) {
    console.log("   ➖ Extra keywords to remove:");
    for (const s of extra) {
      const kw = currentKeywords.find((k) => k.slug === s)!;
      console.log(`     - ${kw.keyword}`);
    }
  }

  if (apply) {
    const now = new Date().toISOString();
    const insert = db.prepare(
      "INSERT INTO keywords (id, business_id, slug, keyword, search_intent, priority, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    const del = db.prepare(
      "DELETE FROM keywords WHERE business_id = ? AND slug = ?"
    );

    const generateId = (): string =>
      "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

    db.transaction(() => {
      for (const s of missing) {
        const kw = cfg.keywords.find((k) => toSlug(k.keyword) === s)!;
        insert.run(
          generateId(),
          businessId,
          s,
          kw.keyword,
          null,
          kw.priority ?? 5,
          now
        );
      }
      for (const s of extra) {
        del.run(businessId, s);
      }
    })();

    console.log("\n✅ Applied keyword reconciliation");
  }

  // Optional: locations reconciliation (report-only unless --apply-locations provided)
  if (cfg.locations && cfg.locations.length > 0) {
    const currentAreas = db
      .prepare(
        "SELECT slug, city, state FROM service_areas WHERE business_id = ? ORDER BY priority DESC"
      )
      .all(businessId) as Array<{ slug: string; city: string; state: string }>;

    const contractAreaSlugs = new Set(
      cfg.locations.map((a) => `${toSlug(a.city)}-${a.state.toLowerCase()}`)
    );
    const currentAreaSlugs = new Set(currentAreas.map((a) => a.slug));

    const missingAreas = Array.from(contractAreaSlugs).filter(
      (s) => !currentAreaSlugs.has(s)
    );
    const extraAreas = Array.from(currentAreaSlugs).filter(
      (s) => !contractAreaSlugs.has(s)
    );

    console.log(`\n📍 Service Areas Diff`);
    console.log(`   Contract: ${cfg.locations.length}`);
    console.log(`   Current:  ${currentAreas.length}`);
    console.log(`   Missing:  ${missingAreas.length}`);
    console.log(`   Extra:    ${extraAreas.length}`);
  } else {
    console.log(
      "\n📍 Service Areas: no contract locations provided (skipping)."
    );
  }

  db.close();
}

main();
