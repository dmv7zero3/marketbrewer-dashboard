/**
 * Worker main loop for processing generation jobs
 */

import { ApiClient, CompletePageRequest } from "./api-client";
import { OllamaClient } from "./ollama/client";
import type { JobPage } from "@marketbrewer/shared";

export interface WorkerConfig {
  workerId: string;
  jobId: string;
  pollIntervalMs: number;
  maxAttempts: number;
  backoffMs: number;
}

const DEFAULT_CONFIG: Partial<WorkerConfig> = {
  pollIntervalMs: 5000, // 5 seconds between polls
  maxAttempts: 3,
  backoffMs: 5000, // 5 seconds backoff on failure
};

export class Worker {
  private config: WorkerConfig;
  private apiClient: ApiClient;
  private ollamaClient: OllamaClient;
  private isRunning: boolean = false;
  private currentPage: JobPage | null = null;

  constructor(
    apiClient: ApiClient,
    config: Partial<WorkerConfig> & Pick<WorkerConfig, "workerId" | "jobId">
  ) {
    this.apiClient = apiClient;
    this.ollamaClient = new OllamaClient();
    this.config = { ...DEFAULT_CONFIG, ...config } as WorkerConfig;
  }

  /**
   * Start the worker loop
   */
  async start(): Promise<void> {
    console.log(`🔧 Worker ${this.config.workerId} starting...`);
    console.log(`   Job ID: ${this.config.jobId}`);
    console.log(`   Poll interval: ${this.config.pollIntervalMs}ms`);

    // Health check
    const healthy = await this.apiClient.healthCheck();
    if (!healthy) {
      throw new Error("API server is not healthy");
    }
    console.log("✅ API server healthy");

    this.isRunning = true;

    while (this.isRunning) {
      try {
        await this.processNextPage();
      } catch (error) {
        console.error("Error in worker loop:", error);
        await this.sleep(this.config.backoffMs);
      }

      // Wait before next poll
      await this.sleep(this.config.pollIntervalMs);
    }

    console.log(`🛑 Worker ${this.config.workerId} stopped`);
  }

  /**
   * Stop the worker gracefully
   */
  stop(): void {
    console.log(`Stopping worker ${this.config.workerId}...`);
    this.isRunning = false;
  }

  /**
   * Process a single page
   */
  private async processNextPage(): Promise<void> {
    // Try to claim a page
    const page = await this.apiClient.claimPage(
      this.config.jobId,
      this.config.workerId
    );

    if (!page) {
      console.log("No pages available to claim");
      return;
    }

    this.currentPage = page;
    console.log(`📄 Claimed page: ${page.url_path}`);

    const startTime = Date.now();

    try {
      // Generate content (placeholder for now)
      const content = await this.generateContent(page);
      const durationMs = Date.now() - startTime;

      // Mark as completed
      const completeData: CompletePageRequest = {
        status: "completed",
        content: JSON.stringify(content),
        section_count: content.sections?.length || 3,
        model_name: process.env.OLLAMA_MODEL || "llama3.2:latest",
        prompt_version: "v1",
        generation_duration_ms: durationMs,
        word_count: this.countWords(content.body || ""),
      };

      await this.apiClient.completePage(
        this.config.jobId,
        page.id,
        completeData
      );
      console.log(`✅ Completed page: ${page.url_path} (${durationMs}ms)`);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      console.error(`❌ Failed page: ${page.url_path} - ${errorMessage}`);

      // Mark as failed
      await this.apiClient.completePage(this.config.jobId, page.id, {
        status: "failed",
        error_message: errorMessage,
      });
    }

    this.currentPage = null;
  }

  /**
   * Generate content for a page using Ollama
   */
  private async generateContent(page: JobPage): Promise<GeneratedContent> {
    const [city = "", ...stateParts] = page.service_area_slug.split("-");
    const state = stateParts.join("-").toUpperCase() || "US";
    const keyword = page.keyword_slug?.replace(/-/g, " ") || "services";

    const prompt = this.buildPrompt({
      business_name: "Nash Smashed",
      business_category: "Nashville Hot Chicken and Smash Burger Restaurant",
      city,
      state,
      keyword,
      url_path: page.url_path,
    });

    console.log(`🤖 Generating: ${keyword} in ${city}, ${state}`);

    try {
      const response = await this.ollamaClient.generate(prompt);
      return this.parseOllamaResponse(response);
    } catch (error) {
      throw new Error(
        `Generation failed: ${
          error instanceof Error ? error.message : "Unknown"
        }`
      );
    }
  }

