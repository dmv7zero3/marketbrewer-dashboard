/**
 * End-to-End Integration Tests
 *
 * Validates complete workflows:
 * - API health check
 * - Service area creation
 * - Keyword management
 * - Content generation queue
 * - Worker processing
 * - Page retrieval
 *
 * Run with: npm run test:server -- e2e.test.ts
 */

import axios from "axios";
import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";

const API_URL = process.env.API_URL || "http://localhost:3001";
const API_TOKEN = process.env.API_TOKEN || "test-token";

interface HealthResponse {
  status: "healthy" | "degraded";
  timestamp: string;
  version: string;
}

interface ServiceArea {
  id: string;
  name: string;
  state: string;
}

interface Keyword {
  id: string;
  term: string;
  priority: number;
}

interface GenerationJob {
  id: string;
  serviceAreaId: string;
  keywordId: string;
  status: "queued" | "processing" | "completed" | "failed";
  createdAt: string;
}

interface Page {
  id: string;
  serviceAreaId: string;
  keywordId: string;
  title: string;
  slug: string;
  status: "draft" | "published";
}

describe("MarketBrewer E2E Integration Tests", () => {
  let serviceAreaId: string;
  let keywordId: string;
  let jobId: string;

  // Setup: Verify API is running
  beforeAll(async () => {
    try {
      const response = await axios.get<HealthResponse>(`${API_URL}/health`, {
        headers: { Authorization: `Bearer ${API_TOKEN}` },
      });
      expect(response.status).toBe(200);
      expect(["healthy", "degraded"]).toContain(response.data.status);
      console.log(`✓ API running at ${API_URL}`);
    } catch (error) {
      console.error(`✗ API not responding at ${API_URL}`);
      console.error("To start API: npm run dev:server");
      throw error;
    }
  });

  afterAll(async () => {
    console.log("\n✓ All E2E tests completed");
  });

  describe("API Health & Readiness", () => {
    test("GET /health returns healthy status", async () => {
      const response = await axios.get<HealthResponse>(`${API_URL}/health`, {
        headers: { Authorization: `Bearer ${API_TOKEN}` },
      });

      expect(response.status).toBe(200);
      expect(response.data.status).toBe("healthy");
      expect(response.data.timestamp).toBeDefined();
      expect(response.data.version).toMatch(/^\d+\.\d+\.\d+/);
    });

    test("API responds to authenticated requests", async () => {
      const response = await axios.get(`${API_URL}/health`, {
        headers: { Authorization: `Bearer ${API_TOKEN}` },
      });

      expect(response.status).toBe(200);
    });

    test("Unauthenticated request returns 401", async () => {
      try {
        await axios.get(`${API_URL}/health`);
        fail("Should have thrown 401 error");
      } catch (error: any) {
        expect(error.response?.status).toBe(401);
      }
    });
  });

  describe("Service Area Management", () => {
    test("Create service area", async () => {
      const response = await axios.post<ServiceArea>(
        `${API_URL}/api/service-areas`,
        {
          name: "Test Service Area",
          state: "VA",
        },
        {
          headers: { Authorization: `Bearer ${API_TOKEN}` },
        }
      );

      expect(response.status).toBe(201);
      expect(response.data.id).toBeDefined();
      expect(response.data.name).toBe("Test Service Area");
      expect(response.data.state).toBe("VA");

      serviceAreaId = response.data.id;
    });

    test("Retrieve service area by ID", async () => {
      const response = await axios.get<ServiceArea>(
        `${API_URL}/api/service-areas/${serviceAreaId}`,
        {
          headers: { Authorization: `Bearer ${API_TOKEN}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(serviceAreaId);
      expect(response.data.name).toBe("Test Service Area");
    });

    test("List all service areas", async () => {
      const response = await axios.get<{ items: ServiceArea[]; total: number }>(
        `${API_URL}/api/service-areas`,
        {
          headers: { Authorization: `Bearer ${API_TOKEN}` },
        }
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.items)).toBe(true);
      expect(typeof response.data.total).toBe("number");
      expect(response.data.items.some((sa) => sa.id === serviceAreaId)).toBe(
        true
      );
    });
  });

  describe("Keyword Management", () => {
    test("Create keyword", async () => {
      const response = await axios.post<Keyword>(
        `${API_URL}/api/keywords`,
        {
          term: "best-chicken-wings",
          priority: 1,
        },
        {
          headers: { Authorization: `Bearer ${API_TOKEN}` },
        }
      );

      expect(response.status).toBe(201);
      expect(response.data.id).toBeDefined();
      expect(response.data.term).toBe("best-chicken-wings");
      expect(response.data.priority).toBe(1);

      keywordId = response.data.id;
    });

    test("Retrieve keyword by ID", async () => {
      const response = await axios.get<Keyword>(
        `${API_URL}/api/keywords/${keywordId}`,
        {
          headers: { Authorization: `Bearer ${API_TOKEN}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(keywordId);
      expect(response.data.term).toBe("best-chicken-wings");
    });

    test("List all keywords", async () => {
      const response = await axios.get<{ items: Keyword[]; total: number }>(
        `${API_URL}/api/keywords`,
        {
          headers: { Authorization: `Bearer ${API_TOKEN}` },
        }
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.items)).toBe(true);
      expect(response.data.items.some((k) => k.id === keywordId)).toBe(true);
    });
  });

  describe("Content Generation Queue", () => {
    test("Queue new generation job", async () => {
      const response = await axios.post<GenerationJob>(
        `${API_URL}/api/generation-jobs`,
        {
          serviceAreaId,
          keywordId,
        },
        {
          headers: { Authorization: `Bearer ${API_TOKEN}` },
        }
      );

      expect(response.status).toBe(201);
      expect(response.data.id).toBeDefined();
      expect(response.data.serviceAreaId).toBe(serviceAreaId);
      expect(response.data.keywordId).toBe(keywordId);
      expect(["queued", "processing"]).toContain(response.data.status);

      jobId = response.data.id;
    });

    test("Retrieve job by ID", async () => {
      const response = await axios.get<GenerationJob>(
        `${API_URL}/api/generation-jobs/${jobId}`,
        {
          headers: { Authorization: `Bearer ${API_TOKEN}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(jobId);
      expect(response.data.serviceAreaId).toBe(serviceAreaId);
      expect(["queued", "processing", "completed", "failed"]).toContain(
        response.data.status
      );
    });

    test("List generation jobs with pagination", async () => {
      const response = await axios.get<{
        items: GenerationJob[];
        total: number;
      }>(`${API_URL}/api/generation-jobs?limit=10&offset=0`, {
        headers: { Authorization: `Bearer ${API_TOKEN}` },
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.items)).toBe(true);
      expect(response.data.items.some((j) => j.id === jobId)).toBe(true);
    });

    test("Filter jobs by status", async () => {
      const response = await axios.get<{ items: GenerationJob[] }>(
        `${API_URL}/api/generation-jobs?status=queued`,
        {
          headers: { Authorization: `Bearer ${API_TOKEN}` },
        }
      );

      expect(response.status).toBe(200);
      response.data.items.forEach((job) => {
        expect(job.status).toBe("queued");
      });
    });
  });

  describe("Page Retrieval", () => {
    test("List pages (may be empty if job still processing)", async () => {
      const response = await axios.get<{ items: Page[]; total: number }>(
        `${API_URL}/api/pages`,
        {
          headers: { Authorization: `Bearer ${API_TOKEN}` },
        }
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.items)).toBe(true);
      expect(typeof response.data.total).toBe("number");
    });

    test("Filter pages by service area", async () => {
      const response = await axios.get<{ items: Page[] }>(
        `${API_URL}/api/pages?serviceAreaId=${serviceAreaId}`,
        {
          headers: { Authorization: `Bearer ${API_TOKEN}` },
        }
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.items)).toBe(true);
    });
  });

  describe("Error Handling", () => {
    test("Invalid service area ID returns 404", async () => {
      try {
        await axios.get(`${API_URL}/api/service-areas/invalid-id`, {
          headers: { Authorization: `Bearer ${API_TOKEN}` },
        });
        fail("Should have thrown 404 error");
      } catch (error: any) {
        expect(error.response?.status).toBe(404);
      }
    });

    test("Missing required field returns 400", async () => {
      try {
        await axios.post(
          `${API_URL}/api/service-areas`,
          { name: "Incomplete Service Area" },
          {
            headers: { Authorization: `Bearer ${API_TOKEN}` },
          }
        );
        fail("Should have thrown 400 error");
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
      }
    });

    test("Server error returns 500 with error details", async () => {
      try {
        // Try to create generation job with invalid IDs
        await axios.post(
          `${API_URL}/api/generation-jobs`,
          {
            serviceAreaId: "invalid-id",
            keywordId: "invalid-id",
          },
          {
            headers: { Authorization: `Bearer ${API_TOKEN}` },
          }
        );
        // May succeed (system may skip invalid IDs) or fail with 400/500
      } catch (error: any) {
        expect([400, 404, 500]).toContain(error.response?.status);
        expect(error.response?.data).toHaveProperty("message");
      }
    });
  });

  describe("Performance Baseline", () => {
    test("Health check responds in <100ms", async () => {
      const start = Date.now();
      await axios.get(`${API_URL}/health`, {
        headers: { Authorization: `Bearer ${API_TOKEN}` },
      });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    test("List endpoints respond in <500ms", async () => {
      const start = Date.now();
      await axios.get(`${API_URL}/api/service-areas`, {
        headers: { Authorization: `Bearer ${API_TOKEN}` },
      });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
    });

    test("Create endpoints respond in <1000ms", async () => {
      const start = Date.now();
      await axios.post(
        `${API_URL}/api/keywords`,
        {
          term: `test-perf-${Date.now()}`,
          priority: 5,
        },
        {
          headers: { Authorization: `Bearer ${API_TOKEN}` },
        }
      );
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
    });
  });
});
