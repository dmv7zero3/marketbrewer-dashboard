import axios, { AxiosInstance } from "axios";
import { GOOGLE_TOKEN_STORAGE_KEY } from "../constants/auth";

const OPENCLAW_API_URL = process.env.REACT_APP_OPENCLAW_API_URL || "";
const OPENCLAW_API_TOKEN = process.env.REACT_APP_OPENCLAW_API_TOKEN || "";

/** Axios instance configured for the Openclaw API. */
export const openclawClient: AxiosInstance = axios.create({
  baseURL: OPENCLAW_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

/**
 * Resolve the auth token for Openclaw API calls.
 * Prefers a stored Google ID token, falls back to REACT_APP_OPENCLAW_API_TOKEN.
 */
function getGoogleToken(): string {
  if (typeof window !== "undefined") {
    const storedToken = localStorage.getItem(GOOGLE_TOKEN_STORAGE_KEY);
    if (storedToken) {
      return storedToken;
    }
  }
  return OPENCLAW_API_TOKEN;
}

openclawClient.interceptors.request.use((config) => {
  const authToken = getGoogleToken();
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

/** Return the configured base URL for Openclaw API calls. */
export function getOpenclawBaseUrl(): string {
  return OPENCLAW_API_URL;
}

export default openclawClient;
