/**
 * Location types for multi-location businesses
 */

export type LocationStatus =
  | "active"
  | "coming-soon"
  | "closed"
  | "temporarily-closed";

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
  comingSoonCount: number;
}

export interface LocationStats {
  total: number;
  active: number;
  comingSoon: number;
  byState: Record<string, number>;
  byCountry: Record<string, number>;
}
