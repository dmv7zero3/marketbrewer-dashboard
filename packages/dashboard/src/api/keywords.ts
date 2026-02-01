/**
 * Keywords API for dashboard
 */

import apiClient from "./client";
import type { Keyword } from "@marketbrewer/shared";

/** Response payload for listing keywords. */
export interface KeywordsListResponse {
  keywords: Keyword[];
}

/** Response payload for a single keyword. */
export interface KeywordResponse {
  keyword: Keyword;
}

/**
 * List keywords for a business.
 * @param businessId - Business identifier.
 */
export async function listKeywords(
  businessId: string
): Promise<KeywordsListResponse> {
  const res = await apiClient.get<KeywordsListResponse>(
    `/api/businesses/${businessId}/keywords`
  );
  return res.data;
}

/**
 * Create a new keyword for a business.
 * @param businessId - Business identifier.
 * @param data - Keyword payload.
 */
export async function createKeyword(
  businessId: string,
  data: {
    keyword: string;
    search_intent?: string | null;
    language?: "en" | "es";
  }
): Promise<KeywordResponse> {
  const res = await apiClient.post<KeywordResponse>(
    `/api/businesses/${businessId}/keywords`,
    data
  );
  return res.data;
}

/**
 * Update a keyword.
 * @param businessId - Business identifier.
 * @param keywordId - Keyword identifier.
 * @param data - Partial keyword updates.
 */
export async function updateKeyword(
  businessId: string,
  keywordId: string,
  data: Partial<{
    keyword: string;
    search_intent: string | null;
    language: "en" | "es";
  }>
): Promise<KeywordResponse> {
  const res = await apiClient.put<KeywordResponse>(
    `/api/businesses/${businessId}/keywords/${keywordId}`,
    data
  );
  return res.data;
}

/**
 * Delete a keyword.
 * @param businessId - Business identifier.
 * @param keywordId - Keyword identifier.
 */
export async function deleteKeyword(
  businessId: string,
  keywordId: string
): Promise<void> {
  await apiClient.delete<void>(
    `/api/businesses/${businessId}/keywords/${keywordId}`
  );
}
