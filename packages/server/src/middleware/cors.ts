/**
 * CORS middleware configuration
 */

import cors, { CorsOptions } from "cors";

const DASHBOARD_URL = process.env.CORS_DASHBOARD_URL || "http://localhost:3002";

/**
 * Build list of allowed origins
 */
function getAllowedOrigins(): (string | RegExp)[] {
  const origins: (string | RegExp)[] = [
    DASHBOARD_URL,
    "http://localhost:3000", // Local dev dashboard
    "http://localhost:3002", // Local dev dashboard (webpack default)
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3002",
    "http://[::1]:3000", // IPv6 localhost
    "http://[::1]:3002", // IPv6 localhost
  ];

  // Allow Tailscale origins in development
  if (process.env.NODE_ENV !== "production") {
    origins.push(/\.ts\.net$/); // Tailscale domains
  }

  return origins;
}

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();

    // In development, allow requests with no origin (e.g., curl, Postman)
    // In production, require origin for security
    if (!origin) {
      if (process.env.NODE_ENV === "development") {
        return callback(null, true);
      } else {
        console.warn("CORS blocked: No origin header in production");
        return callback(new Error("Origin required in production"), false);
      }
    }

    // Check if origin matches allowed list
    const isAllowed = allowedOrigins.some((allowed) => {
      if (typeof allowed === "string") {
        return allowed === origin;
      }
      return allowed.test(origin);
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400, // 24 hours
};

export const corsMiddleware = cors(corsOptions);
