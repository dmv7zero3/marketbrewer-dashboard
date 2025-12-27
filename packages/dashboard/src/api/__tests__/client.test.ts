/**
 * Unit tests for API client with retry logic
 */

import axios from "axios";

// Mock axios.get for health checks (before importing client)
jest.mock("axios", () => {
  const actualAxios = jest.requireActual("axios");
  const mockInstance = {
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    get: jest.fn(),
    post: jest.fn(),
  };
  return {
    ...actualAxios,
    create: jest.fn(() => mockInstance),
    get: jest.fn(),
  };
});

// Import after mock setup
import {
  checkServerHealth,
  isServerHealthy,
  waitForServer,
} from "../client";

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("API Client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("checkServerHealth", () => {
    it("returns true when server responds with 200", async () => {
      mockedAxios.get.mockResolvedValueOnce({ status: 200 });

      const result = await checkServerHealth();

      expect(result).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("/health"),
        { timeout: 5000 }
      );
    });

    it("returns false when server is unreachable", async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error("ECONNREFUSED"));

      const result = await checkServerHealth();

      expect(result).toBe(false);
    });

    it("returns false when server returns non-200", async () => {
      mockedAxios.get.mockResolvedValueOnce({ status: 503 });

      const result = await checkServerHealth();

      expect(result).toBe(false);
    });
  });

  describe("isServerHealthy", () => {
    it("returns true if no recent health check (assumes healthy)", async () => {
      // Reset internal state by forcing a health check failure long ago
      mockedAxios.get.mockRejectedValueOnce(new Error("ECONNREFUSED"));
      await checkServerHealth();

      // Advance time past the health check interval
      jest.advanceTimersByTime(60000);

      // Should return true since check is stale
      const result = isServerHealthy();
      expect(result).toBe(true);
    });

    it("returns cached value if recent health check", async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error("ECONNREFUSED"));
      await checkServerHealth();

      // Don't advance time - check is still recent
      const result = isServerHealthy();
      expect(result).toBe(false);
    });
  });

  describe("waitForServer", () => {
    it("returns true immediately if server is healthy", async () => {
      mockedAxios.get.mockResolvedValue({ status: 200 });

      const promise = waitForServer(10000);
      await jest.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(result).toBe(true);
    });

    it("retries until server becomes available", async () => {
      // First two calls fail, third succeeds
      mockedAxios.get
        .mockRejectedValueOnce(new Error("ECONNREFUSED"))
        .mockRejectedValueOnce(new Error("ECONNREFUSED"))
        .mockResolvedValueOnce({ status: 200 });

      const promise = waitForServer(10000);

      // Advance through retries
      await jest.advanceTimersByTimeAsync(2000);
      await jest.advanceTimersByTimeAsync(2000);
      await jest.advanceTimersByTimeAsync(2000);

      const result = await promise;
      expect(result).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });

    it("returns false if server never becomes available within timeout", async () => {
      mockedAxios.get.mockRejectedValue(new Error("ECONNREFUSED"));

      const promise = waitForServer(5000);

      // Advance past the timeout
      await jest.advanceTimersByTimeAsync(6000);

      const result = await promise;
      expect(result).toBe(false);
    });
  });
});

describe("API Client Configuration", () => {
  it("exports health check functions", () => {
    expect(typeof checkServerHealth).toBe("function");
    expect(typeof isServerHealthy).toBe("function");
    expect(typeof waitForServer).toBe("function");
  });
});
