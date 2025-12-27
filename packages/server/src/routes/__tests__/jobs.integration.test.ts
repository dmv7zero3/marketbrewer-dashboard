/**
 * Jobs API Integration Tests
 *
 * Tests for generation job creation with all 6 page types:
 * - keyword-service-area: Keywords × Service Areas
 * - keyword-location: Keywords × Store Locations (active + coming-soon)
 * - service-service-area: Services × Service Areas
 * - service-location: Services × Store Locations (active + coming-soon)
 * - location-keyword: Legacy alias for keyword-location
 * - service-area: Legacy alias for keyword-service-area
 *
 * To run these integration tests:
 * 1. Start server: npm run dev:server
 * 2. Run tests: npm run test:server -- routes/__tests__/jobs.integration.test.ts
 * These tests are automatically skipped unless RUN_JOBS_INTEGRATION_TESTS=true
 */

import request from "supertest";
import { expect } from "@jest/globals";

const API_BASE = process.env.API_BASE || "http://localhost:3001";
const API_TOKEN = process.env.API_TOKEN || "local-dev-token-12345";

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

// Skip running these network-heavy integration tests unless explicitly enabled.
const shouldRunJobsIntegrationTests =
  process.env.RUN_JOBS_INTEGRATION_TESTS === "true";
const jobsDescribe = shouldRunJobsIntegrationTests ? describe : describe.skip;

