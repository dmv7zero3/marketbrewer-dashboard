/**
 * API request/response types for MarketBrewer SEO Platform
 */

// Standard API error response
export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

// Error codes
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "INSUFFICIENT_DATA"
  | "GENERATION_FAILED"
  | "JOB_ALREADY_CLAIMED"
  | "NO_PAGES"
  | "INTERNAL_ERROR";

// Generic API response wrapper
export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

// Pagination
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
