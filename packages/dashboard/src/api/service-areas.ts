/**
 * Service areas API for dashboard
 */

import apiClient from "./client";
import type { ServiceArea } from "@marketbrewer/shared";

export interface ServiceAreasListResponse {
  service_areas: ServiceArea[];
}

export interface ServiceAreaResponse {
  service_area: ServiceArea;
}

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

export async function createServiceArea(
  businessId: string,
  data: {
    city: string;
    state: string;
    county?: string | null;
    priority?: number;
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

export async function updateServiceArea(
  businessId: string,
  areaId: string,
  data: Partial<{
    city: string;
    state: string;
    county: string | null;
    priority: number;
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