jobsDescribe("Jobs API Integration Tests", () => {
  let businessId: string;

  // Setup: Create a test business with keywords, locations, and service areas
  beforeAll(async () => {
    // Create business
    const bizRes = await apiRequest("post", "/api/businesses").send({
      name: "Test Business for Jobs",
      industry: "Restaurant",
    });
    expect(bizRes.status).toBe(201);
    businessId = bizRes.body.business.id;

    // Create keywords
    await apiRequest("post", `/api/businesses/${businessId}/keywords`).send({
      keyword: "Best Fried Chicken",
    });
    await apiRequest("post", `/api/businesses/${businessId}/keywords`).send({
      keyword: "Nashville Hot Chicken",
    });

    // Create service areas
    await apiRequest(
      "post",
      `/api/businesses/${businessId}/service-areas`
    ).send({
      city: "Bethesda",
      state: "MD",
      county: "Montgomery",
    });
    await apiRequest(
      "post",
      `/api/businesses/${businessId}/service-areas`
    ).send({
      city: "Rockville",
      state: "MD",
      county: "Montgomery",
    });

    // Create locations (both active and coming-soon)
    await apiRequest("post", `/api/businesses/${businessId}/locations`).send({
      name: "Sterling Store",
      city: "Sterling",
      state: "VA",
      country: "USA",
      status: "active",
    });
    await apiRequest("post", `/api/businesses/${businessId}/locations`).send({
      name: "London Store",
      city: "London",
      state: "England",
      country: "UK",
      status: "coming-soon",
    });

    // Create questionnaire with services
    await apiRequest("put", `/api/businesses/${businessId}/questionnaire`).send(
      {
        data: {
          identity: {
            tagline: "Test tagline",
            yearEstablished: "2020",
            ownerName: "Test Owner",
          },
          services: {
            offerings: [
              { name: "Smash Burger", slug: "smash-burger", isPrimary: true },
              {
                name: "Nashville Hot",
                slug: "nashville-hot",
                isPrimary: false,
              },
            ],
          },
          audience: {
            targetDescription: "Test audience",
            languages: ["en"],
          },
          brand: {
            voiceTone: "professional",
            forbiddenTerms: [],
            callToAction: "Order Now",
          },
          serviceType: "onsite",
        },
      }
    );
  }, 30000);

  // Cleanup: Delete test business
  afterAll(async () => {
    if (businessId) {
      await apiRequest("delete", `/api/businesses/${businessId}`);
    }
  });

  describe("PageType Schema Validation", () => {
    it("should accept keyword-service-area page type", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/${businessId}/generate`
      ).send({
        page_type: "keyword-service-area",
      });
      // Should not be a validation error (400)
      expect([200, 201, 422]).toContain(res.status);
      if (res.status === 422) {
        // Missing data is OK, validation passed
        expect(res.body.error).not.toContain("Invalid");
      }
    });

    it("should accept keyword-location page type", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/${businessId}/generate`
      ).send({
        page_type: "keyword-location",
      });
      expect([200, 201, 422]).toContain(res.status);
      if (res.status === 422) {
        expect(res.body.error).not.toContain("Invalid");
      }
    });

    it("should accept service-service-area page type", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/${businessId}/generate`
      ).send({
        page_type: "service-service-area",
      });
      expect([200, 201, 422]).toContain(res.status);
      if (res.status === 422) {
        expect(res.body.error).not.toContain("Invalid");
      }
    });

    it("should accept service-location page type", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/${businessId}/generate`
      ).send({
        page_type: "service-location",
      });
      expect([200, 201, 422]).toContain(res.status);
      if (res.status === 422) {
        expect(res.body.error).not.toContain("Invalid");
      }
    });

    it("should accept legacy location-keyword page type", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/${businessId}/generate`
      ).send({
        page_type: "location-keyword",
      });
      expect([200, 201, 422]).toContain(res.status);
      if (res.status === 422) {
        expect(res.body.error).not.toContain("Invalid");
      }
    });

    it("should accept legacy service-area page type", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/${businessId}/generate`
      ).send({
        page_type: "service-area",
      });
      expect([200, 201, 422]).toContain(res.status);
      if (res.status === 422) {
        expect(res.body.error).not.toContain("Invalid");
      }
    });

    it("should reject invalid page type", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/${businessId}/generate`
      ).send({
        page_type: "invalid-type",
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Validation");
    });

    it("should reject missing page_type", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/${businessId}/generate`
      ).send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Validation");
    });
  });

  describe("Job Creation with Full Data", () => {
    let jobId: string;

    it("should create keyword-service-area job successfully", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/${businessId}/generate`
      ).send({
        page_type: "keyword-service-area",
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("job");
      expect(res.body.job).toHaveProperty("id");
      expect(res.body.job.page_type).toBe("keyword-service-area");
      expect(res.body.job.status).toBe("pending");
      expect(res.body.job.total_pages).toBeGreaterThan(0);
      jobId = res.body.job.id;
    });

    it("should calculate correct page count for keyword-service-area", async () => {
      // 2 keywords × 2 service areas = 4 pages
      const res = await apiRequest(
        "post",
        `/api/businesses/${businessId}/generate`
      ).send({
        page_type: "keyword-service-area",
      });

      expect(res.status).toBe(201);
      expect(res.body.job.total_pages).toBe(4); // 2 keywords × 2 service areas
    });

    it("should calculate correct page count for keyword-location", async () => {
      // 2 keywords × 2 locations (active + coming-soon) = 4 pages
      const res = await apiRequest(
        "post",
        `/api/businesses/${businessId}/generate`
      ).send({
        page_type: "keyword-location",
      });

      expect(res.status).toBe(201);
      expect(res.body.job.total_pages).toBe(4); // 2 keywords × 2 locations
    });

    it("should calculate correct page count for service-service-area", async () => {
      // 2 services × 2 service areas = 4 pages
      const res = await apiRequest(
        "post",
        `/api/businesses/${businessId}/generate`
      ).send({
        page_type: "service-service-area",
      });

      expect(res.status).toBe(201);
      expect(res.body.job.total_pages).toBe(4); // 2 services × 2 service areas
    });

    it("should calculate correct page count for service-location", async () => {
      // 2 services × 2 locations = 4 pages
      const res = await apiRequest(
        "post",
        `/api/businesses/${businessId}/generate`
      ).send({
        page_type: "service-location",
      });

      expect(res.status).toBe(201);
      expect(res.body.job.total_pages).toBe(4); // 2 services × 2 locations
    });
  });

  describe("Job Pages with location_status", () => {
    it("should create job pages with correct location_status for keyword-location", async () => {
      const createRes = await apiRequest(
        "post",
        `/api/businesses/${businessId}/generate`
      ).send({
        page_type: "keyword-location",
      });

      expect(createRes.status).toBe(201);
      const jobId = createRes.body.job.id;

      // Get job pages
      const pagesRes = await apiRequest("get", `/api/jobs/${jobId}/pages`);

      expect(pagesRes.status).toBe(200);
      expect(pagesRes.body.pages).toBeDefined();

      // Check that location_status is set correctly
      const pages = pagesRes.body.pages;
      const activePages = pages.filter(
        (p: any) => p.location_status === "active"
      );
      const comingSoonPages = pages.filter(
        (p: any) => p.location_status === "coming-soon"
      );

      // Should have pages for both active and coming-soon locations
      expect(activePages.length).toBeGreaterThan(0);
      expect(comingSoonPages.length).toBeGreaterThan(0);
    });

    it("should set location_status to active for service-area pages", async () => {
      const createRes = await apiRequest(
        "post",
        `/api/businesses/${businessId}/generate`
      ).send({
        page_type: "keyword-service-area",
      });

      expect(createRes.status).toBe(201);
      const jobId = createRes.body.job.id;

      // Get job pages
      const pagesRes = await apiRequest("get", `/api/jobs/${jobId}/pages`);

      expect(pagesRes.status).toBe(200);

      // All service-area pages should have location_status = 'active'
      const pages = pagesRes.body.pages;
      pages.forEach((page: any) => {
        expect(page.location_status).toBe("active");
      });
    });
  });

  describe("Job Listing", () => {
    it("should list jobs for business", async () => {
      const res = await apiRequest("get", `/api/businesses/${businessId}/jobs`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("jobs");
      expect(Array.isArray(res.body.jobs)).toBe(true);
    });

    it("should return jobs with correct structure", async () => {
      const res = await apiRequest("get", `/api/businesses/${businessId}/jobs`);

      expect(res.status).toBe(200);
      if (res.body.jobs.length > 0) {
        const job = res.body.jobs[0];
        expect(job).toHaveProperty("id");
        expect(job).toHaveProperty("business_id");
        expect(job).toHaveProperty("status");
        expect(job).toHaveProperty("page_type");
        expect(job).toHaveProperty("total_pages");
        expect(job).toHaveProperty("completed_pages");
        expect(job).toHaveProperty("failed_pages");
        expect(job).toHaveProperty("created_at");
      }
    });
  });

  describe("Preview Pages Endpoint", () => {
    it("should preview keyword-service-area pages without creating job", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/${businessId}/generate/preview`
      ).send({
        page_type: "keyword-service-area",
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("preview");
      expect(res.body.preview).toHaveProperty("pages");
      expect(res.body.preview).toHaveProperty("totalPages");
      expect(res.body.preview.totalPages).toBe(4); // 2 keywords × 2 service areas
    });

    it("should preview keyword-location pages", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/${businessId}/generate/preview`
      ).send({
        page_type: "keyword-location",
      });

      expect(res.status).toBe(200);
      expect(res.body.preview.totalPages).toBe(4); // 2 keywords × 2 locations
    });

    it("should include location_status in preview pages", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/${businessId}/generate/preview`
      ).send({
        page_type: "keyword-location",
      });

      expect(res.status).toBe(200);
      const pages = res.body.preview.pages;

      // Check that location_status is included
      pages.forEach((page: any) => {
        expect(page).toHaveProperty("location_status");
        expect(["active", "coming-soon"]).toContain(page.location_status);
      });
    });
  });

  describe("Error Handling", () => {
    it("should return 404 for non-existent business", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/non-existent-business/generate`
      ).send({
        page_type: "keyword-service-area",
      });

      expect(res.status).toBe(404);
    });

    it("should return 422 when keywords required but missing", async () => {
      // Create business without keywords
      const bizRes = await apiRequest("post", "/api/businesses").send({
        name: "No Keywords Business",
        industry: "Restaurant",
      });
      const emptyBizId = bizRes.body.business.id;

      // Add service area but no keywords
      await apiRequest(
        "post",
        `/api/businesses/${emptyBizId}/service-areas`
      ).send({
        city: "Test City",
        state: "TS",
        county: "Test",
      });

      const res = await apiRequest(
        "post",
        `/api/businesses/${emptyBizId}/generate`
      ).send({
        page_type: "keyword-service-area",
      });

      expect(res.status).toBe(422);
      expect(res.body.error).toContain("keyword");

      // Cleanup
      await apiRequest("delete", `/api/businesses/${emptyBizId}`);
    });

    it("should return 422 when locations required but missing", async () => {
      // Create business with keywords but no locations
      const bizRes = await apiRequest("post", "/api/businesses").send({
        name: "No Locations Business",
        industry: "Restaurant",
      });
      const emptyBizId = bizRes.body.business.id;

      await apiRequest("post", `/api/businesses/${emptyBizId}/keywords`).send({
        keyword: "Test Keyword",
      });

      const res = await apiRequest(
        "post",
        `/api/businesses/${emptyBizId}/generate`
      ).send({
        page_type: "keyword-location",
      });

      expect(res.status).toBe(422);
      expect(res.body.error).toContain("location");

      // Cleanup
      await apiRequest("delete", `/api/businesses/${emptyBizId}`);
    });
  });
});
