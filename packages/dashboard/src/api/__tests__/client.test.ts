/**
 * Unit tests for API client with retry logic
 */

import axios from "axios";
import { GOOGLE_TOKEN_STORAGE_KEY } from "../../constants/auth";

type RequestHandler = (config: any) => any;
type ResponseHandler = (response: any) => any;
type ResponseErrorHandler = (error: any) => any;

// Mock axios.get for health checks (before importing client)
jest.mock("axios", () => {
  const actualAxios = jest.requireActual("axios");
  const mockInstance: any = (config: any) => Promise.resolve({ config });
  mockInstance.request = jest.fn();
  mockInstance.get = jest.fn();
  mockInstance.post = jest.fn();
  mockInstance.put = jest.fn();
  mockInstance.delete = jest.fn();
  mockInstance.__requestHandler = null;
  mockInstance.__responseHandler = null;
  mockInstance.__responseErrorHandler = null;
  mockInstance.interceptors = {
    request: {
      use: jest.fn((onFulfilled: RequestHandler) => {
        mockInstance.__requestHandler = onFulfilled;
        return 0;
      }),
    },
    response: {
      use: jest.fn((onFulfilled: ResponseHandler, onRejected: ResponseErrorHandler) => {
        mockInstance.__responseHandler = onFulfilled;
        mockInstance.__responseErrorHandler = onRejected;
        return 0;
      }),
    },
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
const apiInstance = (mockedAxios.create as jest.Mock).mock.results[0]?.value;

describe("API Client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    localStorage.removeItem(GOOGLE_TOKEN_STORAGE_KEY);
    process.env.NODE_ENV = "test";
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

  it("adds Authorization header from localStorage in request interceptor", () => {
    process.env.NODE_ENV = "development";
    localStorage.setItem(GOOGLE_TOKEN_STORAGE_KEY, "token-123");

    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const config = { headers: {} } as any;

    expect(apiInstance?.__requestHandler).not.toBeNull();
    const nextConfig = apiInstance.__requestHandler(config);

    expect(nextConfig.headers.Authorization).toBe("Bearer token-123");
    consoleSpy.mockRestore();
  });

  it("marks server healthy on successful response", () => {
    expect(apiInstance?.__responseHandler).not.toBeNull();
    const response = { status: 200, config: { url: "/api" } };
    const result = apiInstance.__responseHandler(response);
    expect(result).toBe(response);
  });

  it("logs and rejects on HTTP error response", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(apiInstance?.__responseErrorHandler).not.toBeNull();

    await expect(
      apiInstance.__responseErrorHandler({
        config: {},
        response: { status: 400, data: { details: [{ field: "name" }] } },
      })
    ).rejects.toBeTruthy();

    consoleSpy.mockRestore();
  });

  it("logs and rejects on network error without response", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(apiInstance?.__responseErrorHandler).not.toBeNull();

    await expect(
      apiInstance.__responseErrorHandler({
        config: { _retryCount: 3 },
        code: "ECONNREFUSED",
        message: "Connection refused",
      })
    ).rejects.toBeTruthy();

    consoleSpy.mockRestore();
  });
});
