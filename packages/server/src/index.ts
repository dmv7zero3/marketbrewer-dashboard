/**
 * MarketBrewer SEO Platform - API Server
 *
 * Entry point for Express REST API with SQLite database
 */

import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { initializeDatabase } from "./db/connection";
import {
  authMiddleware,
  corsMiddleware,
  errorHandler,
  notFoundHandler,
} from "./middleware";
import routes from "./routes";

const app = express();

const HOST = process.env.API_HOST || "0.0.0.0";
const PORT = parseInt(process.env.API_PORT || "3001", 10);

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: {
    error: "Too many requests",
    code: "RATE_LIMITED",
    retryAfter: 60,
  },
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  // Skip rate limiting for health checks
  skip: (req) => req.path === "/health" || req.path === "/api/health",
});

// Security middleware
app.use(helmet()); // Security headers
app.use(express.json({ limit: "1mb" })); // Request size limit to prevent DoS
if (process.env.NODE_ENV === "production") {
  app.use(limiter); // Rate limiting
}

// Application middleware
app.use(corsMiddleware);
app.use(authMiddleware);

// Health check (no auth required - handled in middleware)
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// API routes
app.use("/api", routes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Initialize database and start server
async function start(): Promise<void> {
  try {
    // Initialize database schema
    initializeDatabase();

    app.listen(PORT, HOST, () => {
      console.log(`🚀 Server running at http://${HOST}:${PORT}`);
      console.log(`   Health check: http://${HOST}:${PORT}/health`);
      console.log(`   API base: http://${HOST}:${PORT}/api`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nShutting down gracefully...");
  process.exit(0);
});

start();
