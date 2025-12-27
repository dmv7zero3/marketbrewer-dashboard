/**
 * DynamoDB Service for Business Profile Persistence
 *
 * This service handles the persistence of business profile data to DynamoDB.
 * Job generation data (generation_jobs, job_pages, workers) stays in SQLite.
 *
 * Tables:
 * - seo_businesses: Core business info
 * - seo_questionnaires: Business questionnaire data
 * - seo_keywords: SEO keywords per business
 * - seo_service_areas: Service area locations per business
 * - seo_prompt_templates: Prompt templates per business
 */

import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  ResourceNotFoundException,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
  ScanCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";

// Types
export interface DynamoBusinessRecord {
  business_id: string;
  name: string;
  industry: string;
  industry_type?: string;
  phone?: string;
  email?: string;
  website?: string;
  primary_city?: string;
  primary_state?: string;
  gbp_url?: string;
  created_at: string;
  updated_at: string;
  _version: number; // Optimistic locking
  _deleted: boolean; // Soft delete flag
}

export interface DynamoQuestionnaireRecord {
  business_id: string;
  data: Record<string, unknown>;
  completeness_score: number;
  created_at: string;
  updated_at: string;
  _version: number;
}

export interface DynamoKeywordRecord {
  business_id: string;
  keyword_id: string; // Sort key: slug#language
  slug: string;
  keyword: string;
  search_intent?: string;
  language: "en" | "es";
  created_at: string;
  _deleted: boolean;
}

export interface DynamoServiceAreaRecord {
  business_id: string;
  area_id: string; // Sort key: slug
  slug: string;
  city: string;
  state: string;
  country: string;
  county?: string;
  priority: number;
  location_id?: string;
  created_at: string;
  updated_at: string;
  _deleted: boolean;
}

export interface DynamoPromptTemplateRecord {
  business_id: string;
  template_id: string; // Sort key: page_type#version
  page_type: "location-keyword" | "service-area";
  version: number;
  template: string;
  required_variables?: string[];
  optional_variables?: string[];
  word_count_target: number;
  is_active: boolean;
  created_at: string;
  _deleted: boolean;
}

// Table names (with environment prefix)
const TABLE_PREFIX = process.env.DYNAMODB_TABLE_PREFIX || "seo";
const TABLES = {
  businesses: `${TABLE_PREFIX}_businesses`,
  questionnaires: `${TABLE_PREFIX}_questionnaires`,
  keywords: `${TABLE_PREFIX}_keywords`,
  service_areas: `${TABLE_PREFIX}_service_areas`,
  prompt_templates: `${TABLE_PREFIX}_prompt_templates`,
};

// DynamoDB client singleton
let client: DynamoDBClient | null = null;
let docClient: DynamoDBDocumentClient | null = null;

/**
 * Initialize DynamoDB clients
 */
export function initDynamoDB(): DynamoDBDocumentClient {
  if (docClient) return docClient;

  const region = process.env.AWS_REGION || "us-east-1";

  client = new DynamoDBClient({ region });
  docClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true,
      convertEmptyValues: false,
    },
    unmarshallOptions: {
      wrapNumbers: false,
    },
  });

  console.log(`DynamoDB initialized for region: ${region}`);
  return docClient;
}

/**
 * Get the DynamoDB document client
 */
export function getDynamoClient(): DynamoDBDocumentClient {
  if (!docClient) {
    return initDynamoDB();
  }
  return docClient;
}

/**
 * Check if a table exists
 */
async function tableExists(tableName: string): Promise<boolean> {
  try {
    await client!.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      return false;
    }
    throw error;
  }
}

/**
 * Create all DynamoDB tables if they don't exist
 */
