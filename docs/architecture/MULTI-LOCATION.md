# Multi-Location Business Management - Implementation Guide

## Overview

This document outlines the multi-location system designed for franchise and multi-location businesses like Nash & Smashed, based on their real-world 28+ location operation across VA, MD, DC, SC, and NY.

## Database Schema

### `locations` Table

**Required Fields:**

- `id` - Unique identifier
- `business_id` - Link to parent business
- `name` - Short location name (e.g., "Manassas", "Silver Spring")
- `city` - City name
- `state` - State/region code
- `country` - Country (default: "USA")
- `status` - Operational status: `active`, `coming-soon`, `closed`, `temporarily-closed`

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

### Service Area Integration

Locations can **automatically create service areas** for SEO content generation:

- Active locations → auto-create corresponding service area
- Service areas can reference their source location via `location_id`
- When a location closes, service area remains but is unlinked

## API Endpoints

```
GET    /api/businesses/:id/locations                    # List with filters
GET    /api/businesses/:id/locations/stats              # Statistics
GET    /api/businesses/:id/locations/:locationId        # Get single
POST   /api/businesses/:id/locations                    # Create
PUT    /api/businesses/:id/locations/:locationId        # Update
DELETE /api/businesses/:id/locations/:locationId        # Delete
POST   /api/businesses/:id/locations/bulk-import        # Bulk import
```

## UI/UX Features

### List View

- **Grouping**: Locations grouped by state/region
- **Filters**: Status (active/coming-soon) and state dropdown
- **Stats Cards**: Total, Active, Coming Soon, States count
- **Status Badges**: Color-coded (green=active, blue=coming-soon, yellow=temp closed, gray=closed)
- **Quick Actions**: Map link, Order link, Edit, Delete

### Form Experience

- **Smart Defaults**:

  - `display_name` auto-generated from name + city
  - `full_address` auto-generated from components
  - `country` defaults to "USA"
  - `status` defaults to "active"

- **Conditional Validation**:
  - Coming-soon locations: only require name, city, state, country
  - Active locations: encourage but don't require address, phone, contact

### Bulk Import

- CSV/JSON upload support
- Option to auto-create service areas
- Error reporting per row
- Partial success handling (e.g., 25 created, 2 failed)

## Recommendations

### 1. **Status-Based Requirements**

**Coming Soon Locations** (minimal required):

```typescript
{
  name: "Alexandria",
  city: "Alexandria",
  state: "VA",
  country: "USA",
  status: "coming-soon",
  email: "Farhan-mushtaq@hotmail.com" // optional
}
```

**Active Locations** (fuller profile):

```typescript
{
  name: "Manassas",
  city: "Manassas",
  state: "VA",
  country: "USA",
  status: "active",
  address: "12853 Galveston Ct",
  zip_code: "20112",
  phone: "571-762-2677",
  email: "kaziarif393@gmail.com",
  google_maps_url: "https://maps.app.goo.gl/...",
  store_id: "3045437",
  order_link: "https://order.online/store/..."
}
```

### 2. **Headquarters Management**

- One location per business can be marked `is_headquarters: true`
- Headquarters appears first in lists
- Special visual indicator in UI
- Used for default contact info in generated content

### 3. **Service Area Automation**

**Recommended Flow:**

1. User adds active location → system asks "Create service area for {city}, {state}?"
2. If yes → auto-create service area with same city/state/country
3. Link service area to location via `location_id`
4. When generating content, prefer locations with linked service areas

**Benefits:**

- Reduces duplicate data entry
- Ensures service areas match actual locations
- Easy audit: which service areas have physical locations

### 4. **Bulk Operations**

**Import Format** (CSV or JSON):

```csv
name,city,state,country,status,address,zip_code,phone,email,google_maps_url
Manassas,Manassas,VA,USA,active,12853 Galveston Ct,20112,571-762-2677,kaziarif393@gmail.com,https://maps.app.goo.gl/...
Alexandria,Alexandria,VA,USA,coming-soon,,,,Farhan-mushtaq@hotmail.com,
```

**Import Options:**

- `auto_create_service_areas`: true/false
- `skip_duplicates`: true/false
- `update_existing`: true/false

### 5. **Map Integration**

**Phase 1** (Current):

- Store Google Maps URLs
- External link in UI

**Phase 2** (Future Enhancement):

- Embedded map view in dashboard
- Visual location picker for new locations
- Geocoding API to validate addresses
- Distance-based service area expansion

### 6. **Franchise/Multi-Owner Support**

For franchise operations like Nash & Smashed (each location has owner email):

**Option A: Simple** (Current)

- `email` field stores franchisee contact
- Used for operational communication

**Option B: Advanced** (Future)

- Add `franchisee_id` foreign key
- Link to `franchisees` table with full profile
- Role-based access: franchisees see only their locations

### 7. **Location Status Workflow**

Recommended status transitions:

```
coming-soon → active → temporarily-closed → active
                    └→ closed (permanent)
```

**UI Features:**

- Quick status toggle in list view
- Confirmation for permanent closure
- Archive/hide closed locations option

### 8. **Content Generation Integration**

**Current**: Service areas drive content generation

**With Locations**:

```typescript
// When generating for service area "Manassas, VA"
const serviceArea = getServiceArea("manassas-va");
const location = getLocation(serviceArea.location_id);

// Prompt enrichment
const prompt = buildPrompt({
  ...baseData,
  location_name: location.name,
  location_address: location.full_address,
  location_phone: location.phone,
  location_maps_url: location.google_maps_url,
  location_order_link: location.order_link,
});
```

**Benefits:**

- More accurate local content
- Include actual business details
- Link to real ordering/maps in generated pages

## Migration Strategy

### For Existing Nash & Smashed Data:

1. **Seed Script**:

   ```bash
   npx ts-node scripts/seed-locations-nash-smashed.ts
   ```

2. **Link to Service Areas**:

   - Match existing service areas by city+state
   - Set `location_id` on matching pairs
   - Report unmatched service areas (e.g., broader regions)

3. **Dashboard Rollout**:
   - Add "Locations" to sidebar
   - Keep "Service Areas" separate for now
   - Show link count in both views

## Next Steps

1. ✅ Database schema and migration
2. ✅ Type definitions and validation schemas
3. ✅ API endpoints with bulk import
4. ✅ Basic dashboard component
5. ⏳ Add/Edit modal forms
6. ⏳ Bulk import UI
7. ⏳ Integration with service areas
8. ⏳ Seed script for Nash & Smashed locations
9. ⏳ Content generation enrichment

## Example Usage

```typescript
// Add new coming-soon location
await createLocation("nash-and-smashed", {
  name: "Tysons Corner",
  city: "McLean",
  state: "VA",
  country: "USA",
  status: "coming-soon",
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
