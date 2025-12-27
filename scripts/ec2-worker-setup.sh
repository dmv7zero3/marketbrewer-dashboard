#!/bin/bash
#
# EC2 Worker Setup Script for SEO Page Generation
#
# This script sets up an EC2 GPU instance with:
# - Ollama with Llama 3.1 8B model
# - Node.js worker for processing SQS messages
# - Benchmark mode for testing performance
#
# Usage:
#   ./ec2-worker-setup.sh          # Full setup
#   ./ec2-worker-setup.sh benchmark # Run benchmarks only
#

set -e

# Configuration
MODEL_NAME="${MODEL_NAME:-llama3.1:8b}"
OLLAMA_HOST="${OLLAMA_HOST:-http://localhost:11434}"
WORKER_DIR="/opt/marketbrewer-worker"

echo "=================================================="
echo "MarketBrewer SEO Worker Setup"
echo "=================================================="
echo "Model: $MODEL_NAME"
echo "Ollama Host: $OLLAMA_HOST"
echo ""

# Check if running as benchmark only
if [ "$1" == "benchmark" ]; then
    echo "🏃 Running benchmark mode only..."
    cd $WORKER_DIR
    node benchmark.js
    exit 0
fi

# Update system
echo "📦 Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# Install dependencies
echo "📦 Installing dependencies..."
sudo apt-get install -y \
    curl \
    git \
    build-essential \
    nvidia-driver-535 \
    nvidia-cuda-toolkit

# Install Node.js 20
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Ollama
echo "🦙 Installing Ollama..."
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama service
echo "🦙 Starting Ollama service..."
sudo systemctl enable ollama
sudo systemctl start ollama

# Wait for Ollama to be ready
echo "⏳ Waiting for Ollama to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "   ✅ Ollama is ready"
        break
    fi
    echo "   Waiting... ($i/30)"
    sleep 2
done

# Pull the model
echo "🦙 Pulling model: $MODEL_NAME (this may take a few minutes)..."
ollama pull $MODEL_NAME

# Create worker directory
echo "📁 Setting up worker directory..."
sudo mkdir -p $WORKER_DIR
sudo chown $USER:$USER $WORKER_DIR

# Create worker package.json
cat > $WORKER_DIR/package.json << 'PACKAGE_EOF'
{
  "name": "marketbrewer-seo-worker",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node worker.js",
    "benchmark": "node benchmark.js"
  },
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.400.0",
    "@aws-sdk/lib-dynamodb": "^3.400.0",
    "@aws-sdk/client-sqs": "^3.400.0"
  }
}
PACKAGE_EOF

# Create benchmark script
cat > $WORKER_DIR/benchmark.js << 'BENCHMARK_EOF'
/**
 * Benchmark Script for SEO Page Generation
 *
 * Tests:
 * 1. Cold start time
 * 2. Model load time
 * 3. First page generation (cold)
 * 4. Warm page generation (average of 5)
 * 5. Throughput estimation
 */

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const MODEL_NAME = process.env.MODEL_NAME || 'llama3.1:8b';

const samplePrompt = `Generate SEO content for a DUI Lawyer page targeting Montgomery County, MD.

Business: Street Lawyer Magic
Phone: 240-478-2189

Return JSON with this exact structure:
{
  "seo": {
    "title": "page title with keyword and location",
    "meta_description": "150 char description",
    "keywords": ["keyword1", "keyword2"],
    "language": "en"
  },
  "location": {
    "service": "DUI Lawyer",
    "serviceSlug": "dui-lawyer",
    "city": "Montgomery County",
    "citySlug": "montgomery-county",
    "state": "MD",
    "stateSlug": "md"
  },
  "h1": "main heading",
  "sections": [
    {"heading": "h2 heading 1", "content": "paragraph 1 (100+ words)"},
    {"heading": "h2 heading 2", "content": "paragraph 2 (100+ words)"},
    {"heading": "h2 heading 3", "content": "paragraph 3 (100+ words)"}
  ],
  "related_services": ["criminal-defense", "traffic-violations"]
}

Write compelling, unique content. 350-400 words total.`;

async function checkOllama() {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}

async function generatePage(prompt) {
  const start = Date.now();

  const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL_NAME,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 2000,
      }
    })
  });

  const data = await response.json();
  const elapsed = Date.now() - start;

  return {
    elapsed,
    response: data.response,
    tokens: data.eval_count || 0,
    tokensPerSecond: data.eval_count ? (data.eval_count / (elapsed / 1000)).toFixed(1) : 'N/A'
  };
}