export async function createTables(): Promise<void> {
  if (!client) initDynamoDB();

  const tableDefinitions = [
    {
      TableName: TABLES.businesses,
      KeySchema: [{ AttributeName: "business_id", KeyType: "HASH" as const }],
      AttributeDefinitions: [
        { AttributeName: "business_id", AttributeType: "S" as const },
      ],
      BillingMode: "PAY_PER_REQUEST" as const,
    },
    {
      TableName: TABLES.questionnaires,
      KeySchema: [{ AttributeName: "business_id", KeyType: "HASH" as const }],
      AttributeDefinitions: [
        { AttributeName: "business_id", AttributeType: "S" as const },
      ],
      BillingMode: "PAY_PER_REQUEST" as const,
    },
    {
      TableName: TABLES.keywords,
      KeySchema: [
        { AttributeName: "business_id", KeyType: "HASH" as const },
        { AttributeName: "keyword_id", KeyType: "RANGE" as const },
      ],
      AttributeDefinitions: [
        { AttributeName: "business_id", AttributeType: "S" as const },
        { AttributeName: "keyword_id", AttributeType: "S" as const },
      ],
      BillingMode: "PAY_PER_REQUEST" as const,
    },
    {
      TableName: TABLES.service_areas,
      KeySchema: [
        { AttributeName: "business_id", KeyType: "HASH" as const },
        { AttributeName: "area_id", KeyType: "RANGE" as const },
      ],
      AttributeDefinitions: [
        { AttributeName: "business_id", AttributeType: "S" as const },
        { AttributeName: "area_id", AttributeType: "S" as const },
      ],
      BillingMode: "PAY_PER_REQUEST" as const,
    },
    {
      TableName: TABLES.prompt_templates,
      KeySchema: [
        { AttributeName: "business_id", KeyType: "HASH" as const },
        { AttributeName: "template_id", KeyType: "RANGE" as const },
      ],
      AttributeDefinitions: [
        { AttributeName: "business_id", AttributeType: "S" as const },
        { AttributeName: "template_id", AttributeType: "S" as const },
      ],
      BillingMode: "PAY_PER_REQUEST" as const,
    },
  ];

  for (const tableDef of tableDefinitions) {
    const exists = await tableExists(tableDef.TableName);
    if (!exists) {
      console.log(`Creating table: ${tableDef.TableName}`);
      await client!.send(new CreateTableCommand(tableDef));
      console.log(`Created table: ${tableDef.TableName}`);
    } else {
      console.log(`Table exists: ${tableDef.TableName}`);
    }
  }
}

// ============================================================================
// BUSINESS OPERATIONS
// ============================================================================

/**
 * Save a business to DynamoDB
 */
export async function saveBusiness(
  business: Omit<DynamoBusinessRecord, "_version" | "_deleted">
): Promise<DynamoBusinessRecord> {
  const doc = getDynamoClient();

  const record: DynamoBusinessRecord = {
    ...business,
    _version: 1,
    _deleted: false,
  };

  await doc.send(
    new PutCommand({
      TableName: TABLES.businesses,
      Item: record,
    })
  );

  return record;
}

/**
 * Get a business from DynamoDB
 */
export async function getBusiness(
  businessId: string
): Promise<DynamoBusinessRecord | null> {
  const doc = getDynamoClient();

  const result = await doc.send(
    new GetCommand({
      TableName: TABLES.businesses,
      Key: { business_id: businessId },
    })
  );

  if (!result.Item || result.Item._deleted) {
    return null;
  }

  return result.Item as DynamoBusinessRecord;
}

/**
 * List all businesses from DynamoDB
 */
export async function listBusinesses(): Promise<DynamoBusinessRecord[]> {
  const doc = getDynamoClient();

  const result = await doc.send(
    new ScanCommand({
      TableName: TABLES.businesses,
      FilterExpression: "#deleted = :false OR attribute_not_exists(#deleted)",
      ExpressionAttributeNames: { "#deleted": "_deleted" },
      ExpressionAttributeValues: { ":false": false },
    })
  );

  return (result.Items || []) as DynamoBusinessRecord[];
}

