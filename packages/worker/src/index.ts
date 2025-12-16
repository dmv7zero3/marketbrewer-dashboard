/**
 * MarketBrewer SEO Platform - Worker
 * 
 * Job processor for content generation using Ollama
 */

import 'dotenv/config';
import { createApiClient } from './api-client';
import { Worker } from './worker';
import os from 'os';

// Parse command line arguments
function parseArgs(): { jobId?: string; workerId?: string } {
  const args: { jobId?: string; workerId?: string } = {};
  
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    
    if (arg === '--job-id' && process.argv[i + 1]) {
      args.jobId = process.argv[++i];
    } else if (arg === '--worker-id' && process.argv[i + 1]) {
      args.workerId = process.argv[++i];
    } else if (arg.startsWith('--job-id=')) {
      args.jobId = arg.split('=')[1];
    } else if (arg.startsWith('--worker-id=')) {
      args.workerId = arg.split('=')[1];
    }
  }
  
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs();

  // Get job ID from args or environment
  const jobId = args.jobId || process.env.JOB_ID;
  if (!jobId) {
    console.error('Error: Job ID is required');
    console.error('Usage: npm run start -- --job-id <job-id> [--worker-id <worker-id>]');
    console.error('Or set JOB_ID environment variable');
    process.exit(1);
  }

  // Generate worker ID if not provided
  const workerId = args.workerId || process.env.WORKER_ID || `worker-${os.hostname()}-${process.pid}`;

  console.log('🚀 Starting MarketBrewer Worker');
  console.log(`   Worker ID: ${workerId}`);
  console.log(`   Job ID: ${jobId}`);
  console.log(`   API URL: ${process.env.API_URL}`);

  // Create API client
  const apiClient = createApiClient();

  // Create and start worker
  const worker = new Worker(apiClient, {
    workerId,
    jobId,
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '5000', 10),
    maxAttempts: parseInt(process.env.MAX_ATTEMPTS || '3', 10),
    backoffMs: parseInt(process.env.BACKOFF_MS || '5000', 10),
  });

  // Handle graceful shutdown
  const shutdown = (): void => {
    console.log('\n👋 Received shutdown signal');
    worker.stop();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    await worker.start();
  } catch (error) {
    console.error('Worker failed:', error);
    process.exit(1);
  }
}

main();
