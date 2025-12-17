/**
 * Keywords API for dashboard
 */

import apiClient from "./client";
import type { Keyword } from "@marketbrewer/shared";

export interface KeywordsListResponse {
  keywords: Keyword[];
}

export interface KeywordResponse {
  keyword: Keyword;
}

export async function listKeywords(
  businessId: string
): Promise<KeywordsListResponse> {
  const res = await apiClient.get<KeywordsListResponse>(
    `/api/businesses/${businessId}/keywords`
  );
  return res.data;
}

export async function createKeyword(
  businessId: string,
  data: { keyword: string; search_intent?: string | null; priority?: number }
): Promise<KeywordResponse> {
  const res = await apiClient.post<KeywordResponse>(
    `/api/businesses/${businessId}/keywords`,
    data
  );
  return res.data;
}

export async function updateKeyword(
  businessId: string,
  keywordId: string,
  data: Partial<{
    keyword: string;
    search_intent: string | null;
    priority: number;
  }>
): Promise<KeywordResponse> {
  const res = await apiClient.put<KeywordResponse>(
    `/api/businesses/${businessId}/keywords/${keywordId}`,
    data
  );
  return res.data;
}

export async function deleteKeyword(
  businessId: string,
  keywordId: string
): Promise<void> {
  await apiClient.delete<void>(
    `/api/businesses/${businessId}/keywords/${keywordId}`
  );
}
