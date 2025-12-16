/**
 * Jobs API functions for dashboard
 */

import apiClient from './client';
import type { GenerationJob, JobWithCounts, PageType } from '@marketbrewer/shared';

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
