import { SQSEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";

const REGION = process.env.AWS_REGION || "us-east-1";
const TABLE_NAME = process.env.DDB_TABLE_NAME || "marketbrewer-dashboard";
const DDB_ENDPOINT = process.env.DDB_ENDPOINT;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || "";
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20240620";
const CLAUDE_PRICE_INPUT = parseFloat(process.env.CLAUDE_PRICE_INPUT_PER_1K || "0");
const CLAUDE_PRICE_OUTPUT = parseFloat(process.env.CLAUDE_PRICE_OUTPUT_PER_1K || "0");
const WEBHOOK_TIMEOUT_MS = parseInt(process.env.WEBHOOK_TIMEOUT_MS || "5000", 10);

const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION, endpoint: DDB_ENDPOINT })
);

const WEBHOOK_EVENTS = ["job.completed", "job.failed"] as const;
const WEBHOOK_CACHE_MS = 30000;
let cachedWebhooks: Array<{ url: string; events?: string[] }> | null = null;
let cachedWebhooksAt = 0;

function logEvent(level: "INFO" | "WARN" | "ERROR", message: string, data: Record<string, unknown> = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data,
  };
  console.log(JSON.stringify(payload));
}

function nowIso(): string {
  return new Date().toISOString();
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key) => {
    const value = vars[key];
    return value ?? "";
  });
}

async function getWebhooks(): Promise<Array<{ url: string; events?: string[] }>> {
  if (cachedWebhooks && Date.now() - cachedWebhooksAt < WEBHOOK_CACHE_MS) {
    return cachedWebhooks;
  }
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
  cachedWebhooks = (result.Items || []).map((item) => ({
    url: item.url as string,
    events: Array.isArray(item.events) ? (item.events as string[]) : undefined,
  }));
  cachedWebhooksAt = Date.now();
  return cachedWebhooks;
}

async function sendWebhook(url: string, payload: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Webhook failed: ${response.status} ${errorText}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function dispatchWebhooks(eventType: (typeof WEBHOOK_EVENTS)[number], payload: Record<string, unknown>) {
  const webhooks = await getWebhooks();
  if (!webhooks.length) {
    return;
  }
  await Promise.all(
    webhooks
      .filter((webhook) => !webhook.events || webhook.events.includes(eventType))
      .map((webhook) =>
        sendWebhook(webhook.url, {
          event: eventType,
          payload,
          sent_at: nowIso(),
        }).catch((error) => {
          logEvent("WARN", "webhook_failed", { error: error instanceof Error ? error.message : String(error) });
        })
      )
  );
}

async function fetchPrompts(businessId: string) {
  const result = await dynamo.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `BUSINESS#${businessId}`,
        ":sk": "PROMPT#",
      },
    })
  );
  return result.Items || [];
}

async function callClaude(prompt: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1200,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude error: ${response.status} ${errorText}`);
  }

  return (await response.json()) as {
    content: Array<{ type: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
}

async function updateJobCounts(
  businessId: string,
  jobId: string,
  updates: { completed?: number; failed?: number }
): Promise<{ job?: { status?: string; total_pages?: number; completed_pages?: number; failed_pages?: number }; finalized: boolean; webhookReady: boolean }> {
  const now = nowIso();
  const updateExpressionParts = ["#updated_at = :updated_at", "#status = :status"];
  const names: Record<string, string> = {
    "#updated_at": "updated_at",
    "#status": "status",
  };
  const values: Record<string, unknown> = {
    ":updated_at": now,
    ":status": "processing",
  };

  if (updates.completed) {
    updateExpressionParts.push("#completed_pages = #completed_pages + :completed_inc");
    names["#completed_pages"] = "completed_pages";
    values[":completed_inc"] = updates.completed;
  }

  if (updates.failed) {
    updateExpressionParts.push("#failed_pages = #failed_pages + :failed_inc");
    names["#failed_pages"] = "failed_pages";
    values[":failed_inc"] = updates.failed;
  }

  const result = await dynamo.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `BUSINESS#${businessId}`, SK: `JOB#${jobId}` },
      UpdateExpression: `SET ${updateExpressionParts.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: "ALL_NEW",
    })
  );

  const job = result.Attributes as { total_pages?: number; completed_pages?: number; failed_pages?: number } | undefined;
  if (job?.total_pages !== undefined) {
    const total = job.total_pages || 0;
    const completed = job.completed_pages || 0;
    const failed = job.failed_pages || 0;
    if (completed + failed >= total) {
      const finalResult = await dynamo.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: `BUSINESS#${businessId}`, SK: `JOB#${jobId}` },
          UpdateExpression: "SET #status = :status, #completed_at = :completed_at, #updated_at = :updated_at",
          ExpressionAttributeNames: {
            "#status": "status",
            "#completed_at": "completed_at",
            "#updated_at": "updated_at",
          },
          ExpressionAttributeValues: {
            ":status": failed > 0 ? "failed" : "completed",
            ":completed_at": now,
            ":updated_at": now,
          },
          ReturnValues: "ALL_NEW",
        })
      );
      let webhookReady = false;
      try {
        await dynamo.send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: `BUSINESS#${businessId}`, SK: `JOB#${jobId}` },
            UpdateExpression: "SET #webhook_sent_at = :webhook_sent_at",
            ConditionExpression: "attribute_not_exists(#webhook_sent_at)",
            ExpressionAttributeNames: {
              "#webhook_sent_at": "webhook_sent_at",
            },
            ExpressionAttributeValues: {
              ":webhook_sent_at": now,
            },
          })
        );
        webhookReady = true;
      } catch (error) {
        if (!(error instanceof Error) || error.name !== "ConditionalCheckFailedException") {
          throw error;
        }
      }
      return { job: finalResult.Attributes as typeof job, finalized: true, webhookReady };
    }
  }
  return { job, finalized: false, webhookReady: false };
}

