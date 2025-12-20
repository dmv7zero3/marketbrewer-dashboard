/**
 * Worker main loop for processing generation jobs
 */

import {
  ApiClient,
  CompletePageRequest,
  ClaimPageResponse,
  BusinessData,
  TemplateData,
} from "./api-client";
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
  private currentBackoffMs: number = 1000; // Start with 1 second

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
    // Try to claim a page (now returns full context with business/template)
    const claimResponse = await this.apiClient.claimPage(
      this.config.jobId,
      this.config.workerId
    );

    if (!claimResponse) {
      // No work available - apply exponential backoff
      this.currentBackoffMs = Math.min(this.currentBackoffMs * 2, 30000); // Max 30 seconds
      console.log(
        `No pages available - backing off ${this.currentBackoffMs}ms`
      );
      await this.sleep(this.currentBackoffMs);
      return;
    }

    // Reset backoff on successful claim
    this.currentBackoffMs = 1000;

    const { page, business, questionnaire, template } = claimResponse;
    this.currentPage = page;

    console.log(`📄 Claimed page: ${page.url_path}`);

    if (!template) {
      console.warn(`⚠️ No active template found for page type - using fallback`);
    } else {
      console.log(`📝 Using template: ${template.page_type} v${template.version}`);
    }

    const startTime = Date.now();
    const promptVersion = template ? `v${template.version}` : "fallback";

    try {
      // Generate content using template and business data
      const content = await this.generateContent(
        page,
        business,
        questionnaire,
        template
      );
      const durationMs = Date.now() - startTime;

      // Mark as completed
      const completeData: CompletePageRequest = {
        status: "completed",
        content: JSON.stringify(content),
        section_count: content.sections?.length || 3,
        model_name: process.env.OLLAMA_MODEL || "llama3.2:latest",
        prompt_version: promptVersion,
        generation_duration_ms: durationMs,
        word_count: this.countWords(content.body || ""),
      };

      await this.apiClient.completePage(this.config.jobId, page.id, completeData);
      console.log(`✅ Completed page: ${page.url_path} (${durationMs}ms)`);
    } catch (error) {
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
   * Generate content for a page using template and Ollama
   */
  private async generateContent(
    page: JobPage,
    business: BusinessData | null,
    questionnaire: Record<string, unknown>,
    template: TemplateData | null
  ): Promise<GeneratedContent> {
    // Build variables from all sources
    const variables = this.buildVariables(page, business, questionnaire);

    // Build prompt - use template if available, otherwise use fallback
    let prompt: string;
    if (template) {
      prompt = this.substituteVariables(template.template, variables);

      // Check for unsubstituted variables
      const remaining = prompt.match(/\{\{(\w+)\}\}/g);
      if (remaining?.length) {
        console.warn(
          `⚠️ Unsubstituted variables: ${remaining.join(", ")}`
        );
      }
    } else {
      // Fallback to hardcoded prompt
      prompt = this.buildFallbackPrompt(variables);
    }

    console.log(
      `🤖 Generating: ${variables.keyword} in ${variables.city}, ${variables.state}`
    );

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

  /**
   * Build all variables from page, business, and questionnaire data
   */
  private buildVariables(
    page: JobPage,
    business: BusinessData | null,
    questionnaire: Record<string, unknown>
  ): Record<string, string> {
    // Parse city and state from slug
    const slugParts = page.service_area_slug.split("-");
    const state = slugParts.pop()?.toUpperCase() || "US";
    const city = slugParts.join(" ").replace(/\b\w/g, (c) => c.toUpperCase());

    // Extract questionnaire fields safely
    const identity = (questionnaire.identity || {}) as Record<string, unknown>;
    const audience = (questionnaire.audience || {}) as Record<string, unknown>;
    const brand = (questionnaire.brand || {}) as Record<string, unknown>;
    const services = (questionnaire.services || {}) as Record<string, unknown>;

    // Calculate years experience
    const yearEstablished = String(identity.yearEstablished || "");
    let yearsExperience = "";
    if (yearEstablished && /^\d{4}$/.test(yearEstablished)) {
      yearsExperience = String(new Date().getFullYear() - parseInt(yearEstablished));
    }

    // Get primary service
    const offerings = (services.offerings || []) as Array<{
      name: string;
      isPrimary?: boolean;
      nameEs?: string;
    }>;
    const primaryService =
      offerings.find((s) => s.isPrimary)?.name || offerings[0]?.name || "";
    const primaryServiceEs =
      offerings.find((s) => s.isPrimary)?.nameEs || offerings[0]?.nameEs || "";

    // Language-specific variables
    const language = page.keyword_language === "es" ? "es" : "en";
    const outputLanguage = language === "es" ? "Spanish" : "English";

    return {
      // Core business
      business_name: business?.name || "",
      industry: business?.industry || "",
      industry_type: business?.industry_type || "",
      phone: business?.phone || "",
      email: business?.email || "",
      website: business?.website || "",
      gbp_url: business?.gbp_url || "",

      // Location
      city,
      state,
      primary_city: business?.primary_city || "",
      primary_state: business?.primary_state || "",

      // Keyword
      keyword: page.keyword_text || page.keyword_slug?.replace(/-/g, " ") || "",
      primary_keyword: page.keyword_text || "",
      url_path: page.url_path,

      // Questionnaire - Identity
      tagline: String(identity.tagline || ""),
      year_established: yearEstablished,
      years_experience: yearsExperience,
      owner_name: String(identity.ownerName || ""),

      // Questionnaire - Audience
      target_audience: String(audience.targetDescription || ""),
      languages: Array.isArray(audience.languages)
        ? (audience.languages as string[]).join(", ")
        : "",

      // Questionnaire - Brand
      voice_tone: String(brand.voiceTone || ""),
      tone: String(brand.voiceTone || ""),
      cta_text: String(brand.callToAction || ""),
      forbidden_terms: Array.isArray(brand.forbiddenTerms)
        ? (brand.forbiddenTerms as string[]).join(", ")
        : "",

      // Service type
      service_type: String(questionnaire.serviceType || ""),

      // Services
      primary_service: primaryService,
      primary_service_es: primaryServiceEs,
      services_list: offerings.map((s) => s.name).join(", "),

      // Language
      language,
      output_language: outputLanguage,

      // Word count target (from template, if available)
      word_count: "400",
    };
  }

  /**
   * Substitute {{variable}} placeholders in template
   */
  private substituteVariables(
    template: string,
    variables: Record<string, string>
  ): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = variables[key.toLowerCase()];
      return value !== undefined ? value : match;
    });
  }

  /**
   * Fallback prompt when no template is configured
   */
  private buildFallbackPrompt(vars: Record<string, string>): string {
    const language = vars.language === "es" ? "es" : "en";
    const outputLanguage = language === "es" ? "Spanish" : "English";
    const languageGuidance =
      language === "es"
        ? "Write everything in Spanish. Do not include any English except proper nouns (business name, place names)."
        : "Write everything in English.";

    return `You are writing SEO-optimized content for ${vars.business_name}, a ${vars.industry} business.

LOCATION: ${vars.city}, ${vars.state}
KEYWORD: ${vars.keyword}
URL: ${vars.url_path}
OUTPUT LANGUAGE: ${outputLanguage}

${vars.phone ? `PHONE: ${vars.phone}` : ""}
${vars.tagline ? `TAGLINE: ${vars.tagline}` : ""}
${vars.years_experience ? `YEARS IN BUSINESS: ${vars.years_experience}` : ""}

Language rule:
- ${languageGuidance}

Guidelines:
1. Naturally incorporate the keyword "${vars.keyword}" in title, H1, and 2-3 times in body.
2. ${vars.phone ? `Include the phone number ${vars.phone} once in the body.` : ""}
3. Reference specific local context for ${vars.city} without fabricating facts.
4. Maintain a ${vars.tone || "professional"} tone.

Do NOT:
- Use generic filler like "residents know" or "look no further".
- Invent facts not provided.

Output ONLY valid JSON with this structure:
{
  "title": "SEO title with keyword + location (max 60 chars)",
  "meta_description": "Description with keyword + location (max 155 chars)",
  "h1": "Engaging H1 (different from title)",
  "body": "2-3 paragraphs (200-300 words) mentioning ${vars.city} naturally 3-4 times",
  "sections": [
    {"heading": "About ${vars.keyword} in ${vars.city}", "content": "1-2 paragraphs"},
    {"heading": "Why Choose ${vars.business_name}", "content": "1-2 paragraphs"},
    {"heading": "Contact Us", "content": "How to get started"}
  ],
  "cta": {"text": "${vars.cta_text || "Get Started"}", "url": "/contact"}
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
