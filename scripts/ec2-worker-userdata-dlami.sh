#!/bin/bash
#
# EC2 Worker User Data Script (for Deep Learning AMI)
# NVIDIA drivers already installed, just need Ollama + worker
#

set -e
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "=================================================="
echo "MarketBrewer SEO Worker - Boot Script"
echo "=================================================="
echo "Date: $(date)"
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
echo "Instance: $INSTANCE_ID"
echo ""

# Configuration
MODEL_NAME="llama3.1:8b"
WORKER_DIR="/home/ubuntu/worker"
SQS_QUEUE_URL="https://sqs.us-east-1.amazonaws.com/752567131183/marketbrewer-page-generation"
DYNAMODB_TABLE="marketbrewer-seo-pages"
AWS_REGION="us-east-1"

# Wait for network
sleep 5

# Install Ollama
echo "Installing Ollama..."
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama service
sudo systemctl enable ollama
sudo systemctl start ollama

# Wait for Ollama to be ready
echo "Waiting for Ollama..."
for i in {1..30}; do
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "Ollama ready"
        break
    fi
    sleep 2
done

# Pull model (set HOME for ollama)
echo "Pulling model: $MODEL_NAME"
export HOME=/root
sudo -E ollama pull $MODEL_NAME

# Install Node.js
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Create worker directory
mkdir -p $WORKER_DIR
cd $WORKER_DIR

# Create package.json
cat > package.json << 'EOF'
{
  "name": "seo-worker",
  "type": "module",
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.400.0",
    "@aws-sdk/lib-dynamodb": "^3.400.0",
    "@aws-sdk/client-sqs": "^3.400.0",
    "@aws-sdk/client-ec2": "^3.400.0"
  }
}
EOF

npm install

# Create worker script
cat > worker.js << 'WORKEREOF'
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand, GetQueueAttributesCommand } from '@aws-sdk/client-sqs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { EC2Client, TerminateInstancesCommand } from '@aws-sdk/client-ec2';

const REGION = process.env.AWS_REGION || 'us-east-1';
const QUEUE_URL = process.env.SQS_QUEUE_URL;
const TABLE_NAME = process.env.DYNAMODB_TABLE || 'marketbrewer-seo-pages';
const OLLAMA_HOST = 'http://localhost:11434';
const MODEL_NAME = 'llama3.1:8b';
const IDLE_TIMEOUT = 5 * 60 * 1000;

const sqs = new SQSClient({ region: REGION });
const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const ec2 = new EC2Client({ region: REGION });

let processed = 0, failed = 0, lastMsg = Date.now();

async function getInstanceId() {
  try {
    return await (await fetch('http://169.254.169.254/latest/meta-data/instance-id')).text();
  } catch { return null; }
}

async function terminate() {
  const id = await getInstanceId();
  if (!id) process.exit(0);
  console.log(`Terminating ${id}...`);
  await ec2.send(new TerminateInstancesCommand({ InstanceIds: [id] }));
}

async function generate(msg) {
  const { service, city, state, language, businessName, phone, questionnaire } = msg;
  const langInst = language === 'es'
    ? 'Write ALL content in Spanish. Professional Spanish for legal services.'
    : 'Write in English.';

  const prompt = `Generate SEO content for ${service} in ${city}, ${state}.

Business: ${businessName}
${questionnaire?.owner_name ? `Attorney: ${questionnaire.owner_name}` : ''}
Phone: ${phone}
Language: ${language === 'es' ? 'Spanish' : 'English'}

${langInst}

Return ONLY valid JSON (no markdown):
{
  "seo": {
    "title": "${service} ${language === 'es' ? 'en' : 'in'} ${city}, ${state} | ${businessName}",
    "meta_description": "150 chars with phone",
    "keywords": ["5 keywords"],
    "language": "${language}"
  },
  "location": {
    "service": "${service}",
    "serviceSlug": "${msg.serviceSlug}",
    "city": "${city}",
    "citySlug": "${msg.citySlug}",
    "state": "${state}",
    "stateSlug": "${state.toLowerCase()}"
  },
  "h1": "${service} ${language === 'es' ? 'en' : 'in'} ${city}, ${state}",
  "sections": [
    {"heading": "h2 about service", "content": "100-130 words"},
    {"heading": "h2 about local expertise", "content": "100-130 words"},
    {"heading": "h2 call to action", "content": "100-130 words"}
  ],
  "related_services": ["3 slugs"]
}

Requirements: 350-400 words, unique local content, professional legal tone.`;

  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL_NAME, prompt, stream: false, options: { temperature: 0.7, num_predict: 2000 } })
  });

  const data = await res.json();
  let json = data.response.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  const match = json.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in response');
  return JSON.parse(match[0]);
}

async function save(businessId, pageSlug, content) {
  await dynamodb.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      businessId,
      pageSlug,
      status: 'generated',
      language: content.seo.language,
      serviceSlug: content.location.serviceSlug,
      citySlug: content.location.citySlug,
      content,
      generatedAt: new Date().toISOString()
    }
  }));
}

async function processMsg(message) {
  const body = JSON.parse(message.Body);
  console.log(`Processing [${body.language}]: ${body.pageSlug}`);
  const start = Date.now();

  try {
    const content = await generate(body);
    await save(body.businessId, body.pageSlug, content);
    console.log(`  Done ${((Date.now()-start)/1000).toFixed(1)}s`);
    processed++;
    await sqs.send(new DeleteMessageCommand({ QueueUrl: QUEUE_URL, ReceiptHandle: message.ReceiptHandle }));
    lastMsg = Date.now();
  } catch (e) {
    console.error(`  Failed: ${e.message}`);
    failed++;
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('MarketBrewer SEO Worker');
  console.log('='.repeat(50));
  console.log(`Instance: ${await getInstanceId()}`);
  console.log(`Queue: ${QUEUE_URL?.split('/').pop()}`);
  console.log(`Idle timeout: ${IDLE_TIMEOUT/60000}min`);
  console.log('');

  while (true) {
    const idle = Date.now() - lastMsg;
    if (idle > IDLE_TIMEOUT) {
      const attr = await sqs.send(new GetQueueAttributesCommand({
        QueueUrl: QUEUE_URL,
        AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible']
      }));
      const total = parseInt(attr.Attributes?.ApproximateNumberOfMessages||'0') +
                    parseInt(attr.Attributes?.ApproximateNumberOfMessagesNotVisible||'0');
      if (total === 0) {
        console.log(`\nQueue empty ${Math.round(idle/60000)}min. Processed: ${processed}, Failed: ${failed}`);
        await terminate();
        break;
      }
    }

    const { Messages } = await sqs.send(new ReceiveMessageCommand({
      QueueUrl: QUEUE_URL,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 20,
      VisibilityTimeout: 300
    }));

    if (Messages?.length) {
      for (const m of Messages) await processMsg(m);
    } else {
      console.log(`Queue empty, shutdown in ${Math.round((IDLE_TIMEOUT-idle)/1000)}s`);
    }
  }
}

main().catch(console.error);
WORKEREOF

# Start worker
echo "Starting worker..."
export AWS_REGION="$AWS_REGION"
export SQS_QUEUE_URL="$SQS_QUEUE_URL"
export DYNAMODB_TABLE="$DYNAMODB_TABLE"

node worker.js 2>&1 | tee worker.log
