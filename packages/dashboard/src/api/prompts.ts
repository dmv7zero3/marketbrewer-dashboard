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
  businessId: string
): Promise<PromptTemplatesListResponse> {
  const res = await apiClient.get<PromptTemplatesListResponse>(
    `/api/businesses/${businessId}/prompts`
  );
  return res.data;
}

/**
 * Get a single prompt template
 */
export async function getPromptTemplate(
  businessId: string,
  templateId: string
): Promise<PromptTemplateResponse> {
  const res = await apiClient.get<PromptTemplateResponse>(
    `/api/businesses/${businessId}/prompts/${templateId}`
  );
  return res.data;
}

/**
 * Create a new prompt template
 */
export async function createPromptTemplate(
  businessId: string,
  data: {
    page_type: "location-keyword" | "service-area";
    version: number;
    template: string;
    required_variables?: string[];
    optional_variables?: string[];
    word_count_target: number;
    is_active?: boolean;
  }
): Promise<PromptTemplateResponse> {
  const res = await apiClient.post<PromptTemplateResponse>(
    `/api/businesses/${businessId}/prompts`,
    data
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
    page_type: "location-keyword" | "service-area";
    version: number;
    template: string;
    required_variables: string[];
    optional_variables: string[];
    word_count_target: number;
    is_active: boolean;
  }>
): Promise<PromptTemplateResponse> {
  const res = await apiClient.put<PromptTemplateResponse>(
    `/api/businesses/${businessId}/prompts/${templateId}`,
    data
  );
  return res.data;
}

/**
 * Delete a prompt template
 */
export async function deletePromptTemplate(
  businessId: string,
  templateId: string
): Promise<void> {
  await apiClient.delete<void>(
    `/api/businesses/${businessId}/prompts/${templateId}`
  );
}
