#!/bin/bash
#
# EC2 Worker User Data Script
# This script runs at instance boot, sets up Ollama, and starts processing jobs
# Auto-terminates when queue is empty for 5+ minutes
#

set -e
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "=================================================="
echo "MarketBrewer SEO Worker - Boot Script"
echo "=================================================="
echo "Date: $(date)"
echo "Instance: $(curl -s http://169.254.169.254/latest/meta-data/instance-id)"
echo ""

# Configuration
MODEL_NAME="llama3.1:8b"
WORKER_DIR="/opt/marketbrewer-worker"
SQS_QUEUE_URL="https://sqs.us-east-1.amazonaws.com/752567131183/marketbrewer-page-generation"
DYNAMODB_TABLE="marketbrewer-seo-pages"
AWS_REGION="us-east-1"

# Wait for network
sleep 10

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
fi

# Ensure Ollama service is running
sudo systemctl enable ollama
sudo systemctl start ollama

# Wait for Ollama to be ready
echo "Waiting for Ollama to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "Ollama is ready"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 2
done

# Check if model exists, pull if not
if ! ollama list | grep -q "$MODEL_NAME"; then
    echo "Pulling model: $MODEL_NAME"
    ollama pull $MODEL_NAME
fi

# Create worker directory
mkdir -p $WORKER_DIR
cd $WORKER_DIR

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Create package.json
cat > package.json << 'PACKAGE_EOF'
{
  "name": "marketbrewer-seo-worker",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.400.0",
    "@aws-sdk/lib-dynamodb": "^3.400.0",
    "@aws-sdk/client-sqs": "^3.400.0",
    "@aws-sdk/client-ec2": "^3.400.0"
  }
}
PACKAGE_EOF

# Install dependencies
npm install

# Create worker script with auto-shutdown
cat > worker.js << 'WORKER_EOF'
/**
 * SEO Page Generation Worker with Auto-Shutdown
 *
 * Polls SQS for jobs, generates content via Ollama, saves to DynamoDB.
 * Auto-terminates the EC2 instance when queue is empty for 5+ minutes.
 */

import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  GetQueueAttributesCommand,
} from '@aws-sdk/client-sqs';
import {
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  EC2Client,
  TerminateInstancesCommand,
} from '@aws-sdk/client-ec2';

const REGION = process.env.AWS_REGION || 'us-east-1';
const QUEUE_URL = process.env.SQS_QUEUE_URL;
const TABLE_NAME = process.env.DYNAMODB_TABLE || 'marketbrewer-seo-pages';
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const MODEL_NAME = process.env.MODEL_NAME || 'llama3.1:8b';
const EMPTY_QUEUE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

if (!QUEUE_URL) {
  console.error('SQS_QUEUE_URL required');
  process.exit(1);
}

const sqs = new SQSClient({ region: REGION });
const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const ec2 = new EC2Client({ region: REGION });

let isShuttingDown = false;
let processedCount = 0;
let failedCount = 0;
let lastMessageTime = Date.now();

// Get instance ID from metadata
async function getInstanceId() {
  try {
    const response = await fetch('http://169.254.169.254/latest/meta-data/instance-id');
    return await response.text();
  } catch {
    return null;
  }
}

async function terminateInstance() {
  const instanceId = await getInstanceId();
  if (!instanceId) {
    console.log('Not running on EC2, exiting instead of terminating');
    process.exit(0);
  }

  console.log(`\nTerminating instance ${instanceId}...`);
  await ec2.send(new TerminateInstancesCommand({
    InstanceIds: [instanceId]
  }));
}

async function getQueueMessageCount() {
  const result = await sqs.send(new GetQueueAttributesCommand({
    QueueUrl: QUEUE_URL,
    AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible']
  }));

  const visible = parseInt(result.Attributes?.ApproximateNumberOfMessages || '0');
  const inFlight = parseInt(result.Attributes?.ApproximateNumberOfMessagesNotVisible || '0');
  return visible + inFlight;
}

