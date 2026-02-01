import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { SQSClient, SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";

const REGION = process.env.AWS_REGION || "us-east-1";
const TABLE_NAME = process.env.DDB_TABLE_NAME || "marketbrewer-dashboard";
const API_TOKEN = process.env.API_TOKEN || "";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const DDB_ENDPOINT = process.env.DDB_ENDPOINT;
const SQS_ENDPOINT = process.env.SQS_ENDPOINT;
const CORS_ALLOW_ORIGINS = (process.env.CORS_ALLOW_ORIGINS || "https://admin.marketbrewer.com")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const GOOGLE_ALLOWED_EMAILS = (process.env.GOOGLE_ALLOWED_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL || "";
const RATE_LIMIT_PER_MIN = parseInt(process.env.RATE_LIMIT_PER_MIN || "120", 10);
const WEBHOOK_EVENTS = ["job.completed", "job.failed"] as const;

const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION, endpoint: DDB_ENDPOINT })
);
const sqs = new SQSClient({ region: REGION, endpoint: SQS_ENDPOINT });
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

const BASE_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
};

type AuthContext = {
  identity: string;
};

let currentHeaders = BASE_HEADERS;
let currentRequestContext: { requestId?: string; method?: string; path?: string } | null = null;

function resolveCorsOrigin(requestOrigin?: string | null): string {
  if (CORS_ALLOW_ORIGINS.includes("*")) {
    return "*";
  }
  if (requestOrigin && CORS_ALLOW_ORIGINS.includes(requestOrigin)) {
    return requestOrigin;
  }
  return CORS_ALLOW_ORIGINS[0] || "https://admin.marketbrewer.com";
}

function buildHeaders(requestOrigin?: string | null, requestId?: string) {
  return {
    ...BASE_HEADERS,
    "Access-Control-Allow-Origin": resolveCorsOrigin(requestOrigin),
    Vary: "Origin",
    ...(requestId ? { "X-Request-Id": requestId } : {}),
  };
}

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: currentHeaders,
    body: JSON.stringify(body),
  };
}

function logEvent(level: "INFO" | "WARN" | "ERROR", message: string, data: Record<string, unknown> = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...currentRequestContext,
    ...data,
  };
  console.log(JSON.stringify(payload));
}

function ok(body: unknown): APIGatewayProxyResultV2 {
  return json(200, body);
}

function created(body: unknown): APIGatewayProxyResultV2 {
  return json(201, body);
}

function badRequest(message: string): APIGatewayProxyResultV2 {
  logEvent("WARN", "bad_request", { error: message });
  return json(400, { error: message });
}

function unauthorized(message: string): APIGatewayProxyResultV2 {
  logEvent("WARN", "unauthorized", { error: message });
  return json(401, { error: message, code: "UNAUTHORIZED" });
}

function forbidden(message: string): APIGatewayProxyResultV2 {
  logEvent("WARN", "forbidden", { error: message });
  return json(403, { error: message, code: "FORBIDDEN" });
}

function tooManyRequests(message: string): APIGatewayProxyResultV2 {
  logEvent("WARN", "rate_limited", { error: message });
  return json(429, { error: message, code: "RATE_LIMITED" });
}

function notFound(message: string): APIGatewayProxyResultV2 {
  logEvent("WARN", "not_found", { error: message });
  return json(404, { error: message, code: "NOT_FOUND" });
}

function generateId(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

async function verifyGoogleToken(token: string): Promise<string | null> {
  if (!googleClient || !GOOGLE_CLIENT_ID) {
    return null;
  }
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email || payload.email_verified === false) {
      return null;
    }
    if (
      GOOGLE_ALLOWED_EMAILS.length > 0 &&
      !GOOGLE_ALLOWED_EMAILS.includes(payload.email.toLowerCase())
    ) {
      return null;
    }
    return payload.email;
  } catch {
    return null;
  }
}

async function authenticate(event: APIGatewayProxyEventV2): Promise<AuthContext | null> {
  if (event.rawPath === "/health" || event.rawPath === "/api/health") {
    return { identity: "health" };
  }

  const header = event.headers?.authorization || event.headers?.Authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice(7);
  if (API_TOKEN && token === API_TOKEN) {
    return { identity: "api-token" };
  }
  if (GOOGLE_CLIENT_ID) {
    const email = await verifyGoogleToken(token);
    if (email) {
      return { identity: email };
    }
  }
  return null;
}

async function enforceRateLimit(identity: string): Promise<boolean> {
  if (!RATE_LIMIT_PER_MIN || RATE_LIMIT_PER_MIN <= 0) {
    return true;
  }
  if (identity === "health") {
    return true;
  }
  const minuteBucket = Math.floor(Date.now() / 60000);
  const key = { PK: `RATE#${identity}`, SK: `MINUTE#${minuteBucket}` };
  try {
    await dynamo.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: key,
        UpdateExpression: "ADD #count :inc SET #updated_at = :updated_at, #expires_at = :expires_at",
        ConditionExpression: "attribute_not_exists(#count) OR #count < :limit",
        ExpressionAttributeNames: {
          "#count": "count",
          "#updated_at": "updated_at",
          "#expires_at": "expires_at",
        },
        ExpressionAttributeValues: {
          ":inc": 1,
          ":limit": RATE_LIMIT_PER_MIN,
          ":updated_at": nowIso(),
          ":expires_at": Math.floor(Date.now() / 1000) + 3600,
        },
      })
    );
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
      return false;
    }
    throw error;
  }
}

function parseBody<T>(event: APIGatewayProxyEventV2): T | null {
  if (!event.body) {
    return null;
  }
  try {
    return JSON.parse(event.body) as T;
  } catch {
    return null;
  }
}

function businessKey(businessId: string) {
  return { PK: "BUSINESS", SK: `BUSINESS#${businessId}` };
}

function businessPartition(businessId: string) {
  return { PK: `BUSINESS#${businessId}` };
}

