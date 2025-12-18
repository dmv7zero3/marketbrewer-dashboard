/**
 * API client for dashboard
 */

import axios, { AxiosInstance } from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";
const API_TOKEN = process.env.REACT_APP_API_TOKEN || "";

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    Authorization: `Bearer ${API_TOKEN}`,
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Request interceptor for logging (development only)
apiClient.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${
          config.url
        }`
      );
      console.log(`[API Request] Headers:`, config.headers);
    }
    return config;
  },
  (error) => {
    console.error("[API Request Error]", error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`[API Response] ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    // Network error (server not reachable)
    if (error.code === "ERR_NETWORK" || error.code === "ECONNREFUSED") {
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
      if (error.response.data?.details) {
        console.error(
          "[API Error] Validation details:",
          error.response.data.details
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
