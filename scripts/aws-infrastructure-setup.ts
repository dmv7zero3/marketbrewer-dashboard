/**
 * AWS Infrastructure Setup for SEO Page Generation
 *
 * Creates:
 * - DynamoDB table: marketbrewer-seo-pages
 * - SQS Queue: marketbrewer-page-generation
 * - SQS Dead Letter Queue: marketbrewer-page-generation-dlq
 * - CloudWatch Budget Alarm
 *
 * Run: npx ts-node scripts/aws-infrastructure-setup.ts
 */

import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  ResourceInUseException,
} from "@aws-sdk/client-dynamodb";
import {
  SQSClient,
  CreateQueueCommand,
  GetQueueAttributesCommand,
  SetQueueAttributesCommand,
  GetQueueUrlCommand,
} from "@aws-sdk/client-sqs";
import {
  CloudWatchClient,
  PutMetricAlarmCommand,
} from "@aws-sdk/client-cloudwatch";

const REGION = process.env.AWS_REGION || "us-east-1";
const TABLE_NAME = "marketbrewer-seo-pages";
const QUEUE_NAME = "marketbrewer-page-generation";
const DLQ_NAME = "marketbrewer-page-generation-dlq";

const dynamodb = new DynamoDBClient({ region: REGION });
const sqs = new SQSClient({ region: REGION });
const cloudwatch = new CloudWatchClient({ region: REGION });

