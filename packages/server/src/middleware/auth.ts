/**
 * Authentication middleware - Bearer token validation
 */

import { Request, Response, NextFunction } from "express";

const API_TOKEN = process.env.API_TOKEN;

export interface AuthenticatedRequest extends Request {
  token?: string;
}

/**
 * Middleware to validate Bearer token
 * Skips validation for /health endpoint
 */
export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Skip auth for health check
  if (req.path === "/health" || req.path === "/api/health") {
    return next();
  }

  // Check for token in environment
  if (!API_TOKEN) {
    console.warn("API_TOKEN not set in environment");
    res.status(500).json({
      error: "Server configuration error",
      code: "INTERNAL_ERROR",
    });
    return;
  }

  // Get token from Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      error: "Missing Authorization header",
      code: "UNAUTHORIZED",
    });
    return;
  }

  if (!authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Invalid Authorization header format. Use: Bearer <token>",
      code: "UNAUTHORIZED",
    });
    return;
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix

  if (token !== API_TOKEN) {
    res.status(401).json({
      error: "Invalid API token",
      code: "UNAUTHORIZED",
    });
    return;
  }

  // Store token for later use if needed
  req.token = token;
  next();
}
