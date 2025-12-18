# Multi-Location Business Management - Implementation Guide

## Overview

This document outlines the multi-location system designed for franchise and multi-location businesses like Nash & Smashed, based on their real-world 28+ location operation across VA, MD, DC, SC, and NY.

## Location Status Model (V1.1)

**Simplified 2-status model:**

| Status     | Description                      | UI Badge |
| ---------- | -------------------------------- | -------- |
| `active`   | Location is open and operational | Green    |
| `upcoming` | Location is planned/coming soon  | Blue     |

> **Migration Note:** Previous 4-status model (`active`, `coming-soon`, `closed`, `temporarily-closed`) has been simplified. Closed locations are archived to `locations_archive` table.

## Database Schema

### `locations` Table

**Required Fields:**

- `id` - Unique identifier
- `business_id` - Link to parent business
- `name` - Short location name (e.g., "Manassas", "Silver Spring")
- `city` - City name
- `state` - State/region code
- `country` - Country (default: "USA")
- `status` - Operational status: `active` or `upcoming`

**Optional Fields:**

- `display_name` - Auto-generated: "Nash and Smashed (Manassas)"
- `address` - Street address
- `zip_code` - Postal code
- `full_address` - Auto-generated from components
- `phone` - Location-specific phone
- `email` - Location contact email
- `google_maps_url` - Maps integration link
- `store_id` - Third-party ordering system ID
- `order_link` - Online ordering URL
- `is_headquarters` - Headquarters flag
- `note` - Special notes (e.g., "Inside Walmart Super-center")
- `priority` - Display ordering

### `locations_archive` Table

Stores closed/removed locations for historical reference:

- Same fields as `locations` table
- `original_status` - Status before archiving
- `archived_at` - When location was archived
- `archive_reason` - Why location was archived

### Service Area Integration

**Key Distinction:**

- **Locations** = Cities where physical stores exist
- **Service Areas** = Nearby/surrounding cities you want to target for SEO (NOT duplicates of store cities)

**Relationship:**

- Service areas can optionally reference a nearby location via `location_id`
- Service areas are additional cities around locations, expanding SEO reach
- Example: Manassas store location → service areas might include Centreville, Bull Run, Gainesville
- When a location is archived, its linked service areas remain but are unlinked

## API Endpoints

```
GET    /api/businesses/:id/locations                    # List with filters
GET    /api/businesses/:id/locations/stats              # Statistics
GET    /api/businesses/:id/locations/:locationId        # Get single
POST   /api/businesses/:id/locations                    # Create
PUT    /api/businesses/:id/locations/:locationId        # Update
DELETE /api/businesses/:id/locations/:locationId        # Delete (archives)
POST   /api/businesses/:id/locations/bulk-import        # Bulk import

# Archive endpoints
GET    /api/businesses/:id/locations/archive            # List archived
POST   /api/businesses/:id/locations/:id/restore        # Restore from archive
```

## UI/UX Features

### List View

- **Grouping**: Locations grouped by state/region
- **Filters**: Status (active/upcoming) and state dropdown
- **Stats Cards**: Total, Active, Upcoming, States count
- **Status Badges**: Color-coded (green=active, blue=upcoming)
- **Quick Actions**: Map link, Order link, Edit, Delete (archive)

### Form Experience

- **Smart Defaults**:

  - `display_name` auto-generated from name + city
  - `full_address` auto-generated from components
  - `country` defaults to "USA"
  - `status` defaults to "active"

- **Conditional Validation**:
  - Upcoming locations: only require name, city, state, country
  - Active locations: encourage but don't require address, phone, contact

### Bulk Import

- CSV/JSON upload support
- Option to auto-create service areas
- Error reporting per row
- Partial success handling (e.g., 25 created, 2 failed)

**CSV Format:**

