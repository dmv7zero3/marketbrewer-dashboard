/**
 * API functions for locations management
 */

import apiClient from "./client";
import type { Location, LocationStats } from "@marketbrewer/shared";

/**
 * List locations for a business.
 * @param businessId - Business identifier.
 * @param filters - Optional filtering for status/state/country.
 * @param options - Optional request options (abort signal).
 */
export async function getLocations(
  businessId: string,
  filters?: { status?: string; state?: string; country?: string },
  options?: { signal?: AbortSignal }
): Promise<{ locations: Location[] }> {
  const { data } = await apiClient.get(
    `/api/businesses/seo/${businessId}/locations`,
    {
      params: filters,
      signal: options?.signal,
    }
  );
  return data;
}

/**
 * Fetch location stats for a business.
 * @param businessId - Business identifier.
 * @param options - Optional request options (abort signal).
 */
export async function getLocationStats(
  businessId: string,
  options?: { signal?: AbortSignal }
): Promise<{ stats: LocationStats }> {
  const { data } = await apiClient.get(
    `/api/businesses/seo/${businessId}/locations/stats`,
    {
      signal: options?.signal,
    }
  );
  return data;
}

/**
 * Fetch a single location.
 * @param businessId - Business identifier.
 * @param locationId - Location identifier.
 */
export async function getLocation(
  businessId: string,
  locationId: string
): Promise<{ location: Location }> {
  const { data } = await apiClient.get(
    `/api/businesses/seo/${businessId}/locations/${locationId}`
  );
  return data;
}

/**
 * Create a new location.
 * @param businessId - Business identifier.
 * @param location - New location payload.
 */
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

/**
 * Update an existing location.
 * @param businessId - Business identifier.
 * @param locationId - Location identifier.
 * @param updates - Partial location updates.
 */
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

/**
 * Delete a location.
 * @param businessId - Business identifier.
 * @param locationId - Location identifier.
 */
export async function deleteLocation(
  businessId: string,
  locationId: string
): Promise<void> {
  await apiClient.delete(
    `/api/businesses/seo/${businessId}/locations/${locationId}`
  );
}

/**
 * Bulk import locations (optionally creating service areas).
 * @param businessId - Business identifier.
 * @param payload - Bulk import payload.
 */
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