/**
 * Update a business in DynamoDB with optimistic locking
 */
export async function updateBusiness(
  businessId: string,
  updates: Partial<DynamoBusinessRecord>,
  expectedVersion: number
): Promise<DynamoBusinessRecord> {
  const doc = getDynamoClient();

  const existing = await getBusiness(businessId);
  if (!existing) {
    throw new Error(`Business ${businessId} not found`);
  }

  if (existing._version !== expectedVersion) {
    throw new Error(
      `Version mismatch: expected ${expectedVersion}, got ${existing._version}`
    );
  }

  const record: DynamoBusinessRecord = {
    ...existing,
    ...updates,
    business_id: businessId, // Ensure ID doesn't change
    updated_at: new Date().toISOString(),
    _version: expectedVersion + 1,
  };

  await doc.send(
    new PutCommand({
      TableName: TABLES.businesses,
      Item: record,
      ConditionExpression: "_version = :expectedVersion",
      ExpressionAttributeValues: { ":expectedVersion": expectedVersion },
    })
  );

  return record;
}

/**
 * Soft delete a business (sets _deleted flag)
 */
export async function softDeleteBusiness(businessId: string): Promise<void> {
  const doc = getDynamoClient();

  const existing = await getBusiness(businessId);
  if (!existing) {
    return; // Already deleted or doesn't exist
  }

  await doc.send(
    new PutCommand({
      TableName: TABLES.businesses,
      Item: {
        ...existing,
        _deleted: true,
        updated_at: new Date().toISOString(),
        _version: existing._version + 1,
      },
    })
  );
}

// ============================================================================
// QUESTIONNAIRE OPERATIONS
// ============================================================================

/**
 * Save a questionnaire to DynamoDB
 */
export async function saveQuestionnaire(
  questionnaire: Omit<DynamoQuestionnaireRecord, "_version">
): Promise<DynamoQuestionnaireRecord> {
  const doc = getDynamoClient();

  const record: DynamoQuestionnaireRecord = {
    ...questionnaire,
    _version: 1,
  };

  await doc.send(
    new PutCommand({
      TableName: TABLES.questionnaires,
      Item: record,
    })
  );

  return record;
}

/**
 * Get a questionnaire from DynamoDB
 */
export async function getQuestionnaire(
  businessId: string
): Promise<DynamoQuestionnaireRecord | null> {
  const doc = getDynamoClient();

  const result = await doc.send(
    new GetCommand({
      TableName: TABLES.questionnaires,
      Key: { business_id: businessId },
    })
  );

  return (result.Item as DynamoQuestionnaireRecord) || null;
}

/**
 * Update a questionnaire with optimistic locking
 */
export async function updateQuestionnaire(
  businessId: string,
  data: Record<string, unknown>,
  completenessScore: number,
  expectedVersion: number
): Promise<DynamoQuestionnaireRecord> {
  const doc = getDynamoClient();

  const existing = await getQuestionnaire(businessId);
  if (!existing) {
    throw new Error(`Questionnaire for business ${businessId} not found`);
  }

  if (existing._version !== expectedVersion) {
    throw new Error(
      `Version mismatch: expected ${expectedVersion}, got ${existing._version}`
    );
  }

  const record: DynamoQuestionnaireRecord = {
    business_id: businessId,
    data,
    completeness_score: completenessScore,
    created_at: existing.created_at,
    updated_at: new Date().toISOString(),
    _version: expectedVersion + 1,
  };

  await doc.send(
    new PutCommand({
      TableName: TABLES.questionnaires,
      Item: record,
      ConditionExpression: "_version = :expectedVersion",
      ExpressionAttributeValues: { ":expectedVersion": expectedVersion },
    })
  );

  return record;
}

// ============================================================================
// KEYWORD OPERATIONS
// ============================================================================

/**
 * Save a keyword to DynamoDB
 */
