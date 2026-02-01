/**
 * Location types for multi-location businesses
 *
 * IMPORTANT: Locations = Physical store locations (where the business actually operates)
 * This is different from Service Areas (nearby cities targeted for SEO).
 *
 * Simplified status model (V1.1):
 * - active: Location is open and operational
 * - upcoming: Location is planned/coming soon
 *
 * Note: Changed from 4-status model (active, coming-soon, closed, temporarily-closed)
 * to 2-status model to match MarketBrewer client requirements.
 */

export type LocationStatus = "active" | "upcoming";

export interface Location {
  id: string;
  business_id: string;

  // Required core fields
  name: string;
  city: string;
  state: string;
  country: string;
  status: LocationStatus;

  // Optional display and address
  display_name?: string | null;
  address?: string | null;
  zip_code?: string | null;
  full_address?: string | null;

  // Contact
  phone?: string | null;
  email?: string | null;

  // Integration
  google_maps_url?: string | null;
  store_id?: string | null;
  order_link?: string | null;

  // Metadata
  is_headquarters?: boolean;
  note?: string | null;
  priority?: number;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface LocationGroup {
  region: string; // "Virginia", "Maryland", "Washington D.C.", "New York", etc.
  country: string;
  locations: Location[];
  activeCount: number;
  upcomingCount: number;
}

export interface LocationStats {
  total: number;
  active: number;
  upcoming: number;
  byState: Record<string, number>;
  byCountry: Record<string, number>;
}

// Helper functions for location display

export function getLocationDisplayValue(location: Location): string {
  const baseValue =
    location.country === "USA"
      ? `${location.city}, ${location.state}`
      : location.country === "UK"
      ? `${location.city}, ${location.state}`
      : `${location.city}, ${location.country}`;

  return location.status === "upcoming"
    ? `${baseValue} (Coming Soon)`
    : baseValue;
}

export function getLocationOptionText(location: Location): string {
  const label = location.display_name || getLocationDisplayValue(location);
  if (location.status === "upcoming") {
    return `${label} (Coming Soon)`;
  }
  return label;
}

export function getLocationsByStatus(
  locations: Location[],
  status: LocationStatus
): Location[] {
  return locations.filter((location) => location.status === status);
}

export function getLocationsByState(
  locations: Location[],
  state: string
): Location[] {
  return locations.filter((location) => location.state === state);
}

export function getLocationsByCountry(
  locations: Location[],
  country: string
): Location[] {
  return locations.filter((location) => location.country === country);
}

export function getActiveLocations(locations: Location[]): Location[] {
  return getLocationsByStatus(locations, "active");
}

export function getUpcomingLocations(locations: Location[]): Location[] {
  return getLocationsByStatus(locations, "upcoming");
}

export function getLocationGroups(
  locations: Location[]
): Record<string, Location[]> {
  // Get all locations except headquarters
  const allLocations = locations.filter(
    (location) => !location.is_headquarters
  );

  const groups: Record<string, Location[]> = {};

  allLocations.forEach((location) => {
    let groupKey = "";

    // Group by country/region
    if (location.country === "USA") {
      if (location.state === "VA") {
        groupKey = "Virginia";
      } else if (location.state === "MD") {
        groupKey = "Maryland";
      } else if (location.state === "DC") {
        groupKey = "Washington D.C.";
      } else {
        groupKey = `${location.state}, USA`;
      }
    } else if (location.country === "UK") {
      groupKey = "United Kingdom";
    } else {
      groupKey = location.country;
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(location);
  });

  return groups;
}