function profileLocationKey(businessId: string, locationId: string) {
  return { ...businessPartition(businessId), SK: `PROFILE_LOCATION#${locationId}` };
}

function webhookKey(webhookId: string) {
  return { PK: "WEBHOOK", SK: `WEBHOOK#${webhookId}` };
}

type ServiceOffering = { name: string; slug?: string; nameEs?: string };

function extractServices(questionnaireItem?: { data?: unknown }): ServiceOffering[] {
  const services =
    (questionnaireItem?.data as { services?: { offerings?: ServiceOffering[] } } | undefined)
      ?.services?.offerings || [];
  return services.filter((service) => service?.name);
}

function normalizeServiceSlug(service: ServiceOffering): string {
  return service.slug || service.name.toLowerCase().replace(/\s+/g, "-");
}

function normalizePageType(
  pageType: string
):
  | "keyword-service-area"
  | "keyword-location"
  | "service-service-area"
  | "service-location"
  | "blog-service-area"
  | "blog-location"
  | null {
  if (pageType === "keyword-service-area" || pageType === "service-area") {
    return "keyword-service-area";
  }
  if (pageType === "keyword-location" || pageType === "location-keyword") {
    return "keyword-location";
  }
  if (pageType === "service-service-area") {
    return "service-service-area";
  }
  if (pageType === "service-location") {
    return "service-location";
  }
  if (pageType === "blog-service-area") {
    return "blog-service-area";
  }
  if (pageType === "blog-location") {
    return "blog-location";
  }
  return null;
}

function countPages(
  pageType:
    | "keyword-service-area"
    | "keyword-location"
    | "service-service-area"
    | "service-location"
    | "blog-service-area"
    | "blog-location",
  keywords: Array<Record<string, unknown>>,
  serviceAreas: Array<Record<string, unknown>>,
  locations: Array<Record<string, unknown>>,
  services: ServiceOffering[]
): number {
  switch (pageType) {
    case "keyword-service-area":
      return keywords.length * serviceAreas.length;
    case "keyword-location":
      return keywords.length * locations.length;
    case "service-service-area":
      return services.length * serviceAreas.length;
    case "service-location":
      return services.length * locations.length;
    case "blog-service-area":
      return keywords.length * serviceAreas.length;
    case "blog-location":
      return keywords.length * locations.length;
    default:
      return 0;
  }
}

function ensureQueue(): string | null {
  if (!SQS_QUEUE_URL) {
    return null;
  }
  return SQS_QUEUE_URL;
}

async function listBusinesses(): Promise<APIGatewayProxyResultV2> {
  const result = await dynamo.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": "BUSINESS" },
    })
  );
  const businesses = (result.Items || []).map((item) => ({
    id: item.business_id,
    name: item.name,
    industry: item.industry,
    industry_type: item.industry_type ?? item.industry,
    website: item.website,
    phone: item.phone,
    email: item.email,
    gbp_url: item.gbp_url ?? null,
    primary_city: item.primary_city ?? null,
    primary_state: item.primary_state ?? null,
    created_at: item.created_at,
    updated_at: item.updated_at,
  }));
  return ok({ businesses });
}

async function getBusiness(businessId: string): Promise<APIGatewayProxyResultV2> {
  const result = await dynamo.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: businessKey(businessId),
    })
  );
  if (!result.Item) {
    return notFound("Business not found");
  }
  return ok({ business: result.Item });
}

async function createBusiness(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const body = parseBody<{
    name: string;
    industry?: string;
    industry_type?: string;
    website?: string;
    phone?: string;
    email?: string;
    gbp_url?: string;
  }>(event);
  if (!body?.name || !(body.industry || body.industry_type)) {
    return badRequest("Missing required fields: name, industry");
  }
  const id = generateId();
  const now = nowIso();
  const industryType = body.industry_type ?? body.industry;
  const industryLegacy = body.industry ?? industryType;
  const item = {
    ...businessKey(id),
    business_id: id,
    name: body.name,
    industry: industryLegacy,
    industry_type: industryType,
    website: body.website || null,
    phone: body.phone || null,
    email: body.email || null,
    gbp_url: body.gbp_url || null,
    primary_city: null,
    primary_state: null,
    created_at: now,
    updated_at: now,
    type: "business",
  };
  await dynamo.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  await dynamo.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...businessPartition(id),
        SK: "QUESTIONNAIRE",
        data: {},
        completeness_score: 0,
        created_at: now,
        updated_at: now,
        type: "questionnaire",
      },
    })
  );
  return created({ business: item });
}

async function updateBusiness(businessId: string, event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const body = parseBody<Record<string, unknown>>(event);
  if (!body) {
    return badRequest("Invalid JSON body");
  }
  const updates = Object.keys(body).filter((key) => key !== "id");
  if (!updates.length) {
    return badRequest("No fields to update");
  }

  const names: Record<string, string> = { "#updated_at": "updated_at" };
  const values: Record<string, unknown> = { ":updated_at": nowIso() };
  const expressionParts = updates.map((field, idx) => {
    names[`#f${idx}`] = field;
    values[`:v${idx}`] = body[field] ?? null;
    return `#f${idx} = :v${idx}`;
  });

  const result = await dynamo.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: businessKey(businessId),
      UpdateExpression: `SET ${expressionParts.join(", ")}, #updated_at = :updated_at`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: "ALL_NEW",
    })
  );

  if (!result.Attributes) {
    return notFound("Business not found");
  }

  return ok({ business: result.Attributes });
}

async function deleteBusiness(businessId: string): Promise<APIGatewayProxyResultV2> {
  await dynamo.send(new DeleteCommand({ TableName: TABLE_NAME, Key: businessKey(businessId) }));
  return { statusCode: 204, headers: currentHeaders };
}

function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function listWebhooks(): Promise<APIGatewayProxyResultV2> {
  const result = await dynamo.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": "WEBHOOK",
        ":sk": "WEBHOOK#",
      },
    })
  );
  return ok({ webhooks: result.Items || [] });
}