export async function saveKeyword(
  keyword: Omit<DynamoKeywordRecord, "keyword_id" | "_deleted">
): Promise<DynamoKeywordRecord> {
  const doc = getDynamoClient();

  const keywordId = `${keyword.slug}#${keyword.language}`;
  const record: DynamoKeywordRecord = {
    ...keyword,
    keyword_id: keywordId,
    _deleted: false,
  };

  await doc.send(
    new PutCommand({
      TableName: TABLES.keywords,
      Item: record,
    })
  );

  return record;
}

/**
 * Get keywords for a business
 */
export async function getKeywords(
  businessId: string
): Promise<DynamoKeywordRecord[]> {
  const doc = getDynamoClient();

  const result = await doc.send(
    new QueryCommand({
      TableName: TABLES.keywords,
      KeyConditionExpression: "business_id = :bid",
      FilterExpression: "#deleted = :false OR attribute_not_exists(#deleted)",
      ExpressionAttributeNames: { "#deleted": "_deleted" },
      ExpressionAttributeValues: {
        ":bid": businessId,
        ":false": false,
      },
    })
  );

  return (result.Items || []) as DynamoKeywordRecord[];
}

/**
 * Batch save keywords
 */
export async function batchSaveKeywords(
  keywords: Array<Omit<DynamoKeywordRecord, "keyword_id" | "_deleted">>
): Promise<void> {
  const doc = getDynamoClient();

  // DynamoDB batch write limit is 25 items
  const batches: DynamoKeywordRecord[][] = [];
  const records = keywords.map((k) => ({
    ...k,
    keyword_id: `${k.slug}#${k.language}`,
    _deleted: false,
  }));

  for (let i = 0; i < records.length; i += 25) {
    batches.push(records.slice(i, i + 25));
  }

  for (const batch of batches) {
    await doc.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLES.keywords]: batch.map((item) => ({
            PutRequest: { Item: item },
          })),
        },
      })
    );
  }
}

/**
 * Soft delete a keyword
 */
export async function softDeleteKeyword(
  businessId: string,
  slug: string,
  language: "en" | "es"
): Promise<void> {
  const doc = getDynamoClient();

  const keywordId = `${slug}#${language}`;

  const result = await doc.send(
    new GetCommand({
      TableName: TABLES.keywords,
      Key: { business_id: businessId, keyword_id: keywordId },
    })
  );

  if (result.Item) {
    await doc.send(
      new PutCommand({
        TableName: TABLES.keywords,
        Item: { ...result.Item, _deleted: true },
      })
    );
  }
}

// ============================================================================
// SERVICE AREA OPERATIONS
// ============================================================================

/**
 * Save a service area to DynamoDB
 */
export async function saveServiceArea(
  area: Omit<DynamoServiceAreaRecord, "area_id" | "_deleted">
): Promise<DynamoServiceAreaRecord> {
  const doc = getDynamoClient();

  const record: DynamoServiceAreaRecord = {
    ...area,
    area_id: area.slug,
    _deleted: false,
  };

  await doc.send(
    new PutCommand({
      TableName: TABLES.service_areas,
      Item: record,
    })
  );

  return record;
}

/**
 * Get service areas for a business
 */
export async function getServiceAreas(
  businessId: string
): Promise<DynamoServiceAreaRecord[]> {
  const doc = getDynamoClient();

  const result = await doc.send(
    new QueryCommand({
      TableName: TABLES.service_areas,
      KeyConditionExpression: "business_id = :bid",
      FilterExpression: "#deleted = :false OR attribute_not_exists(#deleted)",
      ExpressionAttributeNames: { "#deleted": "_deleted" },
      ExpressionAttributeValues: {
        ":bid": businessId,
        ":false": false,
      },
    })
  );

  return (result.Items || []) as DynamoServiceAreaRecord[];
}

/**
 * Batch save service areas
 */
