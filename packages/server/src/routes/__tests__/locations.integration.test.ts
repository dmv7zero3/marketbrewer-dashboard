/**
 * Locations API Integration Tests
 *
 * NOTE: These tests require a running server with NODE_ENV=development
 * For primary testing, use smoke tests: npm run test:locations-api
 *
 * To run these integration tests:
 * 1. Start server: NODE_ENV=development npm run dev:server
 * 2. Run tests: npm run test:server -- routes/__tests__/locations.integration.test.ts
 *
 * Tests the full lifecycle of location operations:
 * - List locations with filters
 * - Create locations with validation
 * - Update locations (full and partial)
 * - Delete locations with cleanup
 * - Bulk import operations
 * - Service area integration
 */

import request from "supertest";
import { expect } from "@jest/globals";

const API_BASE = process.env.API_BASE || "http://localhost:3001";
const API_TOKEN = process.env.API_TOKEN || "local-dev-token";

// Helper function to make authenticated requests
const apiRequest = (
  method: "get" | "post" | "put" | "delete",
  path: string
) => {
  return request(API_BASE)
    [method](path)
    .set("Authorization", `Bearer ${API_TOKEN}`)
    .set("Content-Type", "application/json");
};

describe("Locations API Integration Tests", () => {
  let businessId: string;
  let locationId: string;

  // Setup: Create a test business
  beforeAll(async () => {
    const res = await apiRequest("post", "/api/businesses").send({
      name: "Test Business for Locations",
      industry: "Restaurant",
    });
    expect(res.status).toBe(201);
    businessId = res.body.business.id;
  });

  // Cleanup: Delete test business
  afterAll(async () => {
    if (businessId) {
      await apiRequest("delete", `/api/businesses/${businessId}`);
    }
  });

  describe("GET /api/businesses/:id/locations", () => {
    it("should list locations for a business", async () => {
      const res = await apiRequest(
        "get",
        `/api/businesses/seo/${businessId}/locations`
      );
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("locations");
      expect(Array.isArray(res.body.locations)).toBe(true);
    });

    it("should return empty array for new business", async () => {
      const res = await apiRequest(
        "get",
        `/api/businesses/seo/${businessId}/locations`
      );
      expect(res.status).toBe(200);
      expect(res.body.locations).toEqual([]);
    });

    it("should filter locations by status", async () => {
      // Create two locations with different statuses
      await apiRequest(
        "post",
        `/api/businesses/seo/${businessId}/locations`
      ).send({
        name: "Active Location",
        city: "City1",
        state: "ST",
        country: "US",
        status: "active",
      });

      await apiRequest(
        "post",
        `/api/businesses/seo/${businessId}/locations`
      ).send({
        name: "Upcoming Location",
        city: "City2",
        state: "ST",
        country: "US",
        status: "upcoming",
      });

      const res = await apiRequest(
        "get",
        `/api/businesses/seo/${businessId}/locations?status=active`
      );
      expect(res.status).toBe(200);
      expect(res.body.locations.length).toBeGreaterThan(0);
      res.body.locations.forEach((loc: any) => {
        expect(loc.status).toBe("active");
      });
    });

    it("should filter locations by state", async () => {
      const res = await apiRequest(
        "get",
        `/api/businesses/seo/${businessId}/locations?state=ST`
      );
      expect(res.status).toBe(200);
      res.body.locations.forEach((loc: any) => {
        expect(loc.state).toBe("ST");
      });
    });
  });

  describe("GET /api/businesses/:id/locations/stats", () => {
    it("should return location statistics", async () => {
      const res = await apiRequest(
        "get",
        `/api/businesses/seo/${businessId}/locations/stats`
      );
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("stats");
      expect(res.body.stats).toHaveProperty("total");
      expect(res.body.stats).toHaveProperty("active");
      expect(res.body.stats).toHaveProperty("upcoming");
      expect(res.body.stats).toHaveProperty("byState");
      expect(res.body.stats).toHaveProperty("byCountry");
    });

    it("should have accurate counts", async () => {
      const res = await apiRequest(
        "get",
        `/api/businesses/seo/${businessId}/locations/stats`
      );
      const stats = res.body.stats;
      expect(stats.total).toBe(stats.active + stats.upcoming);
    });
  });

  describe("POST /api/businesses/:id/locations", () => {
    it("should create a location with required fields only", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/seo/${businessId}/locations`
      ).send({
        name: "Minimal Location",
        city: "TestCity",
        state: "TC",
        country: "US",
        status: "active",
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("location");
      expect(res.body.location).toMatchObject({
        name: "Minimal Location",
        city: "TestCity",
        state: "TC",
        country: "US",
        status: "active",
        business_id: businessId,
      });
      locationId = res.body.location.id;
    });

    it("should create location with all optional fields", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/seo/${businessId}/locations`
      ).send({
        name: "Full Location",
        city: "FullCity",
        state: "FC",
        country: "US",
        status: "active",
        display_name: "Full Test Location",
        address: "123 Test Street",
        zip_code: "12345",
        full_address: "123 Test Street, FullCity, FC 12345",
        phone: "555-0100",
        email: "test@example.com",
        google_maps_url: "https://maps.google.com/test",
        store_id: "STORE-001",
        order_link: "https://order.example.com",
        is_headquarters: true,
        note: "Test note",
        priority: 10,
      });

      expect(res.status).toBe(201);
      expect(res.body.location).toMatchObject({
        display_name: "Full Test Location",
        address: "123 Test Street",
        zip_code: "12345",
        phone: "555-0100",
        email: "test@example.com",
        is_headquarters: 1,
        priority: 10,
      });
    });

    it("should auto-generate display_name if not provided", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/seo/${businessId}/locations`
      ).send({
        name: "Auto Display",
        city: "AutoCity",
        state: "AC",
        country: "US",
        status: "active",
      });

      expect(res.status).toBe(201);
      expect(res.body.location.display_name).toContain("AutoCity");
    });

    it("should auto-generate full_address if components provided", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/seo/${businessId}/locations`
      ).send({
        name: "Auto Address",
        city: "AddressCity",
        state: "AD",
        country: "US",
        status: "active",
        address: "456 Auto St",
        zip_code: "67890",
      });

      expect(res.status).toBe(201);
      expect(res.body.location.full_address).toContain("456 Auto St");
      expect(res.body.location.full_address).toContain("AddressCity");
      expect(res.body.location.full_address).toContain("67890");
    });

    it("should reject location without required fields", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/seo/${businessId}/locations`
      ).send({
        name: "Incomplete",
        // Missing city, state, country, status
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("should reject invalid status value", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/seo/${businessId}/locations`
      ).send({
        name: "Bad Status",
        city: "City",
        state: "ST",
        country: "US",
        status: "invalid-status",
      });

      expect(res.status).toBe(400);
    });

    it("should create service area for active location", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/seo/${businessId}/locations`
      ).send({
        name: "Service Area Test",
        city: "ServiceCity",
        state: "SC",
        country: "US",
        status: "active",
      });

      expect(res.status).toBe(201);

      // Check if service area was created
      const areasRes = await apiRequest(
        "get",
        `/api/businesses/seo/${businessId}/service-areas`
      );
      const serviceArea = areasRes.body.service_areas.find(
        (area: any) => area.city === "ServiceCity" && area.state === "SC"
      );
      expect(serviceArea).toBeDefined();
    });

    it("should not create service area for upcoming location", async () => {
      const beforeRes = await apiRequest(
        "get",
        `/api/businesses/seo/${businessId}/service-areas`
      );
      const beforeCount = beforeRes.body.service_areas.length;

      await apiRequest(
        "post",
        `/api/businesses/seo/${businessId}/locations`
      ).send({
        name: "No Service Area",
        city: "NoServiceCity",
        state: "NS",
        country: "US",
        status: "upcoming",
      });

      const afterRes = await apiRequest(
        "get",
        `/api/businesses/seo/${businessId}/service-areas`
      );
      const afterCount = afterRes.body.service_areas.length;

      expect(afterCount).toBe(beforeCount);
    });
  });

  describe("GET /api/businesses/:id/locations/:locationId", () => {
    it("should get a single location", async () => {
      const res = await apiRequest(
        "get",
        `/api/businesses/seo/${businessId}/locations/${locationId}`
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("location");
      expect(res.body.location.id).toBe(locationId);
    });

    it("should return 404 for non-existent location", async () => {
      const res = await apiRequest(
        "get",
        `/api/businesses/seo/${businessId}/locations/non-existent-id`
      );

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/businesses/:id/locations/:locationId", () => {
    it("should update location name", async () => {
      const res = await apiRequest(
        "put",
        `/api/businesses/seo/${businessId}/locations/${locationId}`
      ).send({
        name: "Updated Name",
      });

      expect(res.status).toBe(200);
      expect(res.body.location.name).toBe("Updated Name");
    });

    it("should update location status", async () => {
      const res = await apiRequest(
        "put",
        `/api/businesses/seo/${businessId}/locations/${locationId}`
      ).send({
        status: "upcoming",
      });

      expect(res.status).toBe(200);
      expect(res.body.location.status).toBe("upcoming");
    });

    it("should update multiple fields at once", async () => {
      const res = await apiRequest(
        "put",
        `/api/businesses/seo/${businessId}/locations/${locationId}`
      ).send({
        name: "Multi Update",
        phone: "555-9999",
        email: "updated@example.com",
        priority: 20,
      });

      expect(res.status).toBe(200);
      expect(res.body.location).toMatchObject({
        name: "Multi Update",
        phone: "555-9999",
        email: "updated@example.com",
        priority: 20,
      });
    });

    it("should update headquarters flag", async () => {
      const res = await apiRequest(
        "put",
        `/api/businesses/seo/${businessId}/locations/${locationId}`
      ).send({
        is_headquarters: true,
      });

      expect(res.status).toBe(200);
      expect(res.body.location.is_headquarters).toBe(1);
    });

    it("should handle partial updates", async () => {
      // Get current state
      const before = await apiRequest(
        "get",
        `/api/businesses/seo/${businessId}/locations/${locationId}`
      );

      // Update only one field
      const res = await apiRequest(
        "put",
        `/api/businesses/seo/${businessId}/locations/${locationId}`
      ).send({
        note: "Partial update test",
      });

      expect(res.status).toBe(200);
      expect(res.body.location.note).toBe("Partial update test");
      // Other fields should remain unchanged
      expect(res.body.location.city).toBe(before.body.location.city);
    });

    it("should return 404 for non-existent location", async () => {
      const res = await apiRequest(
        "put",
        `/api/businesses/seo/${businessId}/locations/non-existent-id`
      ).send({
        name: "Should Fail",
      });

      expect(res.status).toBe(404);
    });

    it("should preserve created_at timestamp", async () => {
      const before = await apiRequest(
        "get",
        `/api/businesses/seo/${businessId}/locations/${locationId}`
      );

      const res = await apiRequest(
        "put",
        `/api/businesses/seo/${businessId}/locations/${locationId}`
      ).send({
        name: "Timestamp Test",
      });

      expect(res.body.location.created_at).toBe(
        before.body.location.created_at
      );
    });

    it("should update updated_at timestamp", async () => {
      const before = await apiRequest(
        "get",
        `/api/businesses/seo/${businessId}/locations/${locationId}`
      );

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      const res = await apiRequest(
        "put",
        `/api/businesses/seo/${businessId}/locations/${locationId}`
      ).send({
        name: "Timestamp Update Test",
      });

      expect(res.body.location.updated_at).not.toBe(
        before.body.location.updated_at
      );
    });
  });

  describe("DELETE /api/businesses/:id/locations/:locationId", () => {
    let deleteLocationId: string;

    beforeEach(async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/seo/${businessId}/locations`
      ).send({
        name: "Location to Delete",
        city: "DeleteCity",
        state: "DL",
        country: "US",
        status: "upcoming",
      });
      deleteLocationId = res.body.location.id;
    });

    it("should delete a location", async () => {
      const res = await apiRequest(
        "delete",
        `/api/businesses/seo/${businessId}/locations/${deleteLocationId}`
      );

      expect(res.status).toBe(204);
    });

    it("should verify location is deleted", async () => {
      await apiRequest(
        "delete",
        `/api/businesses/seo/${businessId}/locations/${deleteLocationId}`
      );

      const res = await apiRequest(
        "get",
        `/api/businesses/seo/${businessId}/locations/${deleteLocationId}`
      );

      expect(res.status).toBe(404);
    });

    it("should unlink service areas when deleting location", async () => {
      // Create active location with service area
      const createRes = await apiRequest(
        "post",
        `/api/businesses/seo/${businessId}/locations`
      ).send({
        name: "Linked Location",
        city: "LinkedCity",
        state: "LC",
        country: "US",
        status: "active",
      });
      const linkedId = createRes.body.location.id;

      // Delete the location
      await apiRequest(
        "delete",
        `/api/businesses/seo/${businessId}/locations/${linkedId}`
      );

      // Check that service area still exists but is unlinked
      const areasRes = await apiRequest(
        "get",
        `/api/businesses/seo/${businessId}/service-areas`
      );
      const serviceArea = areasRes.body.service_areas.find(
        (area: any) => area.city === "LinkedCity"
      );

      if (serviceArea) {
        expect(serviceArea.location_id).toBeNull();
      }
    });

    it("should return 404 when deleting non-existent location", async () => {
      const res = await apiRequest(
        "delete",
        `/api/businesses/seo/${businessId}/locations/non-existent-id`
      );

      expect(res.status).toBe(404);
    });

    it("should not allow deleting location twice", async () => {
      await apiRequest(
        "delete",
        `/api/businesses/seo/${businessId}/locations/${deleteLocationId}`
      );

      const res = await apiRequest(
        "delete",
        `/api/businesses/seo/${businessId}/locations/${deleteLocationId}`
      );

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/businesses/:id/locations/bulk-import", () => {
    it("should import multiple locations", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/seo/${businessId}/locations/bulk-import`
      ).send({
        locations: [
          {
            name: "Bulk 1",
            city: "BulkCity1",
            state: "BK",
            country: "US",
            status: "upcoming",
          },
          {
            name: "Bulk 2",
            city: "BulkCity2",
            state: "BK",
            country: "US",
            status: "upcoming",
          },
          {
            name: "Bulk 3",
            city: "BulkCity3",
            state: "BK",
            country: "US",
            status: "upcoming",
          },
        ],
        auto_create_service_areas: false,
      });

      expect(res.status).toBe(201);
      expect(res.body.created).toBe(3);
      expect(res.body.failed).toBe(0);
      expect(res.body.locations.length).toBe(3);
      expect(res.body.errors).toEqual([]);
    });

    it("should create service areas when enabled for active locations", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/seo/${businessId}/locations/bulk-import`
      ).send({
        locations: [
          {
            name: "Active Bulk 1",
            city: "ActiveBulk1",
            state: "AB",
            country: "US",
            status: "active",
          },
          {
            name: "Active Bulk 2",
            city: "ActiveBulk2",
            state: "AB",
            country: "US",
            status: "active",
          },
        ],
        auto_create_service_areas: true,
      });

      expect(res.status).toBe(201);
      expect(res.body.created).toBe(2);

      // Verify service areas were created
      const areasRes = await apiRequest(
        "get",
        `/api/businesses/seo/${businessId}/service-areas`
      );
      const area1 = areasRes.body.service_areas.find(
        (a: any) => a.city === "ActiveBulk1"
      );
      const area2 = areasRes.body.service_areas.find(
        (a: any) => a.city === "ActiveBulk2"
      );

      expect(area1).toBeDefined();
      expect(area2).toBeDefined();
    });

    it("should handle partial failures gracefully", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/seo/${businessId}/locations/bulk-import`
      ).send({
        locations: [
          {
            name: "Valid",
            city: "ValidCity",
            state: "VL",
            country: "US",
            status: "upcoming",
          },
          {
            // Missing required fields
            name: "Invalid",
          },
          {
            name: "Also Valid",
            city: "AlsoValid",
            state: "AV",
            country: "US",
            status: "active",
          },
        ],
        auto_create_service_areas: false,
      });

      expect(res.status).toBe(201);
      expect(res.body.created).toBeGreaterThan(0);
      expect(res.body.failed).toBeGreaterThan(0);
      expect(res.body.errors.length).toBe(res.body.failed);
    });

    it("should return empty result for empty array", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/seo/${businessId}/locations/bulk-import`
      ).send({
        locations: [],
        auto_create_service_areas: false,
      });

      expect(res.status).toBe(201);
      expect(res.body.created).toBe(0);
      expect(res.body.failed).toBe(0);
    });

    it("should handle duplicate cities in same import", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/seo/${businessId}/locations/bulk-import`
      ).send({
        locations: [
          {
            name: "Duplicate 1",
            city: "DupeCity",
            state: "DP",
            country: "US",
            status: "active",
          },
          {
            name: "Duplicate 2",
            city: "DupeCity",
            state: "DP",
            country: "US",
            status: "active",
          },
        ],
        auto_create_service_areas: true,
      });

      expect(res.status).toBe(201);
      expect(res.body.created).toBe(2);

      // Should only create one service area
      const areasRes = await apiRequest(
        "get",
        `/api/businesses/seo/${businessId}/service-areas`
      );
      const dupeAreas = areasRes.body.service_areas.filter(
        (a: any) => a.city === "DupeCity" && a.state === "DP"
      );
      expect(dupeAreas.length).toBe(1);
    });
  });

  describe("Data Integrity", () => {
    it("should preserve all fields during update", async () => {
      // Create location with all fields
      const createRes = await apiRequest(
        "post",
        `/api/businesses/seo/${businessId}/locations`
      ).send({
        name: "Integrity Test",
        city: "IntegrityCity",
        state: "IT",
        country: "US",
        status: "active",
        address: "123 Integrity St",
        zip_code: "11111",
        phone: "555-1111",
        email: "integrity@test.com",
        priority: 5,
      });

      const originalId = createRes.body.location.id;

      // Update only one field
      await apiRequest(
        "put",
        `/api/businesses/seo/${businessId}/locations/${originalId}`
      ).send({
        name: "Updated Integrity Test",
      });

      // Get and verify all other fields preserved
      const getRes = await apiRequest(
        "get",
        `/api/businesses/seo/${businessId}/locations/${originalId}`
      );

      expect(getRes.body.location).toMatchObject({
        city: "IntegrityCity",
        state: "IT",
        address: "123 Integrity St",
        zip_code: "11111",
        phone: "555-1111",
        email: "integrity@test.com",
        priority: 5,
      });
    });

    it("should maintain referential integrity with business", async () => {
      const res = await apiRequest(
        "get",
        `/api/businesses/seo/${businessId}/locations`
      );

      res.body.locations.forEach((loc: any) => {
        expect(loc.business_id).toBe(businessId);
      });
    });
  });

  describe("Server Health", () => {
    it("should have working health check endpoint", async () => {
      const res = await request(API_BASE).get("/health");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("status");
    });
  });
});
