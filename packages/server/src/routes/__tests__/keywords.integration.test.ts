/**
 * Keywords API Integration Tests
 *
 * NOTE: These tests require a running server with NODE_ENV=development
 * For primary testing, use smoke tests: npm run test:keywords-api
 *
 * To run these integration tests:
 * 1. Start server: NODE_ENV=development npm run dev:server
 * 2. Run tests: npm run test:server -- routes/__tests__/keywords.integration.test.ts
 *
 * Tests the full lifecycle of keyword operations:
 * - List keywords
 * - Create keywords
 * - Update keywords
 * - Delete keywords
 * - Bulk operations
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

describe("Keywords API Integration Tests", () => {
  let businessId: string;
  let keywordId: string;
  const testKeyword = "Test Nashville Hot Chicken";

  // Setup: Create a test business
  beforeAll(async () => {
    const res = await apiRequest("post", "/api/businesses").send({
      name: "Test Business for Keywords",
      location: "Test Location",
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

  describe("GET /api/businesses/:id/keywords", () => {
    it("should list keywords for a business", async () => {
      const res = await apiRequest(
        "get",
        `/api/businesses/${businessId}/keywords`
      );
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("keywords");
      expect(Array.isArray(res.body.keywords)).toBe(true);
    });

    it("should return empty array for new business", async () => {
      const res = await apiRequest(
        "get",
        `/api/businesses/${businessId}/keywords`
      );
      expect(res.status).toBe(200);
      expect(res.body.keywords).toEqual([]);
    });
  });

  describe("POST /api/businesses/:id/keywords", () => {
    it("should create a keyword without priority", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/${businessId}/keywords`
      ).send({
        keyword: testKeyword,
        search_intent: "commercial",
      });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("keyword");
      expect(res.body.keyword).toMatchObject({
        keyword: testKeyword,
        search_intent: "commercial",
        business_id: businessId,
      });
      expect(res.body.keyword).not.toHaveProperty("priority");
      keywordId = res.body.keyword.id;
    });

    it("should generate slug from keyword", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/${businessId}/keywords`
      ).send({
        keyword: "Best Fried Chicken",
      });
      expect(res.status).toBe(201);
      expect(res.body.keyword.slug).toBe("best-fried-chicken");
    });

    it("should accept keyword with special characters", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/${businessId}/keywords`
      ).send({
        keyword: "Chicken & Waffle Near Me",
      });
      expect(res.status).toBe(201);
      expect(res.body.keyword.slug).toBe("chicken-and-waffle-near-me");
    });

    it("should reject keyword without keyword field", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/${businessId}/keywords`
      ).send({
        search_intent: "commercial",
      });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("should reject invalid business ID", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/invalid-id/keywords`
      ).send({
        keyword: "Test Keyword",
      });
      expect(res.status).toBe(404);
    });

    it("should not accept priority field", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/${businessId}/keywords`
      ).send({
        keyword: "Test Keyword No Priority",
        priority: 5, // This should be ignored
      });
      expect(res.status).toBe(201);
      expect(res.body.keyword).not.toHaveProperty("priority");
    });
  });

  describe("PUT /api/businesses/:id/keywords/:keywordId", () => {
    it("should update keyword text", async () => {
      const res = await apiRequest(
        "put",
        `/api/businesses/${businessId}/keywords/${keywordId}`
      ).send({
        keyword: "Updated Nashville Hot Chicken",
      });
      expect(res.status).toBe(200);
      expect(res.body.keyword.keyword).toBe("Updated Nashville Hot Chicken");
      expect(res.body.keyword.slug).toBe("updated-nashville-hot-chicken");
    });

    it("should update search intent", async () => {
      const res = await apiRequest(
        "put",
        `/api/businesses/${businessId}/keywords/${keywordId}`
      ).send({
        search_intent: "transactional",
      });
      expect(res.status).toBe(200);
      expect(res.body.keyword.search_intent).toBe("transactional");
    });

    it("should ignore priority field in update", async () => {
      const res = await apiRequest(
        "put",
        `/api/businesses/${businessId}/keywords/${keywordId}`
      ).send({
        keyword: "Final Test Keyword",
        priority: 99, // Should be ignored
      });
      expect(res.status).toBe(200);
      expect(res.body.keyword).not.toHaveProperty("priority");
    });

    it("should return 404 for non-existent keyword", async () => {
      const res = await apiRequest(
        "put",
        `/api/businesses/${businessId}/keywords/non-existent-id`
      ).send({
        keyword: "Updated Keyword",
      });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/businesses/:id/keywords/:keywordId", () => {
    let deleteKeywordId: string;

    beforeEach(async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/${businessId}/keywords`
      ).send({
        keyword: "Keyword to Delete",
      });
      deleteKeywordId = res.body.keyword.id;
    });

    it("should delete a keyword", async () => {
      const res = await apiRequest(
        "delete",
        `/api/businesses/${businessId}/keywords/${deleteKeywordId}`
      );
      expect(res.status).toBe(204);
    });

    it("should verify keyword is deleted", async () => {
      const deleteRes = await apiRequest(
        "delete",
        `/api/businesses/${businessId}/keywords/${deleteKeywordId}`
      );
      expect(deleteRes.status).toBe(204);

      const getRes = await apiRequest(
        "get",
        `/api/businesses/${businessId}/keywords`
      );
      const found = getRes.body.keywords.find(
        (k: any) => k.id === deleteKeywordId
      );
      expect(found).toBeUndefined();
    });

    it("should return 404 when deleting non-existent keyword", async () => {
      const res = await apiRequest(
        "delete",
        `/api/businesses/${businessId}/keywords/non-existent-id`
      );
      expect(res.status).toBe(404);
    });
  });

  describe("Keywords List Order", () => {
    let business2Id: string;

    beforeAll(async () => {
      const res = await apiRequest("post", "/api/businesses").send({
        name: "Test Business 2 for Ordering",
        location: "Test Location",
      });
      business2Id = res.body.business.id;
    });

    it("should order keywords by created_at descending", async () => {
      // Create multiple keywords with slight delays
      const kw1 = await apiRequest(
        "post",
        `/api/businesses/${business2Id}/keywords`
      ).send({ keyword: "First Keyword" });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const kw2 = await apiRequest(
        "post",
        `/api/businesses/${business2Id}/keywords`
      ).send({ keyword: "Second Keyword" });

      const listRes = await apiRequest(
        "get",
        `/api/businesses/${business2Id}/keywords`
      );
      expect(listRes.body.keywords[0].id).toBe(kw2.body.keyword.id);
      expect(listRes.body.keywords[1].id).toBe(kw1.body.keyword.id);
    });

    afterAll(async () => {
      if (business2Id) {
        await apiRequest("delete", `/api/businesses/${business2Id}`);
      }
    });
  });

  describe("Data Integrity", () => {
    let integrityBusinessId: string;

    beforeAll(async () => {
      const res = await apiRequest("post", "/api/businesses").send({
        name: "Data Integrity Test Business",
        location: "Test Location",
      });
      integrityBusinessId = res.body.business.id;
    });

    it("should preserve all required fields", async () => {
      const res = await apiRequest(
        "post",
        `/api/businesses/${integrityBusinessId}/keywords`
      ).send({
        keyword: "Test Keyword",
        search_intent: "informational",
      });

      const keyword = res.body.keyword;
      expect(keyword).toHaveProperty("id");
      expect(keyword).toHaveProperty("business_id");
      expect(keyword).toHaveProperty("slug");
      expect(keyword).toHaveProperty("keyword");
      expect(keyword).toHaveProperty("search_intent");
      expect(keyword).toHaveProperty("created_at");
      expect(keyword).not.toHaveProperty("priority");
    });

    it("should maintain data consistency across operations", async () => {
      const createRes = await apiRequest(
        "post",
        `/api/businesses/${integrityBusinessId}/keywords`
      ).send({
        keyword: "Consistency Test",
        search_intent: "commercial",
      });

      const kwId = createRes.body.keyword.id;
      const originalData = createRes.body.keyword;

      const updateRes = await apiRequest(
        "put",
        `/api/businesses/${integrityBusinessId}/keywords/${kwId}`
      ).send({
        search_intent: "transactional",
      });

      expect(updateRes.body.keyword.id).toBe(originalData.id);
      expect(updateRes.body.keyword.slug).toBe(originalData.slug);
      expect(updateRes.body.keyword.created_at).toBe(originalData.created_at);
    });

    afterAll(async () => {
      if (integrityBusinessId) {
        await apiRequest("delete", `/api/businesses/${integrityBusinessId}`);
      }
    });
  });

  describe("Server Health", () => {
    it("should have working health check endpoint", async () => {
      const res = await request(API_BASE).get("/health");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("status");
    });

    it("should respond to API requests from dashboard", async () => {
      const res = await request(API_BASE)
        .get("/api/businesses")
        .set("Authorization", `Bearer ${API_TOKEN}`);
      expect([200, 401, 403]).toContain(res.status);
    });
  });
});