  private buildPrompt(vars: {
    business_name: string;
    business_category: string;
    city: string;
    state: string;
    keyword: string;
    url_path: string;
  }): string {
    // Determine emphasis based on keyword (lead with chicken unless keyword mentions burgers)
    const lowerKw = vars.keyword.toLowerCase();
    const leadWithBurgers = /burger|burgers/.test(lowerKw);

    return `You are writing SEO-optimized content for ${
      vars.business_name
    }, a fast-casual ${vars.business_category}.

BRAND FACTS (always include):
- Nashville hot chicken is the signature item
- All menu items are halal certified
- Family-friendly atmosphere with craft mocktails
- Fast-casual dining: dine-in and takeout

LOCATION: ${vars.city}, ${vars.state}
KEYWORD: ${vars.keyword}
URL: ${vars.url_path}

Guidelines:
1. Naturally incorporate the keyword "${
      vars.keyword
    }" in title, H1, and 2-3 times in body.
2. ${
      leadWithBurgers
        ? "Lead with smashed burgers for burger-related keywords."
        : "Lead with Nashville hot chicken for food-related keywords."
    }
3. Mention halal certification prominently (important for ${vars.city}).
4. Reference specific local context for ${
      vars.city
    } (neighborhoods, landmarks, commute corridors) without fabricating facts.
5. Maintain a warm Southern hospitality tone.

Do NOT:
- Lead with burgers unless the keyword specifically mentions burgers.
- Use generic filler like "residents know" or "look no further".
- Invent hours, prices, or menu items not provided.

Output ONLY valid JSON with this structure:
{
  "title": "SEO title with keyword + location (max 60 chars)",
  "meta_description": "Description with keyword + location (max 155 chars)",
  "h1": "Engaging H1 (different from title)",
  "body": "2-3 paragraphs (200-300 words) mentioning ${
    vars.city
  } naturally 3-4 times",
  "sections": [
    {"heading": "About ${vars.keyword} in ${
      vars.city
    }", "content": "1-2 paragraphs"},
    {"heading": "Why Choose ${
      vars.business_name
    }", "content": "1-2 paragraphs"},
    {"heading": "Halal & Family-Friendly", "content": "Note halal certification and family atmosphere"}
  ],
  "cta": {"text": "Get Started", "url": "/contact"}
}`;
  }

  private parseOllamaResponse(response: string): GeneratedContent {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");

      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.title || !parsed.h1 || !parsed.body) {
        throw new Error("Missing required fields");
      }

      return {
        title: parsed.title,
        meta_description: parsed.meta_description || parsed.title,
        h1: parsed.h1,
        body: parsed.body,
        sections: parsed.sections || [],
        cta: parsed.cta || { text: "Contact Us", url: "/contact" },
      };
    } catch (error) {
      console.error("Parse failed, using fallback:", error);
      return this.createFallbackContent(response);
    }
  }

  private createFallbackContent(raw: string): GeneratedContent {
    const lines = raw.split("\n").filter((l) => l.trim());
    return {
      title: lines[0]?.substring(0, 60) || "Local Services",
      meta_description: lines[0]?.substring(0, 155) || "Professional service",
      h1: lines[0] || "Welcome",
      body: raw.substring(0, 500),
      sections: [
        { heading: "About Us", content: raw.substring(0, 300) },
        { heading: "Why Choose Us", content: "Exceptional service" },
        { heading: "Contact", content: "Get in touch today" },
      ],
      cta: { text: "Get Started", url: "/contact" },
    };
  }

  /**
   * Count words in a string
   */
  private countWords(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

interface GeneratedContent {
  title: string;
  meta_description: string;
  h1: string;
  body: string;
  sections: Array<{
    heading: string;
    content: string;
  }>;
  cta: {
    text: string;
    url: string;
  };
}
