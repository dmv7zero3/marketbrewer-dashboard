/**
 * Prompts API for dashboard
 */

import apiClient from "./client";
import type { PromptTemplate } from "@marketbrewer/shared";

export interface PromptTemplatesListResponse {
  prompt_templates: PromptTemplate[];
}

export interface PromptTemplateResponse {
  prompt_template: PromptTemplate;
}

/**
 * List all prompt templates for a business
 */
export async function listPromptTemplates(
  businessId: string,
  options?: { signal?: AbortSignal }
): Promise<PromptTemplatesListResponse> {
  const res = await apiClient.get<PromptTemplatesListResponse>(
    `/api/businesses/${businessId}/prompts`,
    { signal: options?.signal }
  );
  return res.data;
}

/**
 * Get a single prompt template
 */
export async function getPromptTemplate(
  businessId: string,
  templateId: string,
  options?: { signal?: AbortSignal }
): Promise<PromptTemplateResponse> {
  const res = await apiClient.get<PromptTemplateResponse>(
    `/api/businesses/${businessId}/prompts/${templateId}`,
    { signal: options?.signal }
  );
  return res.data;
}

/**
 * Create a new prompt template
 */
export async function createPromptTemplate(
  businessId: string,
  data: {
    page_type:
      | "keyword-service-area"
      | "keyword-location"
      | "service-service-area"
      | "service-location"
      | "location-keyword"
      | "service-area";
    version: number;
    template: string;
    required_variables?: string[];
    optional_variables?: string[];
    word_count_target: number;
    is_active?: boolean;
  },
  options?: { signal?: AbortSignal }
): Promise<PromptTemplateResponse> {
  const res = await apiClient.post<PromptTemplateResponse>(
    `/api/businesses/${businessId}/prompts`,
    data,
    { signal: options?.signal }
  );
  return res.data;
}

/**
 * Update an existing prompt template
 */
export async function updatePromptTemplate(
  businessId: string,
  templateId: string,
  data: Partial<{
    template: string;
    required_variables: string[];
    optional_variables: string[];
    word_count_target: number;
    is_active: boolean;
  }>,
  options?: { signal?: AbortSignal }
): Promise<PromptTemplateResponse> {
  const res = await apiClient.put<PromptTemplateResponse>(
    `/api/businesses/${businessId}/prompts/${templateId}`,
    data,
    { signal: options?.signal }
  );
  return res.data;
}

/**
 * Delete a prompt template
 */
export async function deletePromptTemplate(
  businessId: string,
  templateId: string,
  options?: { signal?: AbortSignal }
): Promise<void> {
  await apiClient.delete<void>(
    `/api/businesses/${businessId}/prompts/${templateId}`,
    { signal: options?.signal }
  );
}
