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
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error(
        `[API Error] ${error.response.status}:`,
        error.response.data
      );
    } else {
      console.error("[API Error]", error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
