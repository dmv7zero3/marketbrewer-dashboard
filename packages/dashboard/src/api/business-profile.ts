/**
 * API functions for Business Profile V1 endpoints
 */

import apiClient from "./client";
import type {
  BusinessHours,
  BusinessLocation,
  BusinessSocialLink,
  DayOfWeek,
  LocationType,
  SocialPlatform,
} from "@marketbrewer/shared";

/** Response wrapper for business profile locations. */
export interface BusinessProfileLocationsResponse {
  locations: BusinessLocation[];
}

/** Response wrapper for a single business profile location. */
export interface BusinessProfileLocationResponse {
  location: BusinessLocation;
}

/** Response wrapper for business hours. */
export interface BusinessProfileHoursResponse {
  hours: BusinessHours[];
}

/** Response wrapper for business social links. */
export interface BusinessProfileSocialResponse {
  links: BusinessSocialLink[];
}

/**
 * List profile locations for a business.
 * @param businessId - Business identifier.
 */
export async function getProfileLocations(
  businessId: string
): Promise<BusinessProfileLocationsResponse> {
  const response = await apiClient.get<BusinessProfileLocationsResponse>(
    `/api/businesses/${businessId}/locations`
  );
  return response.data;
}

/**
 * Create a new profile location for a business.
 * @param businessId - Business identifier.
 * @param data - New location payload.
 */
export async function createProfileLocation(
  businessId: string,
  data: {
    location_type: LocationType;
    is_primary?: boolean;
    street_address?: string | null;
    city: string;
    state: string;
    postal_code?: string | null;
    country?: string;
  }
): Promise<BusinessProfileLocationResponse> {
  const response = await apiClient.post<BusinessProfileLocationResponse>(
    `/api/businesses/${businessId}/locations`,
    data
  );
  return response.data;
}

/**
 * Update a profile location.
 * @param businessId - Business identifier.
 * @param locationId - Location identifier.
 * @param updates - Partial location updates.
 */
export async function updateProfileLocation(
  businessId: string,
  locationId: string,
  updates: Partial<{
    location_type: LocationType;
    is_primary: boolean;
    street_address: string | null;
    city: string;
    state: string;
    postal_code: string | null;
    country: string;
  }>
): Promise<BusinessProfileLocationResponse> {
  const response = await apiClient.put<BusinessProfileLocationResponse>(
    `/api/businesses/${businessId}/locations/${locationId}`,
    updates
  );
  return response.data;
}

/**
 * Delete a profile location.
 * @param businessId - Business identifier.
 * @param locationId - Location identifier.
 */
export async function deleteProfileLocation(
  businessId: string,
  locationId: string
): Promise<void> {
  await apiClient.delete(
    `/api/businesses/${businessId}/locations/${locationId}`
  );
}

/**
 * Fetch business hours for a business.
 * @param businessId - Business identifier.
 */
export async function getBusinessHours(
  businessId: string
): Promise<BusinessProfileHoursResponse> {
  const response = await apiClient.get<BusinessProfileHoursResponse>(
    `/api/businesses/${businessId}/hours`
  );
  return response.data;
}

/**
 * Update business hours for a business.
 * @param businessId - Business identifier.
 * @param hours - Full list of day-of-week hours.
 */
export async function updateBusinessHours(
  businessId: string,
  hours: Array<{
    day_of_week: DayOfWeek;
    opens: string | null;
    closes: string | null;
    is_closed: boolean;
  }>
): Promise<BusinessProfileHoursResponse> {
  const response = await apiClient.put<BusinessProfileHoursResponse>(
    `/api/businesses/${businessId}/hours`,
    { hours }
  );
  return response.data;
}

/**
 * Fetch business social links for a business.
 * @param businessId - Business identifier.
 */
export async function getBusinessSocialLinks(
  businessId: string
): Promise<BusinessProfileSocialResponse> {
  const response = await apiClient.get<BusinessProfileSocialResponse>(
    `/api/businesses/${businessId}/social`
  );
  return response.data;
}

export async function upsertBusinessSocialLink(
  businessId: string,
  data: { platform: SocialPlatform; url: string }
): Promise<BusinessProfileSocialResponse> {
  const response = await apiClient.post<BusinessProfileSocialResponse>(
    `/api/businesses/${businessId}/social`,
    data
  );
  return response.data;
}

export async function deleteBusinessSocialLink(
  businessId: string,
  platform: SocialPlatform
): Promise<void> {
  await apiClient.delete(`/api/businesses/${businessId}/social/${platform}`);
}
