/**
 * SQLite database connection and helpers
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbPath = process.env.DATABASE_PATH || "./data/seo-platform.db";

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database connection
const db: Database.Database = new Database(dbPath);

// Enable foreign keys and WAL mode for better concurrency
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

/**
 * Run a query that modifies data (INSERT, UPDATE, DELETE)
 */
export function dbRun(sql: string, params: unknown[] = []): Database.RunResult {
  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

/**
 * Get a single row
 */
export function dbGet<T>(sql: string, params: unknown[] = []): T | undefined {
  const stmt = db.prepare(sql);
  return stmt.get(...params) as T | undefined;
}

/**
 * Get all matching rows
 */
export function dbAll<T>(sql: string, params: unknown[] = []): T[] {
  const stmt = db.prepare(sql);
  return stmt.all(...params) as T[];
}

/**
 * Execute raw SQL (for schema creation, etc.)
 */
export function dbExec(sql: string): void {
  db.exec(sql);
}

/**
 * Initialize database schema from migration file
 */
export function initializeDatabase(): void {
  const migrationPath = path.join(
    __dirname,
    "../../migrations/001_initial_schema.sql"
  );

  if (fs.existsSync(migrationPath)) {
    const schema = fs.readFileSync(migrationPath, "utf-8");
    db.exec(schema);
    console.log("Database schema initialized");
  } else {
    console.warn("Migration file not found:", migrationPath);
  }
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  db.close();
}

export default db;
