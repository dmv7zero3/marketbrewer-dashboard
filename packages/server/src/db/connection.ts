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
  const migrationsDir = path.join(__dirname, "../../migrations");

  // Track applied migrations so we don't re-run non-idempotent ALTERs.
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  if (!fs.existsSync(migrationsDir)) {
    console.warn("Migrations directory not found:", migrationsDir);
    return;
  }

  const applied = new Set(
    (
      db.prepare("SELECT filename FROM _migrations").all() as Array<{
        filename: string;
      }>
    ).map((r) => r.filename)
  );

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => /^\d+_.*\.sql$/.test(f))
    .sort((a, b) => a.localeCompare(b));

  for (const filename of migrationFiles) {
    if (applied.has(filename)) continue;

    const fullPath = path.join(migrationsDir, filename);
    const sql = fs.readFileSync(fullPath, "utf-8");

    const tx = db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO _migrations (filename) VALUES (?)").run(filename);
    });

    try {
      tx();
      console.log(`Applied migration: ${filename}`);
    } catch (error) {
      // If a migration was applied manually earlier, we can safely skip duplicate-column ALTERs.
      const message = error instanceof Error ? error.message : String(error);
      if (/duplicate column name/i.test(message)) {
        db.prepare(
          "INSERT OR IGNORE INTO _migrations (filename) VALUES (?)"
        ).run(filename);
        console.warn(
          `Skipping duplicate-column migration (already applied?): ${filename}`
        );
        continue;
      }
      console.error(`Failed applying migration: ${filename}`);
      throw error;
    }
  }
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  db.close();
}

/**
 * Get the database instance
 */
export function getDatabase(): Database.Database {
  return db;
}

export default db;
