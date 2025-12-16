/**
 * CORS middleware configuration
 */

import cors, { CorsOptions } from "cors";

const DASHBOARD_URL = process.env.CORS_DASHBOARD_URL || "http://localhost:3000";

/**
 * Build list of allowed origins
 */
function getAllowedOrigins(): (string | RegExp)[] {
  const origins: (string | RegExp)[] = [
    DASHBOARD_URL,
    "http://localhost:3000", // Local dev dashboard
    "http://127.0.0.1:3000",
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

    // Allow requests with no origin (e.g., mobile apps, curl)
    if (!origin) {
      return callback(null, true);
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
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400, // 24 hours
};

export const corsMiddleware = cors(corsOptions);