async function createDynamoDBTable(): Promise<void> {
  console.log(`\n📦 Creating DynamoDB table: ${TABLE_NAME}`);

  try {
    await dynamodb.send(
      new CreateTableCommand({
        TableName: TABLE_NAME,
        KeySchema: [
          { AttributeName: "businessId", KeyType: "HASH" }, // Partition key
          { AttributeName: "pageSlug", KeyType: "RANGE" }, // Sort key
        ],
        AttributeDefinitions: [
          { AttributeName: "businessId", AttributeType: "S" },
          { AttributeName: "pageSlug", AttributeType: "S" },
          { AttributeName: "statusKey", AttributeType: "S" }, // businessId#status
          { AttributeName: "createdAt", AttributeType: "S" },
          { AttributeName: "languageKey", AttributeType: "S" }, // language#pageSlug
          { AttributeName: "serviceKey", AttributeType: "S" }, // serviceSlug#citySlug
        ],
        GlobalSecondaryIndexes: [
          {
            // GSI1: Query by status (pending, generated, failed)
            IndexName: "StatusIndex",
            KeySchema: [
              { AttributeName: "statusKey", KeyType: "HASH" },
              { AttributeName: "createdAt", KeyType: "RANGE" },
            ],
            Projection: { ProjectionType: "ALL" },
          },
          {
            // GSI2: Query by language
            IndexName: "LanguageIndex",
            KeySchema: [
              { AttributeName: "businessId", KeyType: "HASH" },
              { AttributeName: "languageKey", KeyType: "RANGE" },
            ],
            Projection: { ProjectionType: "ALL" },
          },
          {
            // GSI3: Query by service/city
            IndexName: "ServiceIndex",
            KeySchema: [
              { AttributeName: "businessId", KeyType: "HASH" },
              { AttributeName: "serviceKey", KeyType: "RANGE" },
            ],
            Projection: { ProjectionType: "ALL" },
          },
        ],
        BillingMode: "PAY_PER_REQUEST", // On-demand pricing
        Tags: [
          { Key: "Project", Value: "MarketBrewer" },
          { Key: "Component", Value: "SEO-Pages" },
        ],
      })
    );

    console.log(`   ✅ Table created successfully`);

    // Wait for table to be active
    console.log(`   ⏳ Waiting for table to be active...`);
    let isActive = false;
    while (!isActive) {
      const { Table } = await dynamodb.send(
        new DescribeTableCommand({ TableName: TABLE_NAME })
      );
      if (Table?.TableStatus === "ACTIVE") {
        isActive = true;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
    console.log(`   ✅ Table is active`);
  } catch (error) {
    if (error instanceof ResourceInUseException) {
      console.log(`   ⚠️  Table already exists`);
    } else {
      throw error;
    }
  }
}

async function createSQSQueues(): Promise<{ queueUrl: string; dlqUrl: string }> {
  console.log(`\n📬 Creating SQS queues`);

  // Create Dead Letter Queue first
  console.log(`   Creating DLQ: ${DLQ_NAME}`);
  const dlqResult = await sqs.send(
    new CreateQueueCommand({
      QueueName: DLQ_NAME,
      Attributes: {
        MessageRetentionPeriod: "1209600", // 14 days
      },
      tags: {
        Project: "MarketBrewer",
        Component: "SEO-Pages",
      },
    })
  );
  const dlqUrl = dlqResult.QueueUrl!;
  console.log(`   ✅ DLQ created: ${dlqUrl}`);

  // Get DLQ ARN
  const dlqAttributes = await sqs.send(
    new GetQueueAttributesCommand({
      QueueUrl: dlqUrl,
      AttributeNames: ["QueueArn"],
    })
  );
  const dlqArn = dlqAttributes.Attributes!.QueueArn;

  // Create main queue with DLQ redrive policy
  console.log(`   Creating main queue: ${QUEUE_NAME}`);
  const queueResult = await sqs.send(
    new CreateQueueCommand({
      QueueName: QUEUE_NAME,
      Attributes: {
        VisibilityTimeout: "300", // 5 minutes (for page generation)
        MessageRetentionPeriod: "604800", // 7 days
        ReceiveMessageWaitTimeSeconds: "20", // Long polling
        RedrivePolicy: JSON.stringify({
          deadLetterTargetArn: dlqArn,
          maxReceiveCount: 3, // Move to DLQ after 3 failures
        }),
      },
      tags: {
        Project: "MarketBrewer",
        Component: "SEO-Pages",
      },
    })
  );
  const queueUrl = queueResult.QueueUrl!;
  console.log(`   ✅ Main queue created: ${queueUrl}`);

  return { queueUrl, dlqUrl };
}

async function createCloudWatchAlarms(queueUrl: string): Promise<void> {
  console.log(`\n🚨 Creating CloudWatch alarms`);

  // Get queue name from URL for metrics
  const queueName = queueUrl.split("/").pop()!;

  // Alarm: Queue has messages (trigger workers)
  await cloudwatch.send(
    new PutMetricAlarmCommand({
      AlarmName: "marketbrewer-seo-queue-has-messages",
      AlarmDescription: "Triggers when SQS queue has messages to process",
      MetricName: "ApproximateNumberOfMessagesVisible",
      Namespace: "AWS/SQS",
      Dimensions: [{ Name: "QueueName", Value: queueName }],
      Statistic: "Average",
      Period: 60,
      EvaluationPeriods: 1,
      Threshold: 1,
      ComparisonOperator: "GreaterThanOrEqualToThreshold",
      TreatMissingData: "notBreaching",
      Tags: [
        { Key: "Project", Value: "MarketBrewer" },
        { Key: "Component", Value: "SEO-Pages" },
      ],
    })
  );
  console.log(`   ✅ Queue messages alarm created`);

  // Alarm: Queue is empty (stop workers)
  await cloudwatch.send(
    new PutMetricAlarmCommand({
      AlarmName: "marketbrewer-seo-queue-empty",
      AlarmDescription: "Triggers when SQS queue is empty for 10 minutes",
      MetricName: "ApproximateNumberOfMessagesVisible",
      Namespace: "AWS/SQS",
      Dimensions: [{ Name: "QueueName", Value: queueName }],
      Statistic: "Average",
      Period: 300, // 5 minutes
      EvaluationPeriods: 2, // 2 periods = 10 minutes
      Threshold: 0,
      ComparisonOperator: "LessThanOrEqualToThreshold",
      TreatMissingData: "breaching",
      Tags: [
        { Key: "Project", Value: "MarketBrewer" },
        { Key: "Component", Value: "SEO-Pages" },
      ],
    })
  );
  console.log(`   ✅ Queue empty alarm created`);

  // Alarm: DLQ has messages (failures)
  await cloudwatch.send(
    new PutMetricAlarmCommand({
      AlarmName: "marketbrewer-seo-dlq-messages",
      AlarmDescription: "Alerts when pages fail to generate",
      MetricName: "ApproximateNumberOfMessagesVisible",
      Namespace: "AWS/SQS",
      Dimensions: [{ Name: "QueueName", Value: DLQ_NAME }],
      Statistic: "Sum",
      Period: 300,
      EvaluationPeriods: 1,
      Threshold: 1,
      ComparisonOperator: "GreaterThanOrEqualToThreshold",
      TreatMissingData: "notBreaching",
      Tags: [
        { Key: "Project", Value: "MarketBrewer" },
        { Key: "Component", Value: "SEO-Pages" },
      ],
    })
  );
  console.log(`   ✅ DLQ alarm created`);
}

async function printSummary(queueUrl: string, dlqUrl: string): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`✅ AWS Infrastructure Setup Complete`);
  console.log(`${"=".repeat(60)}`);
  console.log(`
Resources Created:

📦 DynamoDB Table
   Name: ${TABLE_NAME}
   Billing: Pay-per-request (on-demand)
   Indexes:
   - Primary: businessId (PK) + pageSlug (SK)
   - StatusIndex: statusKey + createdAt
   - LanguageIndex: businessId + languageKey
   - ServiceIndex: businessId + serviceKey

📬 SQS Queues
   Main Queue: ${queueUrl}
   Dead Letter Queue: ${dlqUrl}
   Visibility Timeout: 5 minutes
   Max Retries: 3

🚨 CloudWatch Alarms
   - marketbrewer-seo-queue-has-messages (start workers)
   - marketbrewer-seo-queue-empty (stop workers)
   - marketbrewer-seo-dlq-messages (failure alerts)

Environment Variables to Set:
   DYNAMODB_TABLE=${TABLE_NAME}
   SQS_QUEUE_URL=${queueUrl}
   SQS_DLQ_URL=${dlqUrl}
   AWS_REGION=${REGION}
`);
}

async function main(): Promise<void> {
  console.log("🚀 MarketBrewer SEO Infrastructure Setup");
  console.log(`   Region: ${REGION}`);

  try {
    await createDynamoDBTable();
    const { queueUrl, dlqUrl } = await createSQSQueues();
    await createCloudWatchAlarms(queueUrl);
    await printSummary(queueUrl, dlqUrl);
  } catch (error) {
    console.error("\n❌ Setup failed:", error);
    process.exit(1);
  }
}

main();
