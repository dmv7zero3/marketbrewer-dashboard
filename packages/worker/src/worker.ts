/**
 * Worker main loop for processing generation jobs
 */

import { ApiClient, CompletePageRequest } from './api-client';
import type { JobPage } from '@marketbrewer/shared';

export interface WorkerConfig {
  workerId: string;
  jobId: string;
  pollIntervalMs: number;
  maxAttempts: number;
  backoffMs: number;
}

const DEFAULT_CONFIG: Partial<WorkerConfig> = {
  pollIntervalMs: 5000,  // 5 seconds between polls
  maxAttempts: 3,
  backoffMs: 5000,       // 5 seconds backoff on failure
};

export class Worker {
  private config: WorkerConfig;
  private apiClient: ApiClient;
  private isRunning: boolean = false;
  private currentPage: JobPage | null = null;

  constructor(apiClient: ApiClient, config: Partial<WorkerConfig> & Pick<WorkerConfig, 'workerId' | 'jobId'>) {
    this.apiClient = apiClient;
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
      throw new Error('API server is not healthy');
    }
    console.log('✅ API server healthy');

    this.isRunning = true;

    while (this.isRunning) {
      try {
        await this.processNextPage();
      } catch (error) {
        console.error('Error in worker loop:', error);
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
    const page = await this.apiClient.claimPage(this.config.jobId, this.config.workerId);

    if (!page) {
      console.log('No pages available to claim');
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
        status: 'completed',
        content: JSON.stringify(content),
        section_count: content.sections?.length || 3,
        model_name: process.env.OLLAMA_MODEL || 'llama3.2:latest',
        prompt_version: 'v1',
        generation_duration_ms: durationMs,
        word_count: this.countWords(content.body || ''),
      };

      await this.apiClient.completePage(this.config.jobId, page.id, completeData);
      console.log(`✅ Completed page: ${page.url_path} (${durationMs}ms)`);

    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error(`❌ Failed page: ${page.url_path} - ${errorMessage}`);

      // Mark as failed
      await this.apiClient.completePage(this.config.jobId, page.id, {
        status: 'failed',
        error_message: errorMessage,
      });
    }

    this.currentPage = null;
  }

  /**
   * Generate content for a page
   * This is a placeholder - real implementation will call Ollama
   */
  private async generateContent(page: JobPage): Promise<GeneratedContent> {
    // TODO: Implement actual Ollama generation
    // For now, return placeholder content
    
    const city = page.service_area_slug.split('-')[0];
    const state = page.service_area_slug.split('-')[1]?.toUpperCase() || '';
    const keyword = page.keyword_slug?.replace(/-/g, ' ') || 'services';

    // Simulate generation time
    await this.sleep(1000 + Math.random() * 2000);

    return {
      title: `${keyword} in ${city}, ${state}`,
      meta_description: `Find the best ${keyword} in ${city}, ${state}. Professional services tailored to your needs.`,
      h1: `${keyword} in ${city}, ${state}`,
      body: `Looking for ${keyword} in ${city}, ${state}? We provide top-quality services to meet your needs. Contact us today to learn more about our offerings in the ${city} area.`,
      sections: [
        {
          heading: `About Our ${keyword}`,
          content: `Our team in ${city} is dedicated to providing exceptional ${keyword}. With years of experience serving the ${state} community, we understand what you need.`,
        },
        {
          heading: 'Why Choose Us',
          content: `We pride ourselves on delivering outstanding ${keyword} to ${city} residents. Our commitment to quality sets us apart from the competition.`,
        },
        {
          heading: 'Contact Us',
          content: `Ready to get started? Contact our ${city} team today to discuss your ${keyword} needs.`,
        },
      ],
      cta: {
        text: 'Get Started Today',
        url: '/contact',
      },
    };
  }

  /**
   * Count words in a string
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
