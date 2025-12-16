/**
 * API client for worker to communicate with server
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type { JobPage, GenerationJob } from '@marketbrewer/shared';

export interface ClaimPageResponse {
  page: JobPage;
}

export interface CompletePageRequest {
  status: 'completed' | 'failed';
  content?: string;
  error_message?: string;
  section_count?: number;
  model_name?: string;
  prompt_version?: string;
  generation_duration_ms?: number;
  word_count?: number;
}

export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

export class ApiClient {
  private client: AxiosInstance;

  constructor(baseUrl: string, apiToken: string) {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });
  }

  /**
   * Claim a page from the job queue
   */
  async claimPage(jobId: string, workerId: string): Promise<JobPage | null> {
    try {
      const response = await this.client.post<ClaimPageResponse>(
        `/api/jobs/${jobId}/claim`,
        { worker_id: workerId }
      );
      return response.data.page;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiError>;
        
        // 409 means no pages available - not an error
        if (axiosError.response?.status === 409) {
          const code = axiosError.response.data?.code;
          if (code === 'NO_PAGES') {
            return null;
          }
        }
        
        console.error('API Error:', axiosError.response?.data || axiosError.message);
      }
      throw error;
    }
  }

  /**
   * Mark a page as completed or failed
   */
  async completePage(
    jobId: string,
    pageId: string,
    data: CompletePageRequest
  ): Promise<JobPage> {
    const response = await this.client.put<{ page: JobPage }>(
      `/api/jobs/${jobId}/pages/${pageId}/complete`,
      data
    );
    return response.data.page;
  }

  /**
   * Get job status
   */
  async getJobStatus(businessId: string, jobId: string): Promise<GenerationJob> {
    const response = await this.client.get<{ job: GenerationJob }>(
      `/api/businesses/${businessId}/jobs/${jobId}`
    );
    return response.data.job;
  }

  /**
   * Send worker heartbeat
   */
  async heartbeat(workerId: string, currentPageId: string | null): Promise<void> {
    await this.client.post('/api/workers/heartbeat', {
      worker_id: workerId,
      current_page_id: currentPageId,
    });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data?.status === 'ok';
    } catch {
      return false;
    }
  }
}

/**
 * Create API client from environment variables
 */
export function createApiClient(): ApiClient {
  const baseUrl = process.env.API_URL;
  const apiToken = process.env.API_TOKEN;

  if (!baseUrl) {
    throw new Error('API_URL environment variable is required');
  }

  if (!apiToken) {
    throw new Error('API_TOKEN environment variable is required');
  }

  return new ApiClient(baseUrl, apiToken);
}
