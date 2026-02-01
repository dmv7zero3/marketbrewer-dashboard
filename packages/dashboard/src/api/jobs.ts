/**
 * Jobs API functions for dashboard
 */

import apiClient from './client';
import type { GenerationJob, JobWithCounts, PageType, JobPage } from '@marketbrewer/shared';

/** Response payload for creating a generation job. */
export interface CreateJobResponse {
  job: GenerationJob;
  total_pages_created: number;
}

/** Response payload for job status lookup. */
export interface JobStatusResponse {
  job: JobWithCounts;
}

/** Response payload for listing jobs. */
export interface JobsListResponse {
  jobs: GenerationJob[];
}

/** Preview metadata for a single page before generation. */
export interface PreviewPage {
  keyword_slug?: string | null;
  keyword_text?: string | null;
  keyword_language?: 'en' | 'es';
  service_name?: string | null;
  service_slug?: string | null;
  service_name_es?: string | null;
  service_area_slug: string;
  service_area_city: string;
  service_area_state: string;
  url_path: string;
}

/** Response payload for previewing pages. */
export interface PreviewPagesResponse {
  pages: PreviewPage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    total_pages: number;
    unique_keywords: number;
    unique_service_areas: number;
    unique_locations?: number;
    unique_services?: number;
    by_language: {
      en: number;
      es: number;
    };
  };
  business: {
    id: string;
    name: string;
  };
  page_type: PageType;
}

/** Response payload for listing pages for a job. */
export interface JobPagesResponse {
  pages: JobPage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  counts: {
    queued: number;
    processing: number;
    completed: number;
    failed: number;
  };
}

/** Query filters for job pages. */
export interface JobPagesFilters {
  status?: 'queued' | 'processing' | 'completed' | 'failed';
  language?: 'en' | 'es';
  search?: string;
  page?: number;
  limit?: number;
  sort?: 'created_at' | 'keyword_text' | 'url_path' | 'status';
  order?: 'asc' | 'desc';
}

/**
 * Create a new generation job for a business.
 * @param businessId - Business identifier.
 * @param pageType - Page type to generate.
 */
export async function createJob(
  businessId: string,
  pageType: PageType
): Promise<CreateJobResponse> {
  const response = await apiClient.post<CreateJobResponse>(
    `/api/businesses/${businessId}/generate`,
    { page_type: pageType }
  );
  return response.data;
}

/**
 * Fetch job status with page counts.
 * @param businessId - Business identifier.
 * @param jobId - Job identifier.
 */
export async function getJobStatus(
  businessId: string,
  jobId: string
): Promise<JobStatusResponse> {
  const response = await apiClient.get<JobStatusResponse>(
    `/api/businesses/${businessId}/jobs/${jobId}`
  );
  return response.data;
}

/**
 * List all jobs for a business.
 * @param businessId - Business identifier.
 */
export async function getJobs(businessId: string): Promise<JobsListResponse> {
  const response = await apiClient.get<JobsListResponse>(
    `/api/businesses/${businessId}/jobs`
  );
  return response.data;
}

/**
 * Preview pages that would be created (dry run).
 * @param businessId - Business identifier.
 * @param pageType - Page type to preview.
 * @param filters - Optional filters and pagination.
 * @param signal - Abort signal for cancellation.
 */
export async function previewPages(
  businessId: string,
  pageType: PageType,
  filters?: { search?: string; language?: 'en' | 'es'; page?: number; limit?: number },
  signal?: AbortSignal
): Promise<PreviewPagesResponse> {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.language) params.set('language', filters.language);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));

  const queryString = params.toString();
  const url = `/api/businesses/${businessId}/generate/preview${queryString ? `?${queryString}` : ''}`;

  const response = await apiClient.post<PreviewPagesResponse>(
    url,
    { page_type: pageType },
    { signal }
  );
  return response.data;
}

/**
 * Get pages for a job with filtering and pagination.
 * @param jobId - Job identifier.
 * @param filters - Optional filters and sorting options.
 * @param signal - Abort signal for cancellation.
 */
export async function getJobPages(
  jobId: string,
  filters?: JobPagesFilters,
  signal?: AbortSignal
): Promise<JobPagesResponse> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.language) params.set('language', filters.language);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));
  if (filters?.sort) params.set('sort', filters.sort);
  if (filters?.order) params.set('order', filters.order);

  const queryString = params.toString();
  const url = `/api/jobs/${jobId}/pages${queryString ? `?${queryString}` : ''}`;

  const response = await apiClient.get<JobPagesResponse>(url, { signal });
  return response.data;
}
