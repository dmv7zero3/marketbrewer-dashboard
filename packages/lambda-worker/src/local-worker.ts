import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageBatchCommand,
  type ReceiveMessageCommandOutput,
} from "@aws-sdk/client-sqs";
import type { SQSEvent } from "aws-lambda";
import { handler } from "./index";

const REGION = process.env.AWS_REGION || "us-east-1";
const QUEUE_URL = process.env.SQS_QUEUE_URL || "";
const SQS_ENDPOINT = process.env.SQS_ENDPOINT;
const POLL_INTERVAL_MS = parseInt(process.env.LOCAL_WORKER_POLL_MS || "1000", 10);
const MAX_MESSAGES = parseInt(process.env.LOCAL_WORKER_BATCH_SIZE || "10", 10);

if (!QUEUE_URL) {
  console.error("[Local Worker] Missing SQS_QUEUE_URL");
  process.exit(1);
}

const sqs = new SQSClient({ region: REGION, endpoint: SQS_ENDPOINT });

function toSQSEvent(messages: NonNullable<ReceiveMessageCommandOutput["Messages"]>): SQSEvent {
  return {
    Records: messages.map((message) => ({
      attributes: {
        ApproximateReceiveCount: message.Attributes?.ApproximateReceiveCount ?? "1",
        SentTimestamp: message.Attributes?.SentTimestamp ?? String(Date.now()),
        SenderId: message.Attributes?.SenderId ?? "local",
        ApproximateFirstReceiveTimestamp:
          message.Attributes?.ApproximateFirstReceiveTimestamp ?? String(Date.now()),
      },
      messageId: message.MessageId || "",
      receiptHandle: message.ReceiptHandle || "",
      body: message.Body || "",
      messageAttributes: {},
      md5OfBody: message.MD5OfBody || "",
      eventSource: "aws:sqs",
      eventSourceARN: "",
      awsRegion: REGION,
    })),
  };
}

async function pollOnce(): Promise<void> {
  const response = await sqs.send(
    new ReceiveMessageCommand({
      QueueUrl: QUEUE_URL,
      MaxNumberOfMessages: MAX_MESSAGES,
      WaitTimeSeconds: 10,
      VisibilityTimeout: 60,
    })
  );

  if (!response.Messages || response.Messages.length === 0) {
    return;
  }

  await handler(toSQSEvent(response.Messages));

  const entries = response.Messages
    .filter((message) => message.ReceiptHandle)
    .map((message, idx) => ({
      Id: message.MessageId || String(idx),
      ReceiptHandle: message.ReceiptHandle as string,
    }));

  if (entries.length > 0) {
    await sqs.send(
      new DeleteMessageBatchCommand({
        QueueUrl: QUEUE_URL,
        Entries: entries,
      })
    );
  }
}

async function start(): Promise<void> {
  console.log("[Local Worker] Polling SQS for jobs...");
  while (true) {
    try {
      await pollOnce();
    } catch (error) {
      console.error("[Local Worker] Polling error", error);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

start().catch((error) => {
  console.error("[Local Worker] Fatal error", error);
  process.exit(1);
});
