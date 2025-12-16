/**
 * Global error handler middleware
 */

import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

/**
 * Custom error class with status code
 */
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * Global error handler
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation error",
      code: "VALIDATION_ERROR",
      details: err.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    } as ApiError);
    return;
  }

  // Handle custom HTTP errors
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details,
    } as ApiError);
    return;
  }

  // Handle CORS errors
  if (err.message === "Not allowed by CORS") {
    res.status(403).json({
      error: "CORS policy violation",
      code: "FORBIDDEN",
    } as ApiError);
    return;
  }

  // Handle unknown errors
  res.status(500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
    code: "INTERNAL_ERROR",
  } as ApiError);
}

/**
 * 404 handler for unknown routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.path}`,
    code: "NOT_FOUND",
  } as ApiError);
}
