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

export interface BusinessProfileLocationsResponse {
  locations: BusinessLocation[];
}

export interface BusinessProfileLocationResponse {
  location: BusinessLocation;
}

export interface BusinessProfileHoursResponse {
  hours: BusinessHours[];
}

export interface BusinessProfileSocialResponse {
  links: BusinessSocialLink[];
}

export async function getProfileLocations(
  businessId: string
): Promise<BusinessProfileLocationsResponse> {
  const response = await apiClient.get<BusinessProfileLocationsResponse>(
    `/api/businesses/${businessId}/locations`
  );
  return response.data;
}

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

export async function deleteProfileLocation(
  businessId: string,
  locationId: string
): Promise<void> {
  await apiClient.delete(
    `/api/businesses/${businessId}/locations/${locationId}`
  );
}

export async function getBusinessHours(
  businessId: string
): Promise<BusinessProfileHoursResponse> {
  const response = await apiClient.get<BusinessProfileHoursResponse>(
    `/api/businesses/${businessId}/hours`
  );
  return response.data;
}

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
