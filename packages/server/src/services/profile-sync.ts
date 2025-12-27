/**
 * Profile Sync Service
 *
 * Synchronizes business profile data between DynamoDB (persistent) and SQLite (local cache).
 *
 * Strategy:
 * - DynamoDB is the source of truth for business profiles
 * - SQLite is a local cache for fast reads during job generation
 * - Writes go to DynamoDB first, then sync to SQLite
 * - On server start, sync SQLite from DynamoDB
 */

import Database from "better-sqlite3";
import {
  initDynamoDB,
  listBusinesses,
  getBusiness,
  getQuestionnaire,
  getKeywords,
  getServiceAreas,
  getPromptTemplates,
  saveBusiness,
  saveQuestionnaire,
  batchSaveKeywords,
  batchSaveServiceAreas,
  savePromptTemplate,
  exportBusinessData,
  DynamoBusinessRecord,
  DynamoQuestionnaireRecord,
  DynamoKeywordRecord,
  DynamoServiceAreaRecord,
  DynamoPromptTemplateRecord,
} from "./dynamodb";

// Generate UUID (simple version)
function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Sync all businesses from DynamoDB to SQLite
 */
export async function syncAllFromDynamoDB(db: Database.Database): Promise<{
  businesses: number;
  keywords: number;
  serviceAreas: number;
  templates: number;
}> {
  console.log("Starting full sync from DynamoDB...");

  initDynamoDB();

  const businesses = await listBusinesses();
  let keywordCount = 0;
  let areaCount = 0;
  let templateCount = 0;

  for (const business of businesses) {
    await syncBusinessToSQLite(db, business.business_id);

    const keywords = await getKeywords(business.business_id);
    const areas = await getServiceAreas(business.business_id);
    const templates = await getPromptTemplates(business.business_id);

    keywordCount += keywords.length;
    areaCount += areas.length;
    templateCount += templates.length;
  }

  console.log(`Sync complete: ${businesses.length} businesses, ${keywordCount} keywords, ${areaCount} service areas, ${templateCount} templates`);

  return {
    businesses: businesses.length,
    keywords: keywordCount,
    serviceAreas: areaCount,
    templates: templateCount,
  };
}

/**
 * Sync a single business from DynamoDB to SQLite
 */