async function createWebhook(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const body = parseBody<{ url: string; events?: string[]; description?: string }>(event);
  if (!body?.url || !isValidWebhookUrl(body.url)) {
    return badRequest("Valid webhook url is required");
  }
  const requestedEvents = Array.isArray(body.events) ? body.events : Array.from(WEBHOOK_EVENTS);
  const events = requestedEvents.filter((evt) => WEBHOOK_EVENTS.includes(evt as (typeof WEBHOOK_EVENTS)[number]));
  if (!events.length) {
    return badRequest(`Events must include one of: ${WEBHOOK_EVENTS.join(", ")}`);
  }

  const id = generateId();
  const now = nowIso();
  const item = {
    ...webhookKey(id),
    id,
    url: body.url,
    events,
    description: body.description || null,
    created_at: now,
    updated_at: now,
    type: "webhook",
  };
  await dynamo.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return created({ webhook: item });
}

async function deleteWebhook(webhookId: string): Promise<APIGatewayProxyResultV2> {
  await dynamo.send(new DeleteCommand({ TableName: TABLE_NAME, Key: webhookKey(webhookId) }));
  return { statusCode: 204, headers: currentHeaders };
}

async function getQuestionnaire(businessId: string): Promise<APIGatewayProxyResultV2> {
  const result = await dynamo.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { ...businessPartition(businessId), SK: "QUESTIONNAIRE" },
    })
  );
  return ok({ questionnaire: result.Item || null });
}

async function updateQuestionnaire(businessId: string, event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const body = parseBody<Record<string, unknown>>(event);
  if (!body) {
    return badRequest("Invalid JSON body");
  }
  const now = nowIso();
  const item = {
    ...businessPartition(businessId),
    SK: "QUESTIONNAIRE",
    data: body,
    completeness_score: body.completeness_score ?? 0,
    updated_at: now,
    created_at: now,
    type: "questionnaire",
  };
  await dynamo.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return ok({ questionnaire: item });
}

async function listEntity(businessId: string, prefix: string, key: string): Promise<APIGatewayProxyResultV2> {
  const result = await dynamo.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `BUSINESS#${businessId}`,
        ":sk": `${prefix}#`,
      },
    })
  );
  return ok({ [key]: result.Items || [] });
}

async function createEntity(
  businessId: string,
  prefix: string,
  body: Record<string, unknown>,
  key: string
): Promise<APIGatewayProxyResultV2> {
  const id = generateId();
  const now = nowIso();
  const item = {
    ...businessPartition(businessId),
    SK: `${prefix}#${id}`,
    id,
    ...body,
    created_at: now,
    updated_at: now,
    type: prefix.toLowerCase(),
  };
  await dynamo.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return created({ [key]: item });
}

async function updateEntity(
  businessId: string,
  prefix: string,
  id: string,
  body: Record<string, unknown>,
  key: string
): Promise<APIGatewayProxyResultV2> {
  if (!body) {
    return badRequest("Invalid JSON body");
  }
  const now = nowIso();
  const names: Record<string, string> = { "#updated_at": "updated_at" };
  const values: Record<string, unknown> = { ":updated_at": now };
  const updates = Object.entries(body).filter(([field]) => field !== "id");
  if (updates.length === 0) {
    return badRequest("No fields to update");
  }
  const expressionParts = updates.map(([field], idx) => {
    names[`#f${idx}`] = field;
    values[`:v${idx}`] = body[field] ?? null;
    return `#f${idx} = :v${idx}`;
  });
  const result = await dynamo.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { ...businessPartition(businessId), SK: `${prefix}#${id}` },
      UpdateExpression: `SET ${expressionParts.join(", ")}, #updated_at = :updated_at`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: "ALL_NEW",
    })
  );
  if (!result.Attributes) {
    return notFound("Item not found");
  }
  return ok({ [key]: result.Attributes });
}

async function deleteEntity(businessId: string, prefix: string, id: string): Promise<APIGatewayProxyResultV2> {
  await dynamo.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { ...businessPartition(businessId), SK: `${prefix}#${id}` },
    })
  );
  return { statusCode: 204, headers: currentHeaders };
}

async function listProfileHours(businessId: string): Promise<APIGatewayProxyResultV2> {
  const result = await dynamo.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { ...businessPartition(businessId), SK: "HOURS" },
    })
  );
  return ok({ hours: result.Item?.hours || [] });
}

async function updateProfileHours(businessId: string, event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const body = parseBody<{ hours: Array<Record<string, unknown>> }>(event);
  if (!body?.hours) {
    return badRequest("Hours payload required");
  }
  const normalized = body.hours.map((entry) => ({
    id: entry.day_of_week,
    business_id: businessId,
    ...entry,
  }));
  const item = {
    ...businessPartition(businessId),
    SK: "HOURS",
    hours: normalized,
    updated_at: nowIso(),
    type: "hours",
  };
  await dynamo.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return ok({ hours: normalized });
}

async function listSocialLinks(businessId: string): Promise<APIGatewayProxyResultV2> {
  const result = await dynamo.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `BUSINESS#${businessId}`,
        ":sk": "SOCIAL#",
      },
    })
  );
  const links = (result.Items || []).map((item) => ({
    id: item.platform,
    business_id: businessId,
    platform: item.platform,
    url: item.url,
  }));
  return ok({ links });
}

async function upsertSocialLink(businessId: string, event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const body = parseBody<{ platform: string; url: string }>(event);
  if (!body?.platform || !body?.url) {
    return badRequest("Platform and url are required");
  }
  const item = {
    ...businessPartition(businessId),
    SK: `SOCIAL#${body.platform}`,
    id: body.platform,
    business_id: businessId,
    platform: body.platform,
    url: body.url,
    updated_at: nowIso(),
    type: "social",
  };
  await dynamo.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return listSocialLinks(businessId);
}

async function deleteSocialLink(businessId: string, platform: string): Promise<APIGatewayProxyResultV2> {
  await dynamo.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { ...businessPartition(businessId), SK: `SOCIAL#${platform}` },
    })
  );
  return { statusCode: 204, headers: currentHeaders };
}