async function runBenchmark() {
  console.log('='.repeat(60));
  console.log('MarketBrewer SEO Worker Benchmark');
  console.log('='.repeat(60));
  console.log(`Model: ${MODEL_NAME}`);
  console.log(`Ollama Host: ${OLLAMA_HOST}`);
  console.log('');

  // Check Ollama
  console.log('1️⃣  Checking Ollama connection...');
  const ollamaReady = await checkOllama();
  if (!ollamaReady) {
    console.error('   ❌ Ollama is not running');
    process.exit(1);
  }
  console.log('   ✅ Ollama is running');

  // Cold start / first generation
  console.log('\n2️⃣  First page generation (cold)...');
  const cold = await generatePage(samplePrompt);
  console.log(`   ⏱️  Time: ${(cold.elapsed / 1000).toFixed(2)}s`);
  console.log(`   📊 Tokens: ${cold.tokens}`);
  console.log(`   🚀 Speed: ${cold.tokensPerSecond} tokens/sec`);

  // Warm generations
  console.log('\n3️⃣  Warm page generations (5 iterations)...');
  const warmTimes = [];
  for (let i = 0; i < 5; i++) {
    const result = await generatePage(samplePrompt);
    warmTimes.push(result.elapsed);
    console.log(`   Run ${i + 1}: ${(result.elapsed / 1000).toFixed(2)}s (${result.tokensPerSecond} tok/s)`);
  }

  const avgWarm = warmTimes.reduce((a, b) => a + b, 0) / warmTimes.length;
  const minWarm = Math.min(...warmTimes);
  const maxWarm = Math.max(...warmTimes);

  // Calculate throughput
  const pagesPerHour = Math.floor(3600000 / avgWarm);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 BENCHMARK RESULTS');
  console.log('='.repeat(60));
  console.log(`
Model: ${MODEL_NAME}

Generation Times:
  Cold start:     ${(cold.elapsed / 1000).toFixed(2)}s
  Warm average:   ${(avgWarm / 1000).toFixed(2)}s
  Warm min:       ${(minWarm / 1000).toFixed(2)}s
  Warm max:       ${(maxWarm / 1000).toFixed(2)}s

Throughput (1 worker):
  Pages/hour:     ${pagesPerHour}
  Pages/day:      ${pagesPerHour * 24}

Projections for 2000 pages:
  1 worker:       ${(2000 / pagesPerHour).toFixed(1)} hours
  2 workers:      ${(2000 / pagesPerHour / 2).toFixed(1)} hours
  3 workers:      ${(2000 / pagesPerHour / 3).toFixed(1)} hours

Cost Estimate (g5.xlarge spot @ $0.30/hr):
  1 worker:       $${((2000 / pagesPerHour) * 0.30).toFixed(2)}
  2 workers:      $${((2000 / pagesPerHour / 2) * 0.60).toFixed(2)}
  3 workers:      $${((2000 / pagesPerHour / 3) * 0.90).toFixed(2)}
`);
  console.log('='.repeat(60));

  // Validate JSON output
  console.log('\n4️⃣  Validating JSON output...');
  try {
    // Try to extract JSON from response
    const jsonMatch = cold.response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.seo && parsed.location && parsed.h1 && parsed.sections) {
        console.log('   ✅ Valid JSON structure');
        console.log(`   📝 Word count: ~${cold.response.split(/\s+/).length} words`);
      } else {
        console.log('   ⚠️  JSON parsed but missing required fields');
      }
    } else {
      console.log('   ⚠️  Could not extract JSON from response');
    }
  } catch (e) {
    console.log('   ❌ Invalid JSON:', e.message);
  }
}

runBenchmark().catch(console.error);
BENCHMARK_EOF

# Create main worker script
cat > $WORKER_DIR/worker.js << 'WORKER_EOF'
/**
 * SEO Page Generation Worker
 *
 * Polls SQS for page generation jobs, generates content via Ollama,
 * and stores results in DynamoDB.
 */

import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs';
import {
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

const REGION = process.env.AWS_REGION || 'us-east-1';
const QUEUE_URL = process.env.SQS_QUEUE_URL;
const TABLE_NAME = process.env.DYNAMODB_TABLE || 'marketbrewer-seo-pages';
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const MODEL_NAME = process.env.MODEL_NAME || 'llama3.1:8b';

if (!QUEUE_URL) {
  console.error('❌ SQS_QUEUE_URL environment variable is required');
  process.exit(1);
}

const sqs = new SQSClient({ region: REGION });
const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

let isShuttingDown = false;
let processedCount = 0;
let failedCount = 0;

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, finishing current job...');
  isShuttingDown = true;
});

process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, finishing current job...');
  isShuttingDown = true;
});