async function recordCost(jobId: string, businessId: string, inputTokens: number, outputTokens: number) {
  const totalCost = (inputTokens / 1000) * CLAUDE_PRICE_INPUT + (outputTokens / 1000) * CLAUDE_PRICE_OUTPUT;
  const now = nowIso();
  const costItem = {
    PK: `JOB#${jobId}`,
    SK: `COST#${now}#${crypto.randomUUID()}`,
    job_id: jobId,
    business_id: businessId,
    model: CLAUDE_MODEL,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_cost_usd: totalCost,
    created_at: now,
    type: "cost",
  };
  await dynamo.send(new PutCommand({ TableName: TABLE_NAME, Item: costItem }));
  await dynamo.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `BUSINESS#${businessId}`, SK: `JOB#${jobId}` },
      UpdateExpression: "SET #updated_at = :updated_at ADD #cost_total_usd :cost",
      ExpressionAttributeNames: {
        "#updated_at": "updated_at",
        "#cost_total_usd": "cost_total_usd",
      },
      ExpressionAttributeValues: {
        ":updated_at": now,
        ":cost": totalCost,
      },
    })
  );
}

export const handler = async (event: SQSEvent): Promise<void> => {
  logEvent("INFO", "worker_batch_received", { records: event.Records.length });
  for (const record of event.Records) {
    const body = JSON.parse(record.body) as {
      job_id: string;
      page_id: string;
      business_id: string;
      request_id?: string;
    };

    const { job_id: jobId, page_id: pageId, business_id: businessId, request_id: requestId } = body;
    const startedAt = Date.now();
    logEvent("INFO", "page_processing_started", { jobId, pageId, businessId, requestId });

    const pageResult = await dynamo.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `JOB#${jobId}`, SK: `PAGE#${pageId}` },
      })
    );
    const page = pageResult.Item as Record<string, unknown> | undefined;
    if (!page || page.status === "completed") {
      logEvent("WARN", "page_skipped", { jobId, pageId, businessId, requestId });
      continue;
    }

    const now = nowIso();
    try {
      await dynamo.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: `JOB#${jobId}`, SK: `PAGE#${pageId}` },
          UpdateExpression: "SET #status = :status, #updated_at = :updated_at, #claimed_at = :claimed_at",
          ExpressionAttributeNames: {
            "#status": "status",
            "#updated_at": "updated_at",
            "#claimed_at": "claimed_at",
          },
          ExpressionAttributeValues: {
            ":status": "processing",
            ":updated_at": now,
            ":claimed_at": now,
          },
        })
      );

      const businessResult = await dynamo.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { PK: "BUSINESS", SK: `BUSINESS#${businessId}` },
        })
      );

      const questionnaireResult = await dynamo.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { PK: `BUSINESS#${businessId}`, SK: "QUESTIONNAIRE" },
        })
      );

      const prompts = await fetchPrompts(businessId);
      const promptTemplate = prompts.find((p) => p.page_type === page.page_type && p.is_active !== false)?.template as
        | string
        | undefined;

      const business = businessResult.Item || {};
      const questionnaire = (questionnaireResult.Item?.data as Record<string, unknown>) || {};

      const keywordLanguage = String(page.keyword_language || "en");
      const primaryKeyword = String(
        page.keyword_text || page.keyword_slug || page.service_name || ""
      );
      const contentLanguage = keywordLanguage === "es" ? "Spanish" : "English";
      const variables: Record<string, string> = {
        business_name: String(business.name || "MarketBrewer Client"),
        industry: String(business.industry_type || business.industry || "LocalBusiness"),
        phone: String(business.phone || ""),
        city: String(page.city || ""),
        state: String(page.state || ""),
        keyword: primaryKeyword,
        primary_service: String(page.service_name || page.keyword_text || ""),
        primary_keyword: primaryKeyword,
        primary_keyword_es: keywordLanguage === "es" ? primaryKeyword : "",
        keyword_language: keywordLanguage,
        content_language: contentLanguage,
        page_type: String(page.page_type || ""),
      };

      const isBlog = String(page.page_type || "").startsWith("blog-");
      const fallbackPrompt = isBlog
        ? `You are an SEO content writer for {{business_name}}, a {{industry}} business.\n\nWrite a local SEO blog post about "{{keyword}}" for {{city}}, {{state}} in {{content_language}}.\n\nReturn JSON with fields: title, meta_description, h1, body, sections (array with heading/content), cta.`
        : `You are an SEO content writer for {{business_name}}, a {{industry}} business.\n\nWrite a local SEO landing page for "{{keyword}}" targeting {{city}}, {{state}} in {{content_language}}.\n\nReturn JSON with fields: title, meta_description, h1, body, sections (array with heading/content), cta.`;
      const prompt = renderTemplate(promptTemplate || fallbackPrompt, variables);

      if (!CLAUDE_API_KEY) {
        throw new Error("CLAUDE_API_KEY is not configured");
      }

      const start = Date.now();
      const response = await callClaude(prompt);
      const responseText = response.content?.[0]?.text || "";
      const usage = response.usage || {};

      const durationMs = Date.now() - start;
      const contentJson = responseText.trim();

      await dynamo.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: `JOB#${jobId}`, SK: `PAGE#${pageId}` },
          UpdateExpression: "SET #status = :status, #updated_at = :updated_at, #completed_at = :completed_at, #content = :content, #model_name = :model, #generation_duration_ms = :duration",
          ExpressionAttributeNames: {
            "#status": "status",
            "#updated_at": "updated_at",
            "#completed_at": "completed_at",
            "#content": "content",
            "#model_name": "model_name",
            "#generation_duration_ms": "generation_duration_ms",
          },
          ExpressionAttributeValues: {
            ":status": "completed",
            ":updated_at": nowIso(),
            ":completed_at": nowIso(),
            ":content": contentJson,
            ":model": CLAUDE_MODEL,
            ":duration": durationMs,
          },
        })
      );

      const jobUpdate = await updateJobCounts(businessId, jobId, { completed: 1 });
      if (jobUpdate.finalized && jobUpdate.webhookReady && jobUpdate.job?.status) {
        await dispatchWebhooks(
          jobUpdate.job.status === "failed" ? "job.failed" : "job.completed",
          { job: jobUpdate.job, business_id: businessId, job_id: jobId, request_id: requestId }
        );
      }

      if (usage.input_tokens || usage.output_tokens) {
        await recordCost(jobId, businessId, usage.input_tokens || 0, usage.output_tokens || 0);
      }
      logEvent("INFO", "page_processing_completed", {
        jobId,
        pageId,
        businessId,
        requestId,
        durationMs: Date.now() - startedAt,
        claudeDurationMs: durationMs,
        inputTokens: usage.input_tokens || 0,
        outputTokens: usage.output_tokens || 0,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await dynamo.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: `JOB#${jobId}`, SK: `PAGE#${pageId}` },
          UpdateExpression: "SET #status = :status, #updated_at = :updated_at, #error_message = :error",
          ExpressionAttributeNames: {
            "#status": "status",
            "#updated_at": "updated_at",
            "#error_message": "error_message",
          },
          ExpressionAttributeValues: {
            ":status": "failed",
            ":updated_at": nowIso(),
            ":error": message,
          },
        })
      );
      const jobUpdate = await updateJobCounts(businessId, jobId, { failed: 1 });
      if (jobUpdate.finalized && jobUpdate.webhookReady && jobUpdate.job?.status) {
        await dispatchWebhooks(
          jobUpdate.job.status === "failed" ? "job.failed" : "job.completed",
          { job: jobUpdate.job, business_id: businessId, job_id: jobId, request_id: requestId }
        );
      }
      logEvent("ERROR", "page_processing_failed", {
        jobId,
        pageId,
        businessId,
        requestId,
        durationMs: Date.now() - startedAt,
        error: message,
      });
    }
  }
};
