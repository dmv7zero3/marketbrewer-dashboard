#!/usr/bin/env ts-node
/**
 * DynamoDB Setup and Management Script
 *
 * Usage:
 *   npx ts-node scripts/dynamodb-setup.ts create-tables
 *   npx ts-node scripts/dynamodb-setup.ts sync-to-dynamo [business-id]
 *   npx ts-node scripts/dynamodb-setup.ts sync-from-dynamo [business-id]
 *   npx ts-node scripts/dynamodb-setup.ts list-businesses
 *   npx ts-node scripts/dynamodb-setup.ts export <business-id>
 */

import * as path from "path";
import Database from "better-sqlite3";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../packages/server/.env") });
dotenv.config({ path: path.join(__dirname, "../.env") });

import {
  initDynamoDB,
  createTables,
  listBusinesses,
  exportBusinessData,
  getTableNames,
} from "../packages/server/src/services/dynamodb";
import {
  syncAllFromDynamoDB,
  syncBusinessToSQLite,
  syncBusinessToDynamoDB,
  isDynamoDBAvailable,
} from "../packages/server/src/services/profile-sync";

const DB_PATH = path.join(__dirname, "../packages/server/data/seo-platform.db");

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`
DynamoDB Setup and Management

Commands:
  create-tables              Create DynamoDB tables if they don't exist
  sync-to-dynamo [id]        Sync SQLite data to DynamoDB (all or specific business)
  sync-from-dynamo [id]      Sync DynamoDB data to SQLite (all or specific business)
  list-businesses            List all businesses in DynamoDB
  export <id>                Export all data for a business from DynamoDB
  status                     Check DynamoDB connectivity and table status

Environment Variables Required:
  AWS_REGION                 AWS region (default: us-east-1)
  AWS_ACCESS_KEY_ID          AWS access key
  AWS_SECRET_ACCESS_KEY      AWS secret key
  DYNAMODB_TABLE_PREFIX      Table name prefix (default: seo)
`);
    process.exit(0);
  }

  // AWS SDK will automatically use:
  // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
  // 2. Shared credentials file (~/.aws/credentials)
  // 3. EC2 instance profile
  // No explicit check needed - SDK handles credential chain

  try {
    switch (command) {
      case "create-tables":
        await handleCreateTables();
        break;

      case "sync-to-dynamo":
        await handleSyncToDynamo(args[1]);
        break;

      case "sync-from-dynamo":
        await handleSyncFromDynamo(args[1]);
        break;

      case "list-businesses":
        await handleListBusinesses();
        break;

      case "export":
        if (!args[1]) {
          console.error("Error: Business ID required");
          process.exit(1);
        }
        await handleExport(args[1]);
        break;

      case "status":
        await handleStatus();
        break;

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

async function handleCreateTables() {
  console.log("Creating DynamoDB tables...\n");

  const tables = getTableNames();
  console.log("Tables to create:");
  Object.entries(tables).forEach(([key, name]) => {
    console.log(`  - ${key}: ${name}`);
  });
  console.log();

  await createTables();
  console.log("\nTables created successfully!");
}

async function handleSyncToDynamo(businessId?: string) {
  const db = new Database(DB_PATH);

  if (businessId) {
    console.log(`Syncing business ${businessId} to DynamoDB...`);
    await syncBusinessToDynamoDB(db, businessId);
  } else {
    // Sync all businesses
    const businesses = db.prepare("SELECT id, name FROM businesses").all() as Array<{
      id: string;
      name: string;
    }>;

    if (businesses.length === 0) {
      console.log("No businesses found in SQLite");
      return;
    }

    console.log(`Syncing ${businesses.length} businesses to DynamoDB...`);

    for (const business of businesses) {
      console.log(`  Syncing: ${business.name} (${business.id})`);
      await syncBusinessToDynamoDB(db, business.id);
    }
  }

  db.close();
  console.log("\nSync to DynamoDB complete!");
}

async function handleSyncFromDynamo(businessId?: string) {
  const db = new Database(DB_PATH);

  if (businessId) {
    console.log(`Syncing business ${businessId} from DynamoDB to SQLite...`);
    await syncBusinessToSQLite(db, businessId);
  } else {
    console.log("Syncing all businesses from DynamoDB to SQLite...");
    const result = await syncAllFromDynamoDB(db);
    console.log(`\nSync complete:`);
    console.log(`  Businesses: ${result.businesses}`);
    console.log(`  Keywords: ${result.keywords}`);
    console.log(`  Service Areas: ${result.serviceAreas}`);
    console.log(`  Templates: ${result.templates}`);
  }

  db.close();
}

async function handleListBusinesses() {
  initDynamoDB();
  const businesses = await listBusinesses();

  if (businesses.length === 0) {
    console.log("No businesses found in DynamoDB");
    return;
  }

  console.log(`\nBusinesses in DynamoDB (${businesses.length}):\n`);
  console.log("ID                                   | Name                    | Industry");
  console.log("-".repeat(80));

  for (const b of businesses) {
    const id = b.business_id.padEnd(36);
    const name = (b.name || "").substring(0, 23).padEnd(23);
    const industry = (b.industry || "").substring(0, 20);
    console.log(`${id} | ${name} | ${industry}`);
  }
}

async function handleExport(businessId: string) {
  initDynamoDB();
  const data = await exportBusinessData(businessId);

  if (!data.business) {
    console.error(`Business ${businessId} not found`);
    process.exit(1);
  }

  console.log("\n=== Business Export ===\n");
  console.log(JSON.stringify(data, null, 2));
}

async function handleStatus() {
  console.log("Checking DynamoDB status...\n");

  const region = process.env.AWS_REGION || "us-east-1";
  const prefix = process.env.DYNAMODB_TABLE_PREFIX || "seo";

  console.log(`Region: ${region}`);
  console.log(`Table Prefix: ${prefix}`);
  console.log();

  const available = await isDynamoDBAvailable();

  if (available) {
    console.log("Status: CONNECTED\n");

    const businesses = await listBusinesses();
    console.log(`Businesses: ${businesses.length}`);

    if (businesses.length > 0) {
      console.log("\nBusiness Summary:");
      for (const b of businesses) {
        console.log(`  - ${b.name} (${b.business_id})`);
      }
    }
  } else {
    console.log("Status: NOT AVAILABLE");
    console.log("\nPossible issues:");
    console.log("  - AWS credentials not configured correctly");
    console.log("  - Tables not created yet (run: create-tables)");
    console.log("  - Network/region issues");
  }
}

main().catch(console.error);
