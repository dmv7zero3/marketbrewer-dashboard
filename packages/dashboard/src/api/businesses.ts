/**
 * Businesses API functions for dashboard
 */

import apiClient from "./client";
import type {
  Business,
  Questionnaire,
  QuestionnaireDataStructure,
} from "@marketbrewer/shared";

/** List response for businesses. */
export interface BusinessesListResponse {
  businesses: Business[];
}

/** Single business response wrapper. */
export interface BusinessResponse {
  business: Business;
}

/** Questionnaire response wrapper. */
export interface QuestionnaireResponse {
  questionnaire: Questionnaire & { data: Record<string, unknown> };
}

/** List all businesses visible to the dashboard. */
export async function getBusinesses(): Promise<BusinessesListResponse> {
  const response = await apiClient.get<BusinessesListResponse>(
    "/api/businesses"
  );
  return response.data;
}

/**
 * Fetch a single business by id.
 * @param businessId - Business identifier.
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
 * Create a new business.
 * @param data - Business attributes to create.
 */
export async function createBusiness(data: {
  name: string;
  industry: string;
  industry_type?: string;
  website?: string;
  phone?: string;
  email?: string;
  gbp_url?: string;
}): Promise<BusinessResponse> {
  const response = await apiClient.post<BusinessResponse>(
    "/api/businesses",
    data
  );
  return response.data;
}

/**
 * Fetch questionnaire data for a business.
 * @param businessId - Business identifier.
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
 * Update an existing business.
 * @param businessId - Business identifier.
 * @param data - Partial business fields to update.
 */
export async function updateBusiness(
  businessId: string,
  data: Partial<
    Pick<
      Business,
      | "name"
      | "industry"
      | "industry_type"
      | "website"
      | "phone"
      | "email"
      | "gbp_url"
      | "primary_city"
      | "primary_state"
    >
  >
): Promise<BusinessResponse> {
  const response = await apiClient.put<BusinessResponse>(
    `/api/businesses/${businessId}`,
    data
  );
  return response.data;
}

/**
 * Update questionnaire data for a business.
 * The server recalculates completeness.
 * @param businessId - Business identifier.
 * @param data - Questionnaire payload.
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
