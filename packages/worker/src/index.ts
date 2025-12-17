/**
 * MarketBrewer SEO Platform - Worker
 *
 * Job processor for content generation using Ollama
 */

import "dotenv/config";
import { createApiClient } from "./api-client";
import { Worker } from "./worker";
import os from "os";

// Parse command line arguments
function parseArgs(): { jobId?: string; workerId?: string } {
  const args: { jobId?: string; workerId?: string } = {};

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];

    if (arg === "--job-id" && process.argv[i + 1]) {
      args.jobId = process.argv[++i];
    } else if (arg === "--worker-id" && process.argv[i + 1]) {
      args.workerId = process.argv[++i];
    } else if (arg.startsWith("--job-id=")) {
      args.jobId = arg.split("=")[1];
    } else if (arg.startsWith("--worker-id=")) {
      args.workerId = arg.split("=")[1];
    }
  }

  return args;
}

/**
 * Validate Ollama connectivity and model availability at startup (P0 fix)
 */
async function validateOllamaConnection(): Promise<void> {
  const ollamaUrl = process.env.OLLAMA_URL;
  const ollamaModel = process.env.OLLAMA_MODEL;

  if (!ollamaUrl) {
    throw new Error("OLLAMA_URL environment variable is required");
  }

  if (!ollamaModel) {
    throw new Error("OLLAMA_MODEL environment variable is required");
  }

  console.log("🔍 Validating Ollama connection...");
  console.log(`   URL: ${ollamaUrl}`);
  console.log(`   Model: ${ollamaModel}`);

  try {
    // Check Ollama is running
    const response = await fetch(`${ollamaUrl}/api/tags`);

    if (!response.ok) {
      throw new Error(
        `Ollama returned HTTP ${response.status}: ${response.statusText}`
      );
    }

    const data = (await response.json()) as {
      models?: Array<{ name: string }>;
    };
    const availableModels = data.models || [];

    console.log(
      `   ✓ Ollama connected. Available models: ${availableModels.length}`
    );

    // Verify the requested model is available
    const modelExists = availableModels.some(
      (m) => m.name === ollamaModel || m.name.startsWith(`${ollamaModel}:`)
    );

    if (!modelExists) {
      console.error(`   ✗ Model "${ollamaModel}" not found`);
      console.error(
        `   Available models: ${availableModels.map((m) => m.name).join(", ")}`
      );
      console.error(
        `\n   To install the model, run: ollama pull ${ollamaModel}`
      );
      throw new Error(`Model ${ollamaModel} not available in Ollama`);
    }

    console.log(`   ✓ Model "${ollamaModel}" is available`);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("fetch")) {
        console.error(`   ✗ Cannot connect to Ollama at ${ollamaUrl}`);
        console.error(`   Make sure Ollama is running: ollama serve`);
      }
      throw error;
    }
    throw new Error(`Ollama validation failed: ${String(error)}`);
  }
}

async function main(): Promise<void> {
  const args = parseArgs();

  // Get job ID from args or environment
  const jobId = args.jobId || process.env.JOB_ID;
  if (!jobId) {
    console.error("Error: Job ID is required");
    console.error(
      "Usage: npm run start -- --job-id <job-id> [--worker-id <worker-id>]"
    );
    console.error("Or set JOB_ID environment variable");
    process.exit(1);
  }

  // Generate worker ID if not provided
  const workerId =
    args.workerId ||
    process.env.WORKER_ID ||
    `worker-${os.hostname()}-${process.pid}`;

  console.log("🚀 Starting MarketBrewer Worker");
  console.log(`   Worker ID: ${workerId}`);
  console.log(`   Job ID: ${jobId}`);
  console.log(`   API URL: ${process.env.API_URL}`);

  // Validate Ollama connection before starting (P0 fix)
  await validateOllamaConnection();

  // Create API client
  const apiClient = createApiClient();

  // Create and start worker
  const worker = new Worker(apiClient, {
    workerId,
    jobId,
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || "5000", 10),
    maxAttempts: parseInt(process.env.MAX_ATTEMPTS || "3", 10),
    backoffMs: parseInt(process.env.BACKOFF_MS || "5000", 10),
  });

  // Handle graceful shutdown
  const shutdown = (): void => {
    console.log("\n👋 Received shutdown signal");
    worker.stop();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    await worker.start();
  } catch (error) {
    console.error("Worker failed:", error);
    process.exit(1);
  }
}

main();
