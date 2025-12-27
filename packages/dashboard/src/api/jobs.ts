/**
 * Jobs API functions for dashboard
 */

import apiClient from './client';
import type { GenerationJob, JobWithCounts, PageType, JobPage } from '@marketbrewer/shared';

export interface CreateJobResponse {
  job: GenerationJob;
  total_pages_created: number;
}

export interface JobStatusResponse {
  job: JobWithCounts;
}

export interface JobsListResponse {
  jobs: GenerationJob[];
}

export interface PreviewPage {
  keyword_slug: string | null;
  keyword_text: string | null;
  keyword_language: 'en' | 'es';
  service_area_slug: string;
  service_area_city: string;
  service_area_state: string;
  url_path: string;
}

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
 * Create a new generation job
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
 * Get job status with page counts
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
 * List all jobs for a business
 */
export async function getJobs(businessId: string): Promise<JobsListResponse> {
  const response = await apiClient.get<JobsListResponse>(
    `/api/businesses/${businessId}/jobs`
  );
  return response.data;
}

/**
 * Preview pages that would be created (dry run)
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
 * Get pages for a job with filtering and pagination
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
