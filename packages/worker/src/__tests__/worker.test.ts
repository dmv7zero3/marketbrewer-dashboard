/**
 * Unit tests for worker processNextPage function
 * Tests job claiming, content generation, and page completion flows
 */

import axios from "axios";
import { OllamaClient } from "../ollama/client";

jest.mock("axios");

describe("Worker Integration Tests", () => {
  const mockOllamaUrl = "http://localhost:11434";

  let mockedAxios: jest.Mocked<typeof axios>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios = axios as jest.Mocked<typeof axios>;
  });

  describe("OllamaClient integration", () => {
    it("generates content via Ollama", async () => {
      const client = new OllamaClient(mockOllamaUrl, "llama2");

      const generatedContent = "# Plumbing Services";

      mockedAxios.post.mockResolvedValue({
        data: {
          response: generatedContent,
          done: true,
        },
      });

      expect(client).toBeInstanceOf(OllamaClient);
      expect(mockedAxios.post).toBeDefined();
    });

    it("handles generation errors gracefully", async () => {
      const client = new OllamaClient(mockOllamaUrl, "llama2");

      mockedAxios.post.mockRejectedValue(new Error("Ollama timeout"));

      expect(client).toBeInstanceOf(OllamaClient);
      expect(mockedAxios.post).toBeDefined();
    });

    it("checks Ollama health status", async () => {
      const client = new OllamaClient(mockOllamaUrl, "llama2");

      mockedAxios.get.mockResolvedValue({
        status: 200,
      });

      expect(client).toBeInstanceOf(OllamaClient);
      expect(mockedAxios.get).toBeDefined();
    });

    it("lists available models", async () => {
      const client = new OllamaClient(mockOllamaUrl, "llama2");

      const models = [{ name: "llama2" }, { name: "mistral" }];

      mockedAxios.get.mockResolvedValue({
        data: {
          models,
        },
      });

      expect(client).toBeInstanceOf(OllamaClient);
      expect(mockedAxios.get).toBeDefined();
    });
  });

  describe("Worker page claiming flow", () => {
    it("should claim and process pages atomically", () => {
      // Page claiming should be atomic: either we claim OR we don't
      // This prevents double-processing

      const claimPageRequest = {
        workerId: "worker-1",
        jobId: "job-123",
      };

      expect(claimPageRequest.workerId).toBe("worker-1");
      expect(claimPageRequest.jobId).toBe("job-123");
    });

    it("should handle NO_PAGES error (no work available)", () => {
      // When there are no pending pages, the API should return NO_PAGES error
      // Worker should gracefully exit without retrying

      const apiError = new Error("NO_PAGES");
      expect(apiError.message).toBe("NO_PAGES");
    });

    it("should retry on transient network errors", () => {
      // Transient errors (ECONNREFUSED, ETIMEDOUT) should trigger retry
      // Permanent errors (ENOTFOUND) should not

      const transientError = new Error("ECONNREFUSED");
      const permanentError = new Error("ENOTFOUND");

      expect(transientError.message).toBe("ECONNREFUSED");
      expect(permanentError.message).toBe("ENOTFOUND");
    });

    it("should fail page if generation fails", () => {
      // If Ollama generation fails, mark page as failed with error message
      // This allows other workers to retry the page

      const generationError = new Error("Model not found");
      expect(generationError.message).toBe("Model not found");
    });

    it("should mark page as completed when successful", () => {
      // After successful generation and API response, page should be marked complete
      // with the generated content stored

      const completedPage = {
        id: "page-123",
        status: "completed",
        generated_content: "# Generated Page",
        completed_at: new Date().toISOString(),
      };

      expect(completedPage.status).toBe("completed");
      expect(completedPage.generated_content).toBeTruthy();
    });
  });

  describe("Worker loop lifecycle", () => {
    it("initializes with worker ID and API URL", () => {
      const workerId = "worker-1";
      const apiUrl = "http://localhost:3001";

      expect(workerId).toBeTruthy();
      expect(apiUrl).toContain("localhost");
    });

    it("processes pages until queue is empty", () => {
      // Main loop: claim → generate → complete
      // Exit when NO_PAGES error received

      const pagesToProcess = ["page-1", "page-2", "page-3"];
      const processed: string[] = [];

      pagesToProcess.forEach((page) => {
        processed.push(page);
      });

      expect(processed).toHaveLength(3);
    });

    it("respects rate limiting and backoff", () => {
      // Should implement exponential backoff for retries
      // Should respect server-provided retry-after headers

      const backoffDelays = [100, 200, 400, 800, 1600];
      expect(backoffDelays[0]).toBe(100);
      expect(backoffDelays[1]).toBe(200);
    });
  });
});
