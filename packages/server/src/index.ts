/**
 * MarketBrewer SEO Platform - API Server
 * 
 * Entry point for Express REST API with SQLite database
 */

import 'dotenv/config';
import express from 'express';
import { initializeDatabase } from './db/connection';
import { 
  authMiddleware, 
  corsMiddleware, 
  errorHandler, 
  notFoundHandler 
} from './middleware';
import routes from './routes';

const app = express();

const HOST = process.env.API_HOST || '0.0.0.0';
const PORT = parseInt(process.env.API_PORT || '3001', 10);

// Middleware
app.use(express.json());
app.use(corsMiddleware);
app.use(authMiddleware);

// Health check (no auth required - handled in middleware)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API routes
app.use('/api', routes);

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
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

start();