async function generateContent(message) {
  const { businessId, pageSlug, service, serviceSlug, city, citySlug, state, stateSlug, language, phone, businessName, questionnaire } = message;

  const languageInstructions = language === 'es'
    ? 'Write ALL content in Spanish. Use professional Spanish appropriate for legal services in the United States.'
    : 'Write all content in English.';

  const ownerInfo = questionnaire?.owner_name
    ? `Attorney: ${questionnaire.owner_name}${questionnaire.owner_title ? `, ${questionnaire.owner_title}` : ''}`
    : '';

  const experience = questionnaire?.years_in_business
    ? `Experience: ${questionnaire.years_in_business}+ years in practice`
    : '';

  const prompt = `Generate SEO content for a ${service} page targeting ${city}, ${state}.

Business: ${businessName}
${ownerInfo}
${experience}
Phone: ${phone}
Language: ${language === 'es' ? 'Spanish' : 'English'}

${languageInstructions}

Return ONLY valid JSON with this exact structure (no markdown, no code blocks):
{
  "seo": {
    "title": "${service} ${language === 'es' ? 'en' : 'in'} ${city}, ${state} | ${businessName}",
    "meta_description": "150 character description with phone number",
    "keywords": ["5 relevant keywords for this service and location"],
    "language": "${language}"
  },
  "location": {
    "service": "${service}",
    "serviceSlug": "${serviceSlug}",
    "city": "${city}",
    "citySlug": "${citySlug}",
    "state": "${state}",
    "stateSlug": "${stateSlug}"
  },
  "h1": "${service} ${language === 'es' ? 'en' : 'in'} ${city}, ${state}",
  "sections": [
    {"heading": "unique compelling h2 about the service", "content": "100-130 words about the service"},
    {"heading": "unique compelling h2 about local expertise", "content": "100-130 words about local knowledge"},
    {"heading": "unique compelling h2 with call to action", "content": "100-130 words encouraging contact"}
  ],
  "related_services": ["3 related service slugs"]
}

Requirements:
- 350-400 words total across all sections
- Unique content specific to ${city}, ${state}
- Include local references when possible
- Professional tone for legal services
- Each H2 heading must be unique and engaging
- DO NOT include the phone number in the content body
- Return ONLY the JSON object, no explanation`;

  const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL_NAME,
      prompt,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 2000,
      }
    })
  });

  const data = await response.json();

  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = data.response;

  // Remove markdown code blocks if present
  jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');

  // Find JSON object
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not extract JSON from response');
  }

  return JSON.parse(jsonMatch[0]);
}

async function saveToDatabase(businessId, pageSlug, content, language, serviceSlug, citySlug) {
  const now = new Date().toISOString();

  await dynamodb.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      businessId,
      pageSlug,
      status: 'generated',
      language,
      serviceSlug,
      citySlug,
      content,
      wordCount: JSON.stringify(content).split(/\s+/).length,
      generatedAt: now,
      updatedAt: now,
    }
  }));
}

async function processMessage(message) {
  const body = JSON.parse(message.Body);
  const { businessId, pageSlug, language } = body;

  console.log(`Processing [${language}]: ${pageSlug}`);
  const start = Date.now();

  try {
    const content = await generateContent(body);
    const elapsed = Date.now() - start;

    await saveToDatabase(
      businessId,
      pageSlug,
      content,
      content.seo.language,
      content.location.serviceSlug,
      content.location.citySlug
    );

    console.log(`  Done in ${(elapsed / 1000).toFixed(1)}s`);
    processedCount++;

    await sqs.send(new DeleteMessageCommand({
      QueueUrl: QUEUE_URL,
      ReceiptHandle: message.ReceiptHandle,
    }));

    lastMessageTime = Date.now();

  } catch (error) {
    console.error(`  Failed: ${error.message}`);
    failedCount++;
  }
}

async function pollQueue() {
  const instanceId = await getInstanceId();

  console.log('='.repeat(50));
  console.log('MarketBrewer SEO Worker Started');
  console.log('='.repeat(50));
  console.log(`Instance: ${instanceId || 'local'}`);
  console.log(`Queue: ${QUEUE_URL.split('/').pop()}`);
  console.log(`Model: ${MODEL_NAME}`);
  console.log(`Auto-shutdown: ${EMPTY_QUEUE_TIMEOUT_MS / 60000} minutes idle`);
  console.log('');

  while (!isShuttingDown) {
    try {
      // Check for idle timeout
      const idleTime = Date.now() - lastMessageTime;
      if (idleTime > EMPTY_QUEUE_TIMEOUT_MS) {
        const messageCount = await getQueueMessageCount();
        if (messageCount === 0) {
          console.log(`\nQueue empty for ${Math.round(idleTime / 60000)} minutes`);
          console.log(`Processed: ${processedCount}, Failed: ${failedCount}`);
          await terminateInstance();
          break;
        }
      }

      const { Messages } = await sqs.send(new ReceiveMessageCommand({
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 20,
        VisibilityTimeout: 300,
      }));

      if (Messages && Messages.length > 0) {
        for (const message of Messages) {
          await processMessage(message);
        }
      } else {
        const remaining = Math.round((EMPTY_QUEUE_TIMEOUT_MS - (Date.now() - lastMessageTime)) / 1000);
        console.log(`Queue empty, shutdown in ${remaining}s if no messages`);
      }
    } catch (error) {
      console.error('Error:', error.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => { isShuttingDown = true; });
process.on('SIGINT', () => { isShuttingDown = true; });

pollQueue();
WORKER_EOF

# Start the worker
echo "Starting worker..."
export AWS_REGION="$AWS_REGION"
export SQS_QUEUE_URL="$SQS_QUEUE_URL"
export DYNAMODB_TABLE="$DYNAMODB_TABLE"
export OLLAMA_HOST="http://localhost:11434"
export MODEL_NAME="$MODEL_NAME"

node worker.js