async function generateContent(message) {
  const { businessId, pageSlug, service, city, state, language, phone, businessName } = message;

  const languageInstructions = language === 'es'
    ? 'Write all content in Spanish. Use professional Spanish appropriate for legal services.'
    : 'Write all content in English.';

  const prompt = `Generate SEO content for a ${service} page targeting ${city}, ${state}.

Business: ${businessName}
Phone: ${phone}
Language: ${language === 'es' ? 'Spanish' : 'English'}

${languageInstructions}

Return JSON with this exact structure:
{
  "seo": {
    "title": "page title with keyword and location | ${businessName}",
    "meta_description": "150 char description with call to action",
    "keywords": ["5 relevant keywords"],
    "language": "${language}"
  },
  "location": {
    "service": "${service}",
    "serviceSlug": "${pageSlug.split('/')[0]}",
    "city": "${city}",
    "citySlug": "${city.toLowerCase().replace(/\s+/g, '-')}",
    "state": "${state}",
    "stateSlug": "${state.toLowerCase()}"
  },
  "h1": "main heading with keyword and location",
  "sections": [
    {"heading": "compelling h2 about the problem/service", "content": "paragraph 1 (100+ words)"},
    {"heading": "compelling h2 about your approach", "content": "paragraph 2 (100+ words)"},
    {"heading": "compelling h2 with call to action", "content": "paragraph 3 (100+ words)"}
  ],
  "related_services": ["3 related service slugs"]
}

Requirements:
- 350-400 words total across all sections
- Unique, compelling content specific to ${city}
- Include local references and landmarks
- Professional tone appropriate for legal services
- Each section heading should be unique and engaging`;

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

  // Extract JSON from response
  const jsonMatch = data.response.match(/\{[\s\S]*\}/);
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
      statusKey: `${businessId}#generated`,
      languageKey: `${language}#${pageSlug}`,
      serviceKey: `${serviceSlug}#${citySlug}`,
      content,
      wordCount: JSON.stringify(content).split(/\s+/).length,
      generatedAt: now,
      updatedAt: now,
      version: 1,
    }
  }));
}

async function processMessage(message) {
  const body = JSON.parse(message.Body);
  const { businessId, pageSlug } = body;

  console.log(`\n📄 Processing: ${businessId}/${pageSlug}`);
  const start = Date.now();

  try {
    // Generate content
    const content = await generateContent(body);
    const elapsed = Date.now() - start;

    // Save to DynamoDB
    await saveToDatabase(
      businessId,
      pageSlug,
      content,
      content.seo.language,
      content.location.serviceSlug,
      content.location.citySlug
    );

    console.log(`   ✅ Generated in ${(elapsed / 1000).toFixed(2)}s`);
    processedCount++;

    // Delete from queue
    await sqs.send(new DeleteMessageCommand({
      QueueUrl: QUEUE_URL,
      ReceiptHandle: message.ReceiptHandle,
    }));

  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
    failedCount++;
    // Message will return to queue after visibility timeout
  }
}

async function pollQueue() {
  console.log('🚀 MarketBrewer SEO Worker Started');
  console.log(`   Queue: ${QUEUE_URL}`);
  console.log(`   Model: ${MODEL_NAME}`);
  console.log(`   Table: ${TABLE_NAME}`);
  console.log('');

  while (!isShuttingDown) {
    try {
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
        console.log('📭 Queue empty, waiting...');
      }
    } catch (error) {
      console.error('❌ Error polling queue:', error.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  console.log('\n📊 Worker Statistics:');
  console.log(`   Processed: ${processedCount}`);
  console.log(`   Failed: ${failedCount}`);
  console.log('👋 Worker stopped');
}

pollQueue();
WORKER_EOF

# Install npm dependencies
echo "📦 Installing npm dependencies..."
cd $WORKER_DIR
npm install

# Create systemd service for auto-start
echo "🔧 Creating systemd service..."
sudo tee /etc/systemd/system/marketbrewer-worker.service > /dev/null << SERVICE_EOF
[Unit]
Description=MarketBrewer SEO Page Generation Worker
After=network.target ollama.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$WORKER_DIR
Environment=NODE_ENV=production
Environment=AWS_REGION=${AWS_REGION:-us-east-1}
Environment=SQS_QUEUE_URL=${SQS_QUEUE_URL}
Environment=DYNAMODB_TABLE=marketbrewer-seo-pages
Environment=OLLAMA_HOST=http://localhost:11434
Environment=MODEL_NAME=$MODEL_NAME
ExecStart=/usr/bin/node worker.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICE_EOF

sudo systemctl daemon-reload

echo ""
echo "=================================================="
echo "✅ Setup Complete!"
echo "=================================================="
echo ""
echo "To run benchmark:"
echo "  cd $WORKER_DIR && node benchmark.js"
echo ""
echo "To start worker manually:"
echo "  cd $WORKER_DIR && node worker.js"
echo ""
echo "To start worker as service:"
echo "  sudo systemctl start marketbrewer-worker"
echo "  sudo systemctl enable marketbrewer-worker"
echo ""
echo "Environment variables needed:"
echo "  export AWS_REGION=us-east-1"
echo "  export SQS_QUEUE_URL=<your-queue-url>"
echo "  export DYNAMODB_TABLE=marketbrewer-seo-pages"
echo ""
