/**
 * Service areas API for dashboard
 */

import apiClient from "./client";
import type { ServiceArea } from "@marketbrewer/shared";

/** Response payload for listing service areas. */
export interface ServiceAreasListResponse {
  service_areas: ServiceArea[];
}

/** Response payload for a single service area. */
export interface ServiceAreaResponse {
  service_area: ServiceArea;
}

/**
 * List service areas for a business.
 * @param businessId - Business identifier.
 * @param options - Optional request options (abort signal).
 */
export async function listServiceAreas(
  businessId: string,
  options?: { signal?: AbortSignal }
): Promise<ServiceAreasListResponse> {
  const res = await apiClient.get<ServiceAreasListResponse>(
    `/api/businesses/${businessId}/service-areas`,
    { signal: options?.signal }
  );
  return res.data;
}

/**
 * Create a new service area.
 * @param businessId - Business identifier.
 * @param data - Service area payload.
 * @param options - Optional request options (abort signal).
 */
export async function createServiceArea(
  businessId: string,
  data: {
    city: string;
    state: string;
    county?: string | null;
  },
  options?: { signal?: AbortSignal }
): Promise<ServiceAreaResponse> {
  const res = await apiClient.post<ServiceAreaResponse>(
    `/api/businesses/${businessId}/service-areas`,
    data,
    { signal: options?.signal }
  );
  return res.data;
}

/**
 * Update a service area.
 * @param businessId - Business identifier.
 * @param areaId - Service area identifier.
 * @param data - Partial service area updates.
 * @param options - Optional request options (abort signal).
 */
export async function updateServiceArea(
  businessId: string,
  areaId: string,
  data: Partial<{
    city: string;
    state: string;
    county: string | null;
  }>,
  options?: { signal?: AbortSignal }
): Promise<ServiceAreaResponse> {
  const res = await apiClient.put<ServiceAreaResponse>(
    `/api/businesses/${businessId}/service-areas/${areaId}`,
    data,
    { signal: options?.signal }
  );
  return res.data;
}

/**
 * Delete a service area.
 * @param businessId - Business identifier.
 * @param areaId - Service area identifier.
 * @param options - Optional request options (abort signal).
 */
export async function deleteServiceArea(
  businessId: string,
  areaId: string,
  options?: { signal?: AbortSignal }
): Promise<void> {
  await apiClient.delete<void>(
    `/api/businesses/${businessId}/service-areas/${areaId}`,
    { signal: options?.signal }
  );
}