async function listProfileLocations(businessId: string): Promise<APIGatewayProxyResultV2> {
  const result = await dynamo.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `BUSINESS#${businessId}`,
        ":sk": "PROFILE_LOCATION#",
      },
    })
  );
  return ok({ locations: result.Items || [] });
}

async function clearPrimaryProfileLocation(businessId: string, keepId: string) {
  const existing = await dynamo.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `BUSINESS#${businessId}`,
        ":sk": "PROFILE_LOCATION#",
      },
    })
  );
  const primaries = (existing.Items || []).filter(
    (item) => item.id !== keepId && item.is_primary === true
  );
  for (const location of primaries) {
    await dynamo.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: profileLocationKey(businessId, location.id),
        UpdateExpression: "SET #is_primary = :false, #updated_at = :updated_at",
        ExpressionAttributeNames: {
          "#is_primary": "is_primary",
          "#updated_at": "updated_at",
        },
        ExpressionAttributeValues: {
          ":false": false,
          ":updated_at": nowIso(),
        },
      })
    );
  }
}

async function createProfileLocation(
  businessId: string,
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const body = parseBody<{
    location_type: string;
    is_primary?: boolean;
    street_address?: string | null;
    city: string;
    state: string;
    postal_code?: string | null;
    country?: string;
    latitude?: number | null;
    longitude?: number | null;
  }>(event);
  if (!body?.location_type || !body?.city || !body?.state) {
    return badRequest("location_type, city, and state are required");
  }
  const id = generateId();
  const now = nowIso();
  const item = {
    ...profileLocationKey(businessId, id),
    id,
    business_id: businessId,
    location_type: body.location_type,
    is_primary: body.is_primary ?? false,
    street_address: body.street_address ?? null,
    city: body.city,
    state: body.state,
    postal_code: body.postal_code ?? null,
    country: body.country ?? "US",
    latitude: body.latitude ?? null,
    longitude: body.longitude ?? null,
    created_at: now,
    updated_at: now,
    type: "profile_location",
  };
  await dynamo.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  if (item.is_primary) {
    await clearPrimaryProfileLocation(businessId, id);
  }
  return created({ location: item });
}

async function updateProfileLocation(
  businessId: string,
  locationId: string,
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const body = parseBody<Record<string, unknown>>(event);
  if (!body) {
    return badRequest("Invalid JSON body");
  }
  const now = nowIso();
  const updates = Object.entries(body).filter(([field]) => field !== "id");
  if (updates.length === 0) {
    return badRequest("No fields to update");
  }
  const names: Record<string, string> = { "#updated_at": "updated_at" };
  const values: Record<string, unknown> = { ":updated_at": now };
  const expressionParts = updates.map(([field], idx) => {
    names[`#f${idx}`] = field;
    values[`:v${idx}`] = body[field] ?? null;
    return `#f${idx} = :v${idx}`;
  });
  const result = await dynamo.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: profileLocationKey(businessId, locationId),
      UpdateExpression: `SET ${expressionParts.join(", ")}, #updated_at = :updated_at`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: "ALL_NEW",
    })
  );
  if (!result.Attributes) {
    return notFound("Location not found");
  }
  if (result.Attributes.is_primary) {
    await clearPrimaryProfileLocation(businessId, locationId);
  }
  return ok({ location: result.Attributes });
}

async function deleteProfileLocation(
  businessId: string,
  locationId: string
): Promise<APIGatewayProxyResultV2> {
  await dynamo.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: profileLocationKey(businessId, locationId),
    })
  );
  return { statusCode: 204, headers: currentHeaders };
}

async function listJobs(businessId: string, includeHidden: boolean): Promise<APIGatewayProxyResultV2> {
  const result = await dynamo.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `BUSINESS#${businessId}`,
        ":sk": "JOB#",
      },
    })
  );
  const items = (result.Items || []).filter((item) => includeHidden || !item.is_hidden);
  return ok({ jobs: items });
}

async function getJob(businessId: string, jobId: string): Promise<APIGatewayProxyResultV2> {
  const result = await dynamo.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { ...businessPartition(businessId), SK: `JOB#${jobId}` },
    })
  );
  if (!result.Item) {
    return notFound("Job not found");
  }
  const pagesResult = await dynamo.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `JOB#${jobId}`,
        ":sk": "PAGE#",
      },
    })
  );
  const pages = pagesResult.Items || [];
  const counts = pages.reduce(
    (acc, page) => {
      acc[page.status as keyof typeof acc] += 1;
      return acc;
    },
    { queued: 0, processing: 0, completed: 0, failed: 0 }
  );
  return ok({ job: { ...result.Item, ...counts, queued_count: counts.queued, processing_count: counts.processing, completed_count: counts.completed, failed_count: counts.failed } });
}

