/**
 * API functions for locations management
 */

import axios from "axios";
import type { Location, LocationStats } from "@marketbrewer/shared";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3001/api";
const API_TOKEN = process.env.REACT_APP_API_TOKEN || "local-dev-token";

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    Authorization: `Bearer ${API_TOKEN}`,
    "Content-Type": "application/json",
  },
});

export async function getLocations(
  businessId: string,
  filters?: { status?: string; state?: string; country?: string }
): Promise<{ locations: Location[] }> {
  const { data } = await client.get(`/businesses/${businessId}/locations`, {
    params: filters,
  });
  return data;
}

export async function getLocationStats(
  businessId: string
): Promise<{ stats: LocationStats }> {
  const { data } = await client.get(
    `/businesses/${businessId}/locations/stats`
  );
  return data;
}

export async function getLocation(
  businessId: string,
  locationId: string
): Promise<{ location: Location }> {
  const { data } = await client.get(
    `/businesses/${businessId}/locations/${locationId}`
  );
  return data;
}

export async function createLocation(
  businessId: string,
  location: any
): Promise<{ location: Location }> {
  const { data } = await client.post(
    `/businesses/${businessId}/locations`,
    location
  );
  return data;
}

export async function updateLocation(
  businessId: string,
  locationId: string,
  updates: any
): Promise<{ location: Location }> {
  const { data } = await client.put(
    `/businesses/${businessId}/locations/${locationId}`,
    updates
  );
  return data;
}

export async function deleteLocation(
  businessId: string,
  locationId: string
): Promise<void> {
  await client.delete(`/businesses/${businessId}/locations/${locationId}`);
}

export async function bulkImportLocations(
  businessId: string,
  payload: { locations: any[]; auto_create_service_areas?: boolean }
): Promise<{
  created: number;
  failed: number;
  locations: Location[];
  errors: Array<{ index: number; error: string }>;
}> {
  const { data } = await client.post(
    `/businesses/${businessId}/locations/bulk-import`,
    payload
  );
  return data;
}