```csv
name,city,state,country,status,address,zip_code,phone,email,note
Manassas,Manassas,VA,USA,active,12853 Galveston Ct,20112,571-762-2677,kaziarif393@gmail.com,
Alexandria,Alexandria,VA,USA,upcoming,7609 Richmond Hwy,22306,,Farhan-mushtaq@hotmail.com,
```

## TypeScript Types

```typescript
type LocationStatus = "active" | "upcoming";

interface Location {
  id: string;
  business_id: string;

  // Required
  name: string;
  city: string;
  state: string;
  country: string;
  status: LocationStatus;

  // Optional
  display_name?: string | null;
  address?: string | null;
  zip_code?: string | null;
  full_address?: string | null;
  phone?: string | null;
  email?: string | null;
  google_maps_url?: string | null;
  store_id?: string | null;
  order_link?: string | null;
  is_headquarters?: boolean;
  note?: string | null;
  priority?: number;

  // Timestamps
  created_at: string;
  updated_at: string;
}
```

## Helper Functions

```typescript
import {
  getLocationDisplayValue,
  getLocationOptionText,
  getLocationsByStatus,
  getActiveLocations,
  getUpcomingLocations,
  getLocationGroups,
} from "@marketbrewer/shared";

// Display value with status indicator
getLocationDisplayValue(location); // "Manassas, VA" or "Alexandria, VA (Coming Soon)"

// For dropdowns
getLocationOptionText(location); // "Nash and Smashed (Manassas)" or with "(Coming Soon)"

// Filter by status
const active = getActiveLocations(locations);
const upcoming = getUpcomingLocations(locations);

// Group by region
const groups = getLocationGroups(locations);
// { "Virginia": [...], "Maryland": [...], "Washington D.C.": [...] }
```

## Location Status Workflow

Simple status transitions:

```
upcoming → active (location opens)
active → (archive) (location closes permanently)
```

**UI Features:**

- Quick status toggle in list view
- Confirmation for archiving
- View archived locations in separate tab

## Content Generation Integration

**How it works:**

1. **Service areas** drive what cities get SEO pages generated
2. **Locations** provide real business details for those pages

**Example Flow:**

```typescript
// Service area "Centreville, VA" (NOT a store location, but nearby one)
const serviceArea = getServiceArea("centreville-va");
const nearestLocation = getLocation(serviceArea.location_id); // e.g., Manassas store

// Generate page for Centreville targeting customers there,
// but showing info about the nearest Manassas location:
const prompt = buildPrompt({
  target_city: serviceArea.city, // "Centreville"
  target_state: serviceArea.state, // "VA"
  nearest_location_name: nearestLocation.name, // "Manassas"
  location_address: nearestLocation.full_address,
  location_phone: nearestLocation.phone,
  location_maps_url: nearestLocation.google_maps_url,
  location_order_link: nearestLocation.order_link,
});
```

**Benefits:**

- Target more cities than you have physical stores
- SEO pages for nearby cities drive traffic to actual stores
- Include real business details (address, phone, ordering) from nearest location
- Expand local SEO reach without opening new stores

## Migration from V1.0

If you have existing data with old status values:

```sql
-- Run migration
-- packages/server/migrations/004_simplify_location_status.sql

-- This will:
-- 1. Archive closed/temporarily-closed locations
-- 2. Convert coming-soon → upcoming
-- 3. Update table constraint
```

## Example Usage

```typescript
// Add new upcoming location
await createLocation("nash-and-smashed", {
  name: "Tysons Corner",
  city: "McLean",
  state: "VA",
  country: "USA",
  status: "upcoming",
  email: "franchisee@example.com"
});

// Update to active with full details
await updateLocation("nash-and-smashed", locationId, {
  status: "active",
  address: "7850 Tysons Corner Center",
  zip_code: "22102",
  phone: "703-555-0123",
  google_maps_url: "https://maps.app.goo.gl/...",
  store_id: "12345",
  order_link: "https://order.online/store/12345"
});

// Bulk import 10 new franchises
await bulkImportLocations("nash-and-smashed", {
  locations: [...],
  auto_create_service_areas: true
});
```
