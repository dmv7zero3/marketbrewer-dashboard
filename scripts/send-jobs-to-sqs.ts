/**
 * Send Page Generation Jobs to SQS
 *
 * This script reads services and service areas from the database
 * and sends page generation jobs to SQS for EC2 workers to process.
 *
 * Usage:
 *   npx ts-node scripts/send-jobs-to-sqs.ts --business-id=<id> [--dry-run]
 */

import { SQSClient, SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import Database from 'better-sqlite3';
import path from 'path';

const REGION = 'us-east-1';
const QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/752567131183/marketbrewer-page-generation';
const DB_PATH = path.join(__dirname, '../packages/server/data/seo-platform.db');

interface Keyword {
  id: string;
  keyword: string;
  slug: string;
  language: string;
}

interface ServiceArea {
  city: string;
  state: string;
  county: string | null;
  slug: string;
}

interface Business {
  id: string;
  name: string;
  phone: string;
}

interface Questionnaire {
  owner_name?: string;
  owner_title?: string;
  years_in_business?: number;
  business_description?: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  const args = process.argv.slice(2);
  const businessIdArg = args.find(a => a.startsWith('--business-id='));
  const dryRun = args.includes('--dry-run');

  if (!businessIdArg) {
    console.error('Usage: npx ts-node scripts/send-jobs-to-sqs.ts --business-id=<id> [--dry-run]');
    process.exit(1);
  }

  const businessId = businessIdArg.split('=')[1];

  console.log('='.repeat(60));
  console.log('MarketBrewer SEO - Send Jobs to SQS');
  console.log('='.repeat(60));
  console.log(`Business ID: ${businessId}`);
  console.log(`Dry Run: ${dryRun}`);
  console.log('');

  // Connect to database
  const db = new Database(DB_PATH, { readonly: true });

  // Get business info
  const business = db.prepare(`
    SELECT id, name, phone FROM businesses WHERE id = ?
  `).get(businessId) as Business | undefined;

  if (!business) {
    console.error(`Business not found: ${businessId}`);
    process.exit(1);
  }

  // Get questionnaire
  const questionnaireRow = db.prepare(`
    SELECT data FROM questionnaires WHERE business_id = ?
  `).get(businessId) as { data: string } | undefined;

  const questionnaire: Questionnaire = questionnaireRow
    ? JSON.parse(questionnaireRow.data)
    : {};

  // Get keywords (services)
  const keywords = db.prepare(`
    SELECT id, keyword, slug, language FROM keywords WHERE business_id = ?
  `).all(businessId) as Keyword[];

  // Get service areas
  const serviceAreas = db.prepare(`
    SELECT city, state, county, slug FROM service_areas WHERE business_id = ?
  `).all(businessId) as ServiceArea[];

  console.log(`Business: ${business.name}`);
  console.log(`Phone: ${business.phone}`);
  console.log(`Services: ${keywords.length} (${keywords.filter(k => k.language === 'en').length} EN, ${keywords.filter(k => k.language === 'es').length} ES)`);
  console.log(`Service Areas: ${serviceAreas.length}`);
  console.log('');

  // Generate all page combinations
  const jobs: Array<{
    businessId: string;
    pageSlug: string;
    service: string;
    serviceSlug: string;
    city: string;
    citySlug: string;
    state: string;
    stateSlug: string;
    language: string;
    phone: string;
    businessName: string;
    questionnaire: Questionnaire;
  }> = [];

  for (const keyword of keywords) {
    for (const area of serviceAreas) {
      const citySlug = area.slug || slugify(`${area.city}-${area.state}`);
      const pageSlug = `${keyword.slug}/${citySlug}`;

      jobs.push({
        businessId: business.id,
        pageSlug,
        service: keyword.keyword,
        serviceSlug: keyword.slug,
        city: area.city,
        citySlug,
        state: area.state,
        stateSlug: area.state.toLowerCase(),
        language: keyword.language,
        phone: business.phone || '',
        businessName: business.name,
        questionnaire,
      });
    }
  }

  console.log(`Total pages to generate: ${jobs.length}`);
  console.log(`  English: ${jobs.filter(j => j.language === 'en').length}`);
  console.log(`  Spanish: ${jobs.filter(j => j.language === 'es').length}`);
  console.log('');

  if (dryRun) {
    console.log('DRY RUN - Sample jobs:');
    jobs.slice(0, 5).forEach(job => {
      console.log(`  ${job.language.toUpperCase()}: ${job.pageSlug}`);
    });
    console.log('  ...');
    console.log(`\nTo send jobs, run without --dry-run`);
    db.close();
    return;
  }

  // Send jobs to SQS in batches of 10
  const sqs = new SQSClient({ region: REGION });
  let sent = 0;
  let failed = 0;

  console.log('Sending jobs to SQS...');

  for (let i = 0; i < jobs.length; i += 10) {
    const batch = jobs.slice(i, i + 10);

    const entries = batch.map((job, idx) => ({
      Id: `msg-${i + idx}`,
      MessageBody: JSON.stringify(job),
      MessageGroupId: job.businessId, // For FIFO queues, not used here
    }));

    try {
      const result = await sqs.send(new SendMessageBatchCommand({
        QueueUrl: QUEUE_URL,
        Entries: entries,
      }));

      sent += result.Successful?.length || 0;
      failed += result.Failed?.length || 0;

      // Progress update every 100 jobs
      if ((i + 10) % 100 === 0 || i + 10 >= jobs.length) {
        const pct = Math.round(((i + 10) / jobs.length) * 100);
        console.log(`  Progress: ${Math.min(i + 10, jobs.length)}/${jobs.length} (${pct}%)`);
      }
    } catch (error) {
      console.error(`Error sending batch starting at ${i}:`, error);
      failed += batch.length;
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('COMPLETE');
  console.log('='.repeat(60));
  console.log(`Sent: ${sent}`);
  console.log(`Failed: ${failed}`);
  console.log('');
  console.log('Jobs are now in the queue waiting for workers.');
  console.log('Launch EC2 workers to begin processing.');

  db.close();
}

main().catch(console.error);
