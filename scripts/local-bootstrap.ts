import { DynamoDBClient, DescribeTableCommand, CreateTableCommand } from "@aws-sdk/client-dynamodb";
import { SQSClient, CreateQueueCommand, GetQueueUrlCommand } from "@aws-sdk/client-sqs";

const REGION = process.env.AWS_REGION || "us-east-1";
const PROJECT_PREFIX = process.env.PROJECT_PREFIX || "marketbrewer";
const DDB_ENDPOINT = process.env.DDB_ENDPOINT || undefined;
const SQS_ENDPOINT = process.env.SQS_ENDPOINT || undefined;
const TABLE_NAME = process.env.DDB_TABLE_NAME || `${PROJECT_PREFIX}-dashboard`;
const QUEUE_NAME = process.env.SQS_QUEUE_NAME || `${PROJECT_PREFIX}-page-generation`;

const dynamo = new DynamoDBClient({
  region: REGION,
  ...(DDB_ENDPOINT ? { endpoint: DDB_ENDPOINT } : {}),
});
const sqs = new SQSClient({
  region: REGION,
  ...(SQS_ENDPOINT ? { endpoint: SQS_ENDPOINT } : {}),
});

async function ensureTable(): Promise<void> {
  try {
    await dynamo.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    console.log(`[Local Bootstrap] DynamoDB table exists: ${TABLE_NAME}`);
    return;
  } catch (error) {
    if (!(error instanceof Error) || error.name !== "ResourceNotFoundException") {
      throw error;
    }
  }

  await dynamo.send(
    new CreateTableCommand({
      TableName: TABLE_NAME,
      BillingMode: "PAY_PER_REQUEST",
      AttributeDefinitions: [
        { AttributeName: "PK", AttributeType: "S" },
        { AttributeName: "SK", AttributeType: "S" },
      ],
      KeySchema: [
        { AttributeName: "PK", KeyType: "HASH" },
        { AttributeName: "SK", KeyType: "RANGE" },
      ],
    })
  );
  console.log(`[Local Bootstrap] Created DynamoDB table: ${TABLE_NAME}`);
}

async function ensureQueue(): Promise<void> {
  await sqs.send(
    new CreateQueueCommand({
      QueueName: QUEUE_NAME,
    })
  );
  const urlResult = await sqs.send(new GetQueueUrlCommand({ QueueName: QUEUE_NAME }));
  console.log(`[Local Bootstrap] SQS queue ready: ${urlResult.QueueUrl}`);
}

async function run(): Promise<void> {
  await ensureTable();
  await ensureQueue();
  console.log("[Local Bootstrap] Local infrastructure ready");
}

run().catch((error) => {
  console.error("[Local Bootstrap] Failed", error);
  process.exit(1);
});