async function getJobPages(event: APIGatewayProxyEventV2, jobId: string): Promise<APIGatewayProxyResultV2> {
  const result = await dynamo.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `JOB#${jobId}`,
        ":sk": "PAGE#",
      },
    })
  );
  const pages = result.Items || [];
  const statusFilter = event.queryStringParameters?.status;
  const languageFilter = event.queryStringParameters?.language;
  const searchFilter = (event.queryStringParameters?.search || "").toLowerCase();
  const pageNum = parseInt(event.queryStringParameters?.page || "1", 10);
  const limit = parseInt(event.queryStringParameters?.limit || "20", 10);

  const filtered = pages.filter((page) => {
    if (statusFilter && page.status !== statusFilter) {
      return false;
    }
    if (languageFilter && page.keyword_language !== languageFilter) {
      return false;
    }
    if (searchFilter) {
      const target = `${page.keyword_text || ""} ${page.keyword_slug || ""} ${page.url_path || ""}`.toLowerCase();
      if (!target.includes(searchFilter)) {
        return false;
      }
    }
    return true;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (pageNum - 1) * limit;
  const paginated = filtered.slice(start, start + limit);
  const counts = pages.reduce(
    (acc, page) => {
      acc[page.status as keyof typeof acc] += 1;
      return acc;
    },
    { queued: 0, processing: 0, completed: 0, failed: 0 }
  );

  return ok({
    pages: paginated,
    pagination: {
      page: pageNum,
      limit,
      total,
      totalPages,
    },
    counts,
  });
}

async function bulkCreateLocations(businessId: string, locations: Array<Record<string, unknown>>): Promise<APIGatewayProxyResultV2> {
  if (!locations.length) {
    return badRequest("No locations provided");
  }
  const now = nowIso();
  const items = locations.map((loc) => {
    const id = generateId();
    return {
      ...businessPartition(businessId),
      SK: `LOCATION#${id}`,
      id,
      ...loc,
      created_at: now,
      updated_at: now,
      type: "location",
    };
  });

  const chunks: Array<typeof items> = [];
  for (let i = 0; i < items.length; i += 25) {
    chunks.push(items.slice(i, i + 25));
  }

  for (const chunk of chunks) {
    await dynamo.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: chunk.map((item) => ({ PutRequest: { Item: item } })),
        },
      })
    );
  }

  return ok({ locations: items });
}

async function createJob(businessId: string, event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const body = parseBody<{ page_type: string }>(event);
  if (!body?.page_type) {
    return badRequest("page_type is required");
  }
  const normalizedPageType = normalizePageType(body.page_type);
  if (!normalizedPageType) {
    return badRequest("Unsupported page_type");
  }
  const queueUrl = ensureQueue();
  if (!queueUrl) {
    return badRequest("SQS queue not configured");
  }

  const [keywords, serviceAreas, locations, questionnaire] = await Promise.all([
    dynamo.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `BUSINESS#${businessId}`,
          ":sk": "KEYWORD#",
        },
      })
    ),
    dynamo.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `BUSINESS#${businessId}`,
          ":sk": "SERVICE_AREA#",
        },
      })
    ),
    dynamo.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `BUSINESS#${businessId}`,
          ":sk": "LOCATION#",
        },
      })
    ),
    dynamo.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { ...businessPartition(businessId), SK: "QUESTIONNAIRE" },
      })
    ),
  ]);

  const keywordItems = keywords.Items || [];
  const serviceAreaItems = serviceAreas.Items || [];
  const locationItems = locations.Items || [];
  const services = extractServices(questionnaire.Item as { data?: unknown } | undefined);

  const jobId = generateId();
  const now = nowIso();
  const totalPages = countPages(
    normalizedPageType,
    keywordItems,
    serviceAreaItems,
    locationItems,
    services
  );

  const jobItem = {
    ...businessPartition(businessId),
    SK: `JOB#${jobId}`,
    id: jobId,
    business_id: businessId,
    status: "pending",
    page_type: body.page_type,
    total_pages: totalPages,
    completed_pages: 0,
    failed_pages: 0,
    queued_pages: totalPages,
    created_at: now,
    updated_at: now,
    started_at: null,
    completed_at: null,
    is_hidden: false,
    cost_total_usd: 0,
    type: "job",
  };

  await dynamo.send(new PutCommand({ TableName: TABLE_NAME, Item: jobItem }));

  if (totalPages === 0) {
    return ok({ job: jobItem, total_pages_created: 0 });
  }

  let createdPages = 0;
  const pageBatch: Array<Record<string, unknown>> = [];
  const messageBatch: Array<{ id: string; page_type: string }> = [];

  const flushPages = async () => {
    if (!pageBatch.length) {
      return;
    }
    await dynamo.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: pageBatch.map((item) => ({ PutRequest: { Item: item } })),
        },
      })
    );
    pageBatch.length = 0;
  };

  const flushMessages = async () => {
    if (!messageBatch.length) {
      return;
    }
    await sqs.send(
      new SendMessageBatchCommand({
        QueueUrl: queueUrl,
        Entries: messageBatch.map((page, idx) => ({
          Id: `${page.id}-${idx}`,
          MessageBody: JSON.stringify({
            job_id: jobId,
            page_id: page.id,
            business_id: businessId,
            page_type: page.page_type,
            request_id: currentRequestContext?.requestId || undefined,
          }),
        })),
      })
    );
    messageBatch.length = 0;
  };

  const enqueuePage = async (payload: Record<string, unknown>) => {
    const pageId = generateId();
    createdPages += 1;
    const pageItem = {
      PK: `JOB#${jobId}`,
      SK: `PAGE#${pageId}`,
      id: pageId,
      job_id: jobId,
      business_id: businessId,
      status: "queued",
      attempts: 0,
      created_at: now,
      updated_at: now,
      ...payload,
    };
    pageBatch.push(pageItem);
    messageBatch.push({ id: pageId, page_type: String(payload.page_type) });
    if (pageBatch.length >= 25) {
      await flushPages();
    }
    if (messageBatch.length >= 10) {
      await flushMessages();
    }
  };

  if (normalizedPageType === "keyword-service-area") {
    for (const keyword of keywordItems) {
      for (const area of serviceAreaItems) {
        await enqueuePage({
          page_type: "keyword-service-area",
          keyword_id: keyword.id,
          keyword_text: keyword.keyword,
          keyword_slug: keyword.slug,
          keyword_language: keyword.language || "en",
          service_area_id: area.id,
          service_area_slug: area.slug,
          city: area.city,
          state: area.state,
        });
      }
    }
  }

  if (normalizedPageType === "blog-service-area") {
    for (const keyword of keywordItems) {
      for (const area of serviceAreaItems) {
        await enqueuePage({
          page_type: "blog-service-area",
          keyword_id: keyword.id,
          keyword_text: keyword.keyword,
          keyword_slug: keyword.slug,
          keyword_language: keyword.language || "en",
          service_area_id: area.id,
          service_area_slug: area.slug,
          city: area.city,
          state: area.state,
        });
      }
    }
  }

  if (normalizedPageType === "keyword-location") {
    for (const keyword of keywordItems) {
      for (const location of locationItems) {
        await enqueuePage({
          page_type: "keyword-location",
          keyword_id: keyword.id,
          keyword_text: keyword.keyword,
          keyword_slug: keyword.slug,
          keyword_language: keyword.language || "en",
          location_id: location.id,
          location_slug: location.slug,
          city: location.city,
          state: location.state,
          location_status: location.status || "active",
        });
      }
    }
  }

  if (normalizedPageType === "blog-location") {
    for (const keyword of keywordItems) {
      for (const location of locationItems) {
        await enqueuePage({
          page_type: "blog-location",
          keyword_id: keyword.id,
          keyword_text: keyword.keyword,
          keyword_slug: keyword.slug,
          keyword_language: keyword.language || "en",
          location_id: location.id,
          location_slug: location.slug,
          city: location.city,
          state: location.state,
          location_status: location.status || "active",
        });
      }
    }
  }

  if (normalizedPageType === "service-service-area") {
    for (const service of services) {
      for (const area of serviceAreaItems) {
        await enqueuePage({
          page_type: "service-service-area",
          service_name: service.name,
          service_slug: normalizeServiceSlug(service),
          service_name_es: service.nameEs || null,
          service_area_id: area.id,
          service_area_slug: area.slug,
          city: area.city,
          state: area.state,
        });
      }
    }
  }

  if (normalizedPageType === "service-location") {
    for (const service of services) {
      for (const location of locationItems) {
        await enqueuePage({
          page_type: "service-location",
          service_name: service.name,
          service_slug: normalizeServiceSlug(service),
          service_name_es: service.nameEs || null,
          location_id: location.id,
          location_slug: location.slug,
          city: location.city,
          state: location.state,
          location_status: location.status || "active",
        });
      }
    }
  }

  await flushPages();
  await flushMessages();

  return ok({ job: jobItem, total_pages_created: createdPages });
}

