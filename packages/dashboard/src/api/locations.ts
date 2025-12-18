/**
 * API functions for locations management
 */

import apiClient from "./client";
import type { Location, LocationStats } from "@marketbrewer/shared";

export async function getLocations(
  businessId: string,
  filters?: { status?: string; state?: string; country?: string }
): Promise<{ locations: Location[] }> {
  const { data } = await apiClient.get(
    `/api/businesses/seo/${businessId}/locations`,
    {
      params: filters,
    }
  );
  return data;
}

export async function getLocationStats(
  businessId: string
): Promise<{ stats: LocationStats }> {
  const { data } = await apiClient.get(
    `/api/businesses/seo/${businessId}/locations/stats`
  );
  return data;
}

export async function getLocation(
  businessId: string,
  locationId: string
): Promise<{ location: Location }> {
  const { data } = await apiClient.get(
    `/api/businesses/seo/${businessId}/locations/${locationId}`
  );
  return data;
}

export async function createLocation(
  businessId: string,
  location: Omit<Location, "id" | "business_id" | "created_at" | "updated_at">
): Promise<{ location: Location }> {
  const { data } = await apiClient.post(
    `/api/businesses/seo/${businessId}/locations`,
    location
  );
  return data;
}

export async function updateLocation(
  businessId: string,
  locationId: string,
  updates: Partial<
    Omit<Location, "id" | "business_id" | "created_at" | "updated_at">
  >
): Promise<{ location: Location }> {
  const { data } = await apiClient.put(
    `/api/businesses/seo/${businessId}/locations/${locationId}`,
    updates
  );
  return data;
}

export async function deleteLocation(
  businessId: string,
  locationId: string
): Promise<void> {
  await apiClient.delete(
    `/api/businesses/seo/${businessId}/locations/${locationId}`
  );
}

export async function bulkImportLocations(
  businessId: string,
  payload: {
    locations: Array<
      Omit<Location, "id" | "business_id" | "created_at" | "updated_at">
    >;
    auto_create_service_areas?: boolean;
  }
): Promise<{
  created: number;
  failed: number;
  locations: Location[];
  errors: Array<{ index: number; error: string }>;
}> {
  const { data } = await apiClient.post(
    `/api/businesses/seo/${businessId}/locations/bulk-import`,
    payload
  );
  return data;
}
