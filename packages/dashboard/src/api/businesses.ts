/**
 * Businesses API functions for dashboard
 */

import apiClient from "./client";
import type {
  Business,
  Questionnaire,
  QuestionnaireDataStructure,
} from "@marketbrewer/shared";

export interface BusinessesListResponse {
  businesses: Business[];
}

export interface BusinessResponse {
  business: Business;
}

export interface QuestionnaireResponse {
  questionnaire: Questionnaire & { data: Record<string, unknown> };
}

/**
 * List all businesses
 */
export async function getBusinesses(): Promise<BusinessesListResponse> {
  const response = await apiClient.get<BusinessesListResponse>(
    "/api/businesses"
  );
  return response.data;
}

/**
 * Get single business by ID
 */
export async function getBusiness(
  businessId: string
): Promise<BusinessResponse> {
  const response = await apiClient.get<BusinessResponse>(
    `/api/businesses/${businessId}`
  );
  return response.data;
}

/**
 * Create a new business
 */
export async function createBusiness(data: {
  name: string;
  industry: string;
  website?: string;
  phone?: string;
  email?: string;
}): Promise<BusinessResponse> {
  const response = await apiClient.post<BusinessResponse>(
    "/api/businesses",
    data
  );
  return response.data;
}

/**
 * Get questionnaire for a business
 */
export async function getQuestionnaire(
  businessId: string
): Promise<QuestionnaireResponse> {
  const response = await apiClient.get<QuestionnaireResponse>(
    `/api/businesses/${businessId}/questionnaire`
  );
  return response.data;
}

/**
 * Update an existing business
 */
export async function updateBusiness(
  businessId: string,
  data: Partial<
    Pick<Business, "name" | "industry" | "website" | "phone" | "email">
  >
): Promise<BusinessResponse> {
  const response = await apiClient.put<BusinessResponse>(
    `/api/businesses/${businessId}`,
    data
  );
  return response.data;
}

/**
 * Update questionnaire data (server calculates completeness score)
 */
export async function updateQuestionnaire(
  businessId: string,
  data: QuestionnaireDataStructure | Record<string, unknown>
): Promise<QuestionnaireResponse> {
  const response = await apiClient.put<QuestionnaireResponse>(
    `/api/businesses/${businessId}/questionnaire`,
    { data }
  );
  return response.data;
}

// Re-export locations API
export * from "./locations";