async function previewPages(businessId: string, event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const body = parseBody<{ page_type?: string }>(event);
  const rawPageType = body?.page_type || event.queryStringParameters?.page_type || "keyword-service-area";
  const normalizedPageType = normalizePageType(rawPageType);
  if (!normalizedPageType) {
    return badRequest("Unsupported page_type");
  }

  const pageNum = parseInt(event.queryStringParameters?.page || "1", 10);
  const limit = parseInt(event.queryStringParameters?.limit || "20", 10);
  const searchFilter = (event.queryStringParameters?.search || "").toLowerCase().trim();
  const languageFilter = event.queryStringParameters?.language;

  const [keywords, serviceAreas, locations, questionnaire] = await Promise.all([
    dynamo.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `BUSINESS#${businessId}`,
          ":sk": "KEYWORD#",
        },
      })
    ),
    dynamo.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `BUSINESS#${businessId}`,
          ":sk": "SERVICE_AREA#",
        },
      })
    ),
    dynamo.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `BUSINESS#${businessId}`,
          ":sk": "LOCATION#",
        },
      })
    ),
    dynamo.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { ...businessPartition(businessId), SK: "QUESTIONNAIRE" },
      })
    ),
  ]);

  const keywordItems = keywords.Items || [];
  const areaItems = serviceAreas.Items || [];
  const locationItems = locations.Items || [];
  const services = extractServices(questionnaire.Item as { data?: unknown } | undefined);
  const filteredKeywords =
    languageFilter && (languageFilter === "en" || languageFilter === "es")
      ? keywordItems.filter((k) => (k.language || "en") === languageFilter)
      : keywordItems;

  const startIndex = (pageNum - 1) * limit;
  const endIndex = startIndex + limit;
  let matchedCount = 0;
  const pages: Array<Record<string, unknown>> = [];

  const pushIfMatch = (page: Record<string, unknown>) => {
    if (searchFilter) {
      const target = [
        page.keyword_text,
        page.keyword_slug,
        page.service_name,
        page.service_slug,
        page.service_name_es,
        page.service_area_city,
        page.service_area_state,
        page.url_path,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!target.includes(searchFilter)) {
        return;
      }
    }
    if (matchedCount >= startIndex && matchedCount < endIndex) {
      pages.push(page);
    }
    matchedCount += 1;
  };

  if (normalizedPageType === "keyword-service-area") {
    for (const keyword of filteredKeywords) {
      for (const area of areaItems) {
        pushIfMatch({
          keyword_slug: keyword.slug || null,
          keyword_text: keyword.keyword || null,
          keyword_language: keyword.language || "en",
          service_area_slug: area.slug,
          service_area_city: area.city,
          service_area_state: area.state,
          url_path: `/${keyword.slug}/${area.slug}`,
        });
      }
    }
  }

  if (normalizedPageType === "blog-service-area") {
    for (const keyword of filteredKeywords) {
      for (const area of areaItems) {
        pushIfMatch({
          keyword_slug: keyword.slug || null,
          keyword_text: keyword.keyword || null,
          keyword_language: keyword.language || "en",
          service_area_slug: area.slug,
          service_area_city: area.city,
          service_area_state: area.state,
          url_path: `/blog/${keyword.slug}/${area.slug}`,
        });
      }
    }
  }

  if (normalizedPageType === "keyword-location") {
    for (const keyword of filteredKeywords) {
      for (const location of locationItems) {
        pushIfMatch({
          keyword_slug: keyword.slug || null,
          keyword_text: keyword.keyword || null,
          keyword_language: keyword.language || "en",
          service_area_slug: location.slug,
          service_area_city: location.city,
          service_area_state: location.state,
          url_path: `/${keyword.slug}/${location.slug}`,
        });
      }
    }
  }

  if (normalizedPageType === "blog-location") {
    for (const keyword of filteredKeywords) {
      for (const location of locationItems) {
        pushIfMatch({
          keyword_slug: keyword.slug || null,
          keyword_text: keyword.keyword || null,
          keyword_language: keyword.language || "en",
          service_area_slug: location.slug,
          service_area_city: location.city,
          service_area_state: location.state,
          url_path: `/blog/${keyword.slug}/${location.slug}`,
        });
      }
    }
  }

  if (normalizedPageType === "service-service-area") {
    for (const service of services) {
      for (const area of areaItems) {
        const serviceSlug = normalizeServiceSlug(service);
        pushIfMatch({
          service_name: service.name,
          service_slug: serviceSlug,
          service_name_es: service.nameEs || null,
          service_area_slug: area.slug,
          service_area_city: area.city,
          service_area_state: area.state,
          url_path: `/${serviceSlug}/${area.slug}`,
        });
      }
    }
  }

  if (normalizedPageType === "service-location") {
    for (const service of services) {
      for (const location of locationItems) {
        const serviceSlug = normalizeServiceSlug(service);
        pushIfMatch({
          service_name: service.name,
          service_slug: serviceSlug,
          service_name_es: service.nameEs || null,
          service_area_slug: location.slug,
          service_area_city: location.city,
          service_area_state: location.state,
          url_path: `/${serviceSlug}/${location.slug}`,
        });
      }
    }
  }

  const total = matchedCount;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return ok({
    pages,
    pagination: {
      page: pageNum,
      limit,
      total,
      totalPages,
    },
    summary: {
      total_pages: total,
      unique_keywords: keywordItems.length,
      unique_service_areas: areaItems.length,
      unique_locations: locationItems.length,
      unique_services: services.length,
      by_language: {
        en: keywordItems.filter((k) => (k.language || "en") === "en").length,
        es: keywordItems.filter((k) => k.language === "es").length,
      },
    },
    business: { id: businessId, name: "" },
    page_type: rawPageType,
  });
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const incomingRequestId =
    event.headers?.["x-request-id"] ||
    event.headers?.["X-Request-Id"] ||
    event.requestContext.requestId;
  currentRequestContext = {
    requestId: incomingRequestId,
    method: event.requestContext.http.method,
    path: event.rawPath,
  };
  const requestOrigin = event.headers?.origin || event.headers?.Origin || null;
  currentHeaders = buildHeaders(requestOrigin, incomingRequestId);
  logEvent("INFO", "request_received");
  if (event.requestContext.http.method === "OPTIONS") {
    if (requestOrigin && !CORS_ALLOW_ORIGINS.includes("*") && !CORS_ALLOW_ORIGINS.includes(requestOrigin)) {
      return { statusCode: 403, headers: currentHeaders };
    }
    return { statusCode: 204, headers: currentHeaders };
  }

  if (requestOrigin && !CORS_ALLOW_ORIGINS.includes("*") && !CORS_ALLOW_ORIGINS.includes(requestOrigin)) {
    return forbidden("Origin not allowed");
  }

  const auth = await authenticate(event);
  if (!auth) {
    return unauthorized("Missing or invalid authorization header");
  }
  logEvent("INFO", "request_authenticated", { identity: auth.identity });

  const rateLimitOk = await enforceRateLimit(auth.identity);
  if (!rateLimitOk) {
    return tooManyRequests("Rate limit exceeded");
  }

  const method = event.requestContext.http.method;
  const path = event.rawPath;

  if (path === "/health" || path === "/api/health") {
    return ok({ status: "ok" });
  }

  if (method === "GET" && path === "/api/businesses") {
    return listBusinesses();
  }

  if (method === "POST" && path === "/api/businesses") {
    return createBusiness(event);
  }

  if (method === "GET" && path === "/api/webhooks") {
    return listWebhooks();
  }

  if (method === "POST" && path === "/api/webhooks") {
    return createWebhook(event);
  }

  const webhookMatch = path.match(/^\/api\/webhooks\/([^/]+)$/);
  if (webhookMatch) {
    const webhookId = webhookMatch[1];
    if (method === "DELETE") {
      return deleteWebhook(webhookId);
    }
  }

  const questionnaireMatch = path.match(/^\/api\/businesses\/(.+)\/questionnaire$/);
  if (questionnaireMatch) {
    const businessId = questionnaireMatch[1];
    if (method === "GET") {
      return getQuestionnaire(businessId);
    }
    if (method === "PUT") {
      return updateQuestionnaire(businessId, event);
    }
  }

  const keywordsMatch = path.match(/^\/api\/businesses\/(.+)\/keywords(?:\/(.+))?$/);
  if (keywordsMatch) {
    const businessId = keywordsMatch[1];
    const keywordId = keywordsMatch[2];
    if (method === "GET" && !keywordId) {
      return listEntity(businessId, "KEYWORD", "keywords");
    }
    if (method === "POST" && !keywordId) {
      const body = parseBody<Record<string, unknown>>(event);
      if (!body?.keyword) {
        return badRequest("Keyword is required");
      }
      return createEntity(businessId, "KEYWORD", body, "keyword");
    }
    if (keywordId && method === "PUT") {
      return updateEntity(businessId, "KEYWORD", keywordId, parseBody<Record<string, unknown>>(event) || {}, "keyword");
    }
    if (keywordId && method === "DELETE") {
      return deleteEntity(businessId, "KEYWORD", keywordId);
    }
  }

  const areasMatch = path.match(/^\/api\/businesses\/(.+)\/service-areas(?:\/(.+))?$/);
  if (areasMatch) {
    const businessId = areasMatch[1];
    const areaId = areasMatch[2];
    if (method === "GET" && !areaId) {
      return listEntity(businessId, "SERVICE_AREA", "service_areas");
    }
    if (method === "POST" && !areaId) {
      const body = parseBody<Record<string, unknown>>(event);
      if (!body?.city || !body?.state) {
        return badRequest("City and state are required");
      }
      return createEntity(businessId, "SERVICE_AREA", body, "service_area");
    }
    if (areaId && method === "PUT") {
      return updateEntity(businessId, "SERVICE_AREA", areaId, parseBody<Record<string, unknown>>(event) || {}, "service_area");
    }
    if (areaId && method === "DELETE") {
      return deleteEntity(businessId, "SERVICE_AREA", areaId);
    }
  }

  const locationsMatch = path.match(/^\/api\/businesses\/seo\/(.+)\/locations(?:\/(.+))?$/);
  if (locationsMatch) {
    const businessId = locationsMatch[1];
    const locationId = locationsMatch[2];
    if (locationId === "stats" && method === "GET") {
      const result = await dynamo.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: {
            ":pk": `BUSINESS#${businessId}`,
            ":sk": "LOCATION#",
          },
        })
      );
      const locations = result.Items || [];
      return ok({ stats: { total: locations.length, active: locations.filter((loc) => loc.status === "active").length } });
    }
    if (locationId === "bulk-import" && method === "POST") {
      const body = parseBody<{ locations: Array<Record<string, unknown>> }>(event);
      if (!body?.locations) {
        return badRequest("Locations payload required");
      }
      return bulkCreateLocations(businessId, body.locations);
    }
    if (method === "GET" && !locationId) {
      return listEntity(businessId, "LOCATION", "locations");
    }
    if (method === "POST" && !locationId) {
      const body = parseBody<Record<string, unknown>>(event);
      if (!body?.city || !body?.state) {
        return badRequest("City and state are required");
      }
      return createEntity(businessId, "LOCATION", body, "location");
    }
    if (locationId && method === "GET") {
      const result = await dynamo.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { ...businessPartition(businessId), SK: `LOCATION#${locationId}` },
        })
      );
      if (!result.Item) {
        return notFound("Location not found");
      }
      return ok({ location: result.Item });
    }
    if (locationId && method === "PUT") {
      return updateEntity(businessId, "LOCATION", locationId, parseBody<Record<string, unknown>>(event) || {}, "location");
    }
    if (locationId && method === "DELETE") {
      return deleteEntity(businessId, "LOCATION", locationId);
    }
  }

  const profileLocationsMatch = path.match(/^\/api\/businesses\/([^/]+)\/locations(?:\/([^/]+))?$/);
  if (profileLocationsMatch) {
    const businessId = profileLocationsMatch[1];
    const locationId = profileLocationsMatch[2];
    if (method === "GET" && !locationId) {
      return listProfileLocations(businessId);
    }
    if (method === "POST" && !locationId) {
      return createProfileLocation(businessId, event);
    }
    if (method === "PUT" && locationId) {
      return updateProfileLocation(businessId, locationId, event);
    }
    if (method === "DELETE" && locationId) {
      return deleteProfileLocation(businessId, locationId);
    }
    if (method === "GET" && locationId) {
      const result = await dynamo.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: profileLocationKey(businessId, locationId),
        })
      );
      if (!result.Item) {
        return notFound("Location not found");
      }
      return ok({ location: result.Item });
    }
  }

  const hoursMatch = path.match(/^\/api\/businesses\/([^/]+)\/hours$/);
  if (hoursMatch) {
    const businessId = hoursMatch[1];
    if (method === "GET") {
      return listProfileHours(businessId);
    }
    if (method === "PUT") {
      return updateProfileHours(businessId, event);
    }
  }

  const socialMatch = path.match(/^\/api\/businesses\/([^/]+)\/social(?:\/([^/]+))?$/);
  if (socialMatch) {
    const businessId = socialMatch[1];
    const platform = socialMatch[2];
    if (method === "GET" && !platform) {
      return listSocialLinks(businessId);
    }
    if (method === "POST" && !platform) {
      return upsertSocialLink(businessId, event);
    }
    if (method === "DELETE" && platform) {
      return deleteSocialLink(businessId, platform);
    }
  }

  const promptsMatch = path.match(/^\/api\/businesses\/(.+)\/prompts(?:\/(.+))?$/);
  if (promptsMatch) {
    const businessId = promptsMatch[1];
    const promptId = promptsMatch[2];
    if (method === "GET" && !promptId) {
      return listEntity(businessId, "PROMPT", "prompts");
    }
    if (method === "POST" && !promptId) {
      const body = parseBody<Record<string, unknown>>(event);
      if (!body?.template || !body?.page_type) {
        return badRequest("Template and page_type are required");
      }
      return createEntity(businessId, "PROMPT", body, "prompt");
    }
    if (promptId && method === "PUT") {
      return updateEntity(businessId, "PROMPT", promptId, parseBody<Record<string, unknown>>(event) || {}, "prompt");
    }
    if (promptId && method === "DELETE") {
      return deleteEntity(businessId, "PROMPT", promptId);
    }
  }

  const jobsMatch = path.match(/^\/api\/businesses\/(.+)\/jobs(?:\/(.+))?$/);
  if (jobsMatch) {
    const businessId = jobsMatch[1];
    const jobId = jobsMatch[2];
    if (method === "GET" && !jobId) {
      const includeHidden = event.queryStringParameters?.include_hidden === "true";
      return listJobs(businessId, includeHidden);
    }
    if (method === "GET" && jobId) {
      return getJob(businessId, jobId);
    }
  }

  const previewMatch = path.match(/^\/api\/businesses\/(.+)\/generate\/preview$/);
  if (previewMatch && method === "GET") {
    return previewPages(previewMatch[1], event);
  }

  const generateMatch = path.match(/^\/api\/businesses\/(.+)\/generate$/);
  if (generateMatch && method === "POST") {
    return createJob(generateMatch[1], event);
  }

  const jobPagesMatch = path.match(/^\/api\/jobs\/(.+)\/pages$/);
  if (jobPagesMatch && method === "GET") {
    return getJobPages(event, jobPagesMatch[1]);
  }

  const businessMatch = path.match(/^\/api\/businesses\/([^/]+)$/);
  if (businessMatch) {
    const businessId = businessMatch[1];
    if (method === "GET") {
      return getBusiness(businessId);
    }
    if (method === "PUT") {
      return updateBusiness(businessId, event);
    }
    if (method === "DELETE") {
      return deleteBusiness(businessId);
    }
  }

  return notFound("Route not found");
};
