/**
 * API client for dashboard with retry logic and health monitoring
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from "axios";
import { GOOGLE_TOKEN_STORAGE_KEY } from "../constants/auth";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";
const API_TOKEN = process.env.REACT_APP_API_TOKEN || "";

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

// Extended config type to track retries
interface RetryConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
}

// Server health state
let serverHealthy = true;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL_MS = 30000;

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

export function getAuthToken(): string {
  if (typeof window !== "undefined") {
    const storedToken = localStorage.getItem(GOOGLE_TOKEN_STORAGE_KEY);
    if (storedToken) {
      return storedToken;
    }
  }
  return API_TOKEN;
}

export function getApiBaseUrl(): string {
  return API_URL;
}

/**
 * Check if the server is reachable
 */
export async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await axios.get(`${API_URL}/health`, { timeout: 5000 });
    serverHealthy = response.status === 200;
    lastHealthCheck = Date.now();
    return serverHealthy;
  } catch {
    serverHealthy = false;
    lastHealthCheck = Date.now();
    return false;
  }
}

/**
 * Get current server health status
 */
export function isServerHealthy(): boolean {
  // If we haven't checked recently, assume healthy and let the request determine
  if (Date.now() - lastHealthCheck > HEALTH_CHECK_INTERVAL_MS) {
    return true;
  }
  return serverHealthy;
}

/**
 * Wait for server to become available
 */
export async function waitForServer(maxWaitMs = 30000): Promise<boolean> {
  const startTime = Date.now();
  const checkInterval = 2000;

  while (Date.now() - startTime < maxWaitMs) {
    const healthy = await checkServerHealth();
    if (healthy) {
      console.log('[API] Server is available');
      return true;
    }
    console.log(`[API] Waiting for server... (${Math.round((Date.now() - startTime) / 1000)}s)`);
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  console.error('[API] Server did not become available within timeout');
  return false;
}

/**
 * Delay helper for retry logic
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Request interceptor for logging (development only)
apiClient.interceptors.request.use(
  (config) => {
    const authToken = getAuthToken();
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    if (process.env.NODE_ENV === "development") {
      const safeHeaders = { ...config.headers } as Record<string, unknown>;
      if (safeHeaders.Authorization) {
        safeHeaders.Authorization = "Bearer ***";
      }
      console.log(
        `[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${
          config.url
        }`
      );
      console.log(`[API Request] Headers:`, safeHeaders);
    }
    return config;
  },
  (error) => {
    console.error("[API Request Error]", error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling with retry logic
apiClient.interceptors.response.use(
  (response) => {
    // Mark server as healthy on successful response
    serverHealthy = true;
    lastHealthCheck = Date.now();

    if (process.env.NODE_ENV === "development") {
      console.log(`[API Response] ${response.status} ${response.config.url}`);
    }
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;

    if (!config) {
      return Promise.reject(error);
    }

    // Initialize retry count
    config._retryCount = config._retryCount || 0;

    // Check if we should retry
    const shouldRetry =
      config._retryCount < MAX_RETRIES &&
      (
        // Network errors (server not reachable)
        error.code === "ERR_NETWORK" ||
        error.code === "ECONNREFUSED" ||
        error.code === "ECONNRESET" ||
        error.code === "ETIMEDOUT" ||
        // Retryable HTTP status codes
        (error.response && RETRYABLE_STATUS_CODES.includes(error.response.status))
      );

    if (shouldRetry) {
      config._retryCount += 1;
      const retryDelay = RETRY_DELAY_MS * config._retryCount; // Exponential backoff

      console.log(
        `[API Retry] Attempt ${config._retryCount}/${MAX_RETRIES} for ${config.url} (waiting ${retryDelay}ms)`
      );

      await delay(retryDelay);
      return apiClient(config);
    }

    // Mark server as unhealthy on network errors
    if (error.code === "ERR_NETWORK" || error.code === "ECONNREFUSED") {
      serverHealthy = false;
      lastHealthCheck = Date.now();

      console.error(
        `[API Error] Server not reachable at ${API_URL}`,
        "\n→ Is the server running? Start it with: npm run dev:server"
      );
    }
    // HTTP error response
    else if (error.response) {
      console.error(
        `[API Error] ${error.response.status}:`,
        error.response.data
      );
      // Log validation details if present
      const data = error.response.data as Record<string, unknown> | undefined;
      if (data?.details) {
        console.error(
          "[API Error] Validation details:",
          data.details
        );
      }
    }
    // Other errors
    else {
      console.error("[API Error]", error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
