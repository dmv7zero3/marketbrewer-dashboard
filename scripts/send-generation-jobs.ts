/**
 * Send Page Generation Jobs to SQS Queue
 *
 * This script reads keywords and service areas from the database,
 * creates page generation messages, and sends them to SQS.
 *
 * Usage:
 *   npx ts-node scripts/send-generation-jobs.ts --business=street-lawyer-magic
 *   npx ts-node scripts/send-generation-jobs.ts --business=street-lawyer-magic --dry-run
 */

import {
  SQSClient,
  SendMessageBatchCommand,
  GetQueueAttributesCommand,
} from "@aws-sdk/client-sqs";
import Database from "better-sqlite3";
import path from "path";

const REGION = process.env.AWS_REGION || "us-east-1";
const QUEUE_URL = process.env.SQS_QUEUE_URL;
const DB_PATH = path.join(__dirname, "../data/seo-platform.db");

interface Keyword {
  id: string;
  keyword: string;
  slug: string;
  language: "en" | "es";
}

interface ServiceArea {
  id: string;
  city: string;
  state: string;
  county: string;
}

interface Business {
  id: string;
  name: string;
  phone: string;
}

interface PageMessage {
  businessId: string;
  businessName: string;
  phone: string;
  pageSlug: string;
  service: string;
  serviceSlug: string;
  city: string;
  citySlug: string;
  state: string;
  county: string;
  language: "en" | "es";
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function getQueueDepth(sqs: SQSClient, queueUrl: string): Promise<number> {
  const result = await sqs.send(
    new GetQueueAttributesCommand({
      QueueUrl: queueUrl,
      AttributeNames: ["ApproximateNumberOfMessages"],
    })
  );
  return parseInt(result.Attributes?.ApproximateNumberOfMessages || "0", 10);
}

async function sendBatch(
  sqs: SQSClient,
  queueUrl: string,
  messages: PageMessage[]
): Promise<number> {
  // SQS allows max 10 messages per batch
  const batches: PageMessage[][] = [];
  for (let i = 0; i < messages.length; i += 10) {
    batches.push(messages.slice(i, i + 10));
  }

  let successCount = 0;

  for (const batch of batches) {
    const result = await sqs.send(
      new SendMessageBatchCommand({
        QueueUrl: queueUrl,
        Entries: batch.map((msg, idx) => ({
          Id: `msg-${idx}`,
          MessageBody: JSON.stringify(msg),
          MessageGroupId: msg.businessId, // For FIFO queues (optional)
        })),
      })
    );

    successCount += result.Successful?.length || 0;

    if (result.Failed && result.Failed.length > 0) {
      console.error("Failed to send some messages:", result.Failed);
    }
  }

  return successCount;
}

async function main() {
  // Parse arguments
  const args = process.argv.slice(2);
  const businessArg = args.find((a) => a.startsWith("--business="));
  const dryRun = args.includes("--dry-run");

  if (!businessArg) {
    console.error("Usage: npx ts-node send-generation-jobs.ts --business=<id> [--dry-run]");
    process.exit(1);
  }

  const businessId = businessArg.split("=")[1];

  if (!QUEUE_URL && !dryRun) {
    console.error("SQS_QUEUE_URL environment variable is required");
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log("MarketBrewer Page Generation Job Sender");
  console.log("=".repeat(60));
  console.log(`Business: ${businessId}`);
  console.log(`Dry Run: ${dryRun}`);
  console.log("");

  // Open database
  const db = new Database(DB_PATH, { readonly: true });

  // Get business info
  const business = db
    .prepare("SELECT id, name, phone FROM businesses WHERE id = ?")
    .get(businessId) as Business | undefined;

  if (!business) {
    console.error(`Business not found: ${businessId}`);
    process.exit(1);
  }

  console.log(`Business Name: ${business.name}`);
  console.log(`Phone: ${business.phone}`);

  // Get keywords
  const keywords = db
    .prepare("SELECT id, keyword, slug, language FROM keywords WHERE business_id = ?")
    .all(businessId) as Keyword[];

  console.log(`Keywords: ${keywords.length}`);

  // Get service areas
  const serviceAreas = db
    .prepare("SELECT id, city, state, county FROM service_areas WHERE business_id = ?")
    .all(businessId) as ServiceArea[];

  console.log(`Service Areas: ${serviceAreas.length}`);

  // Generate all page combinations
  const messages: PageMessage[] = [];

  for (const keyword of keywords) {
    for (const area of serviceAreas) {
      const citySlug = toSlug(`${area.city}-${area.state}`);
      const pageSlug = `${keyword.slug}/${citySlug}`;

      messages.push({
        businessId: business.id,
        businessName: business.name,
        phone: business.phone || "240-478-2189",
        pageSlug,
        service: keyword.keyword,
        serviceSlug: keyword.slug,
        city: area.city,
        citySlug,
        state: area.state,
        county: area.county,
        language: keyword.language,
      });
    }
  }

  console.log(`\nTotal Pages to Generate: ${messages.length}`);

  // Group by language
  const englishPages = messages.filter((m) => m.language === "en");
  const spanishPages = messages.filter((m) => m.language === "es");
  console.log(`  English: ${englishPages.length}`);
  console.log(`  Spanish: ${spanishPages.length}`);

  if (dryRun) {
    console.log("\n📋 Dry Run - Sample Messages:");
    console.log("-".repeat(60));
    messages.slice(0, 5).forEach((msg, idx) => {
      console.log(`\n${idx + 1}. ${msg.pageSlug}`);
      console.log(`   Service: ${msg.service}`);
      console.log(`   City: ${msg.city}, ${msg.state}`);
      console.log(`   Language: ${msg.language}`);
    });
    if (messages.length > 5) {
      console.log(`\n... and ${messages.length - 5} more`);
    }

    // Estimate time
    const pagesPerHour = 90; // Conservative estimate
    const hours = messages.length / pagesPerHour;
    const cost = hours * 0.3 * 2; // 2 workers at spot price

    console.log("\n📊 Estimates:");
    console.log(`   Time (1 worker): ${(hours).toFixed(1)} hours`);
    console.log(`   Time (2 workers): ${(hours / 2).toFixed(1)} hours`);
    console.log(`   Cost (2 workers): ~$${cost.toFixed(2)}`);

    console.log("\n✅ Dry run complete. Remove --dry-run to send jobs.");
    process.exit(0);
  }

  // Send to SQS
  const sqs = new SQSClient({ region: REGION });

  console.log("\n📤 Sending jobs to SQS...");
  const startTime = Date.now();
  const sentCount = await sendBatch(sqs, QUEUE_URL!, messages);
  const elapsed = (Date.now() - startTime) / 1000;

  console.log(`   Sent: ${sentCount}/${messages.length} messages`);
  console.log(`   Time: ${elapsed.toFixed(2)}s`);

  // Check queue depth
  const queueDepth = await getQueueDepth(sqs, QUEUE_URL!);
  console.log(`   Queue Depth: ${queueDepth}`);

  console.log("\n✅ Jobs sent successfully!");
  console.log("   Start the EC2 worker to begin processing.");

  db.close();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