export async function syncBusinessToSQLite(
  db: Database.Database,
  businessId: string
): Promise<void> {
  const data = await exportBusinessData(businessId);

  if (!data.business) {
    console.warn(`Business ${businessId} not found in DynamoDB`);
    return;
  }

  // Use transaction for atomic updates
  const transaction = db.transaction(() => {
    // Sync business
    const existingBusiness = db
      .prepare("SELECT id FROM businesses WHERE id = ?")
      .get(businessId);

    if (existingBusiness) {
      db.prepare(`
        UPDATE businesses SET
          name = ?,
          industry = ?,
          phone = ?,
          email = ?,
          website = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        data.business!.name,
        data.business!.industry,
        data.business!.phone || null,
        data.business!.email || null,
        data.business!.website || null,
        businessId
      );
    } else {
      db.prepare(`
        INSERT INTO businesses (id, name, industry, phone, email, website, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        businessId,
        data.business!.name,
        data.business!.industry,
        data.business!.phone || null,
        data.business!.email || null,
        data.business!.website || null,
        data.business!.created_at
      );
    }

    // Sync questionnaire
    if (data.questionnaire) {
      const existingQ = db
        .prepare("SELECT id FROM questionnaires WHERE business_id = ?")
        .get(businessId);

      if (existingQ) {
        db.prepare(`
          UPDATE questionnaires SET
            data = ?,
            completeness_score = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE business_id = ?
        `).run(
          JSON.stringify(data.questionnaire.data),
          data.questionnaire.completeness_score,
          businessId
        );
      } else {
        db.prepare(`
          INSERT INTO questionnaires (id, business_id, data, completeness_score, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(
          generateId(),
          businessId,
          JSON.stringify(data.questionnaire.data),
          data.questionnaire.completeness_score,
          data.questionnaire.created_at
        );
      }
    }

    // Sync keywords - replace all
    db.prepare("DELETE FROM keywords WHERE business_id = ?").run(businessId);
    const insertKeyword = db.prepare(`
      INSERT INTO keywords (id, business_id, slug, keyword, search_intent, language, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const kw of data.keywords) {
      insertKeyword.run(
        generateId(),
        businessId,
        kw.slug,
        kw.keyword,
        kw.search_intent || null,
        kw.language,
        kw.created_at
      );
    }

    // Sync service areas - replace all
    db.prepare("DELETE FROM service_areas WHERE business_id = ?").run(businessId);
    const insertArea = db.prepare(`
      INSERT INTO service_areas (id, business_id, slug, city, state, country, county, priority, location_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    for (const area of data.serviceAreas) {
      insertArea.run(
        generateId(),
        businessId,
        area.slug,
        area.city,
        area.state,
        area.country,
        area.county || null,
        area.priority,
        area.location_id || null,
        area.created_at
      );
    }

    // Sync prompt templates - replace all
    db.prepare("DELETE FROM prompt_templates WHERE business_id = ?").run(businessId);
    const insertTemplate = db.prepare(`
      INSERT INTO prompt_templates (id, business_id, page_type, version, template, required_variables, optional_variables, word_count_target, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const tmpl of data.promptTemplates) {
      insertTemplate.run(
        generateId(),
        businessId,
        tmpl.page_type,
        tmpl.version,
        tmpl.template,
        JSON.stringify(tmpl.required_variables || []),
        JSON.stringify(tmpl.optional_variables || []),
        tmpl.word_count_target,
        tmpl.is_active ? 1 : 0,
        tmpl.created_at
      );
    }
  });

  transaction();
  console.log(`Synced business ${businessId} to SQLite`);
}

/**
 * Sync a business from SQLite to DynamoDB (for migration)
 */
export async function syncBusinessToDynamoDB(
  db: Database.Database,
  businessId: string
): Promise<void> {
  initDynamoDB();

  // Get business from SQLite
  const business = db
    .prepare("SELECT * FROM businesses WHERE id = ?")
    .get(businessId) as {
    id: string;
    name: string;
    industry: string;
    phone?: string;
    email?: string;
    website?: string;
    created_at: string;
    updated_at: string;
  } | undefined;

  if (!business) {
    throw new Error(`Business ${businessId} not found in SQLite`);
  }

  // Save business to DynamoDB
  await saveBusiness({
    business_id: business.id,
    name: business.name,
    industry: business.industry,
    phone: business.phone,
    email: business.email,
    website: business.website,
    created_at: business.created_at,
    updated_at: business.updated_at,
  });

  // Get and save questionnaire
  const questionnaire = db
    .prepare("SELECT * FROM questionnaires WHERE business_id = ?")
    .get(businessId) as {
    data: string;
    completeness_score: number;
    created_at: string;
    updated_at: string;
  } | undefined;

  if (questionnaire) {
    await saveQuestionnaire({
      business_id: businessId,
      data: JSON.parse(questionnaire.data),
      completeness_score: questionnaire.completeness_score,
      created_at: questionnaire.created_at,
      updated_at: questionnaire.updated_at,
    });
  }

  // Get and save keywords
  const keywords = db
    .prepare("SELECT * FROM keywords WHERE business_id = ?")
    .all(businessId) as Array<{
    slug: string;
    keyword: string;
    search_intent?: string;
    language: "en" | "es";
    created_at: string;
  }>;

  if (keywords.length > 0) {
    await batchSaveKeywords(
      keywords.map((kw) => ({
        business_id: businessId,
        slug: kw.slug,
        keyword: kw.keyword,
        search_intent: kw.search_intent,
        language: kw.language,
        created_at: kw.created_at,
      }))
    );
  }

  // Get and save service areas
  const areas = db
    .prepare("SELECT * FROM service_areas WHERE business_id = ?")
    .all(businessId) as Array<{
    slug: string;
    city: string;
    state: string;
    country: string;
    county?: string;
    priority: number;
    location_id?: string;
    created_at: string;
    updated_at: string;
  }>;

  if (areas.length > 0) {
    await batchSaveServiceAreas(
      areas.map((area) => ({
        business_id: businessId,
        slug: area.slug,
        city: area.city,
        state: area.state,
        country: area.country,
        county: area.county,
        priority: area.priority,
        location_id: area.location_id,
        created_at: area.created_at,
        updated_at: area.updated_at,
      }))
    );
  }

  // Get and save prompt templates
  const templates = db
    .prepare("SELECT * FROM prompt_templates WHERE business_id = ?")
    .all(businessId) as Array<{
    page_type: "location-keyword" | "service-area";
    version: number;
    template: string;
    required_variables: string;
    optional_variables: string;
    word_count_target: number;
    is_active: number;
    created_at: string;
  }>;

  for (const tmpl of templates) {
    await savePromptTemplate({
      business_id: businessId,
      page_type: tmpl.page_type,
      version: tmpl.version,
      template: tmpl.template,
      required_variables: JSON.parse(tmpl.required_variables || "[]"),
      optional_variables: JSON.parse(tmpl.optional_variables || "[]"),
      word_count_target: tmpl.word_count_target,
      is_active: tmpl.is_active === 1,
      created_at: tmpl.created_at,
    });
  }

  console.log(`Synced business ${businessId} to DynamoDB`);
}

/**
 * Check if DynamoDB is available and configured
 */
export async function isDynamoDBAvailable(): Promise<boolean> {
  try {
    initDynamoDB();
    await listBusinesses(); // Simple test query
    return true;
  } catch {
    return false;
  }
}