export async function batchSaveServiceAreas(
  areas: Array<Omit<DynamoServiceAreaRecord, "area_id" | "_deleted">>
): Promise<void> {
  const doc = getDynamoClient();

  const batches: DynamoServiceAreaRecord[][] = [];
  const records = areas.map((a) => ({
    ...a,
    area_id: a.slug,
    _deleted: false,
  }));

  for (let i = 0; i < records.length; i += 25) {
    batches.push(records.slice(i, i + 25));
  }

  for (const batch of batches) {
    await doc.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLES.service_areas]: batch.map((item) => ({
            PutRequest: { Item: item },
          })),
        },
      })
    );
  }
}

/**
 * Soft delete a service area
 */
export async function softDeleteServiceArea(
  businessId: string,
  slug: string
): Promise<void> {
  const doc = getDynamoClient();

  const result = await doc.send(
    new GetCommand({
      TableName: TABLES.service_areas,
      Key: { business_id: businessId, area_id: slug },
    })
  );

  if (result.Item) {
    await doc.send(
      new PutCommand({
        TableName: TABLES.service_areas,
        Item: { ...result.Item, _deleted: true },
      })
    );
  }
}

// ============================================================================
// PROMPT TEMPLATE OPERATIONS
// ============================================================================

/**
 * Save a prompt template to DynamoDB
 */
export async function savePromptTemplate(
  template: Omit<DynamoPromptTemplateRecord, "template_id" | "_deleted">
): Promise<DynamoPromptTemplateRecord> {
  const doc = getDynamoClient();

  const templateId = `${template.page_type}#${template.version}`;
  const record: DynamoPromptTemplateRecord = {
    ...template,
    template_id: templateId,
    _deleted: false,
  };

  await doc.send(
    new PutCommand({
      TableName: TABLES.prompt_templates,
      Item: record,
    })
  );

  return record;
}

/**
 * Get prompt templates for a business
 */
export async function getPromptTemplates(
  businessId: string
): Promise<DynamoPromptTemplateRecord[]> {
  const doc = getDynamoClient();

  const result = await doc.send(
    new QueryCommand({
      TableName: TABLES.prompt_templates,
      KeyConditionExpression: "business_id = :bid",
      FilterExpression: "#deleted = :false OR attribute_not_exists(#deleted)",
      ExpressionAttributeNames: { "#deleted": "_deleted" },
      ExpressionAttributeValues: {
        ":bid": businessId,
        ":false": false,
      },
    })
  );

  return (result.Items || []) as DynamoPromptTemplateRecord[];
}

/**
 * Get active prompt template for a page type
 */
export async function getActivePromptTemplate(
  businessId: string,
  pageType: "location-keyword" | "service-area"
): Promise<DynamoPromptTemplateRecord | null> {
  const templates = await getPromptTemplates(businessId);

  const active = templates
    .filter((t) => t.page_type === pageType && t.is_active)
    .sort((a, b) => b.version - a.version)[0];

  return active || null;
}

// ============================================================================
// SYNC UTILITIES
// ============================================================================

/**
 * Export all data for a business (for backup/migration)
 */
export async function exportBusinessData(businessId: string): Promise<{
  business: DynamoBusinessRecord | null;
  questionnaire: DynamoQuestionnaireRecord | null;
  keywords: DynamoKeywordRecord[];
  serviceAreas: DynamoServiceAreaRecord[];
  promptTemplates: DynamoPromptTemplateRecord[];
}> {
  const [business, questionnaire, keywords, serviceAreas, promptTemplates] =
    await Promise.all([
      getBusiness(businessId),
      getQuestionnaire(businessId),
      getKeywords(businessId),
      getServiceAreas(businessId),
      getPromptTemplates(businessId),
    ]);

  return {
    business,
    questionnaire,
    keywords,
    serviceAreas,
    promptTemplates,
  };
}

/**
 * Get table names for external use
 */
export function getTableNames() {
  return TABLES;
}
