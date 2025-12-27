/**
 * Delete Protection Middleware
 *
 * Safeguards against accidental deletion of business profile data.
 *
 * Protection levels:
 * 1. Soft delete by default (sets _deleted flag instead of removing)
 * 2. Confirmation header required for destructive operations
 * 3. Backup creation before any delete
 * 4. Rate limiting on delete operations
 */

import { Request, Response, NextFunction } from "express";
import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";

// Required header for delete operations
const DELETE_CONFIRMATION_HEADER = "X-Confirm-Delete";
const DELETE_CONFIRMATION_VALUE = "I-UNDERSTAND-THIS-IS-DESTRUCTIVE";

// Backup directory
const BACKUP_DIR = path.join(__dirname, "../../data/backups");

// Rate limiting: max deletes per hour per entity type
const DELETE_RATE_LIMIT = 10;
const deleteCounters: Map<string, { count: number; resetAt: number }> = new Map();

/**
 * Ensure backup directory exists
 */
function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Create a backup of entity before deletion
 */
export function createBackup(
  entityType: string,
  entityId: string,
  data: Record<string, unknown>
): string {
  ensureBackupDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${entityType}_${entityId}_${timestamp}.json`;
  const filepath = path.join(BACKUP_DIR, filename);

  const backup = {
    entityType,
    entityId,
    deletedAt: new Date().toISOString(),
    data,
  };

  fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
  console.log(`Backup created: ${filepath}`);

  return filepath;
}

/**
 * Check rate limit for delete operations
 */
function checkDeleteRateLimit(entityType: string): boolean {
  const now = Date.now();
  const key = entityType;

  const counter = deleteCounters.get(key);

  if (!counter || counter.resetAt < now) {
    // Reset counter
    deleteCounters.set(key, {
      count: 1,
      resetAt: now + 60 * 60 * 1000, // 1 hour
    });
    return true;
  }

  if (counter.count >= DELETE_RATE_LIMIT) {
    return false;
  }

  counter.count++;
  return true;
}

/**
 * Middleware to protect delete operations
 *
 * Requires X-Confirm-Delete header with specific value
 */
export function requireDeleteConfirmation(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Only apply to DELETE requests
  if (req.method !== "DELETE") {
    next();
    return;
  }

  const confirmation = req.headers[DELETE_CONFIRMATION_HEADER.toLowerCase()];

  if (confirmation !== DELETE_CONFIRMATION_VALUE) {
    res.status(400).json({
      error: "Delete confirmation required",
      message: `Include header '${DELETE_CONFIRMATION_HEADER}: ${DELETE_CONFIRMATION_VALUE}' to confirm deletion`,
      hint: "This safeguard prevents accidental data loss",
    });
    return;
  }

  next();
}

/**
 * Middleware to rate limit delete operations
 */
export function rateLimitDeletes(entityType: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== "DELETE") {
      next();
      return;
    }

    if (!checkDeleteRateLimit(entityType)) {
      res.status(429).json({
        error: "Delete rate limit exceeded",
        message: `Maximum ${DELETE_RATE_LIMIT} ${entityType} deletions per hour`,
        retryAfter: "1 hour",
      });
      return;
    }

    next();
  };
}

/**
 * Helper to perform soft delete with backup
 */
export async function performSoftDelete(
  db: Database.Database,
  table: string,
  idColumn: string,
  entityId: string,
  additionalConditions?: { column: string; value: string }[]
): Promise<{ success: boolean; backupPath?: string; error?: string }> {
  try {
    // Build WHERE clause
    let whereClause = `${idColumn} = ?`;
    const params: string[] = [entityId];

    if (additionalConditions) {
      for (const cond of additionalConditions) {
        whereClause += ` AND ${cond.column} = ?`;
        params.push(cond.value);
      }
    }

    // Get current data for backup
    const selectStmt = db.prepare(`SELECT * FROM ${table} WHERE ${whereClause}`);
    const existing = selectStmt.get(...params) as Record<string, unknown> | undefined;

    if (!existing) {
      return { success: false, error: "Entity not found" };
    }

    // Create backup
    const backupPath = createBackup(table, entityId, existing);

    // For tables with _deleted column, soft delete
    // For others, actually delete but with backup
    const tableInfo = db
      .prepare(`PRAGMA table_info(${table})`)
      .all() as Array<{ name: string }>;
    const hasDeletedColumn = tableInfo.some((col) => col.name === "_deleted");

    if (hasDeletedColumn) {
      db.prepare(`UPDATE ${table} SET _deleted = 1 WHERE ${whereClause}`).run(...params);
    } else {
      db.prepare(`DELETE FROM ${table} WHERE ${whereClause}`).run(...params);
    }

    return { success: true, backupPath };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Restore from backup
 */
export function restoreFromBackup(
  db: Database.Database,
  backupPath: string
): { success: boolean; error?: string } {
  try {
    if (!fs.existsSync(backupPath)) {
      return { success: false, error: "Backup file not found" };
    }

    const backup = JSON.parse(fs.readFileSync(backupPath, "utf-8"));
    const { entityType: table, data } = backup;

    // Check if entity exists (might be soft-deleted)
    const idColumn = Object.keys(data).find((k) => k === "id" || k.endsWith("_id")) || "id";
    const existingStmt = db.prepare(`SELECT * FROM ${table} WHERE ${idColumn} = ?`);
    const existing = existingStmt.get(data[idColumn]);

    if (existing) {
      // Update existing (restore soft-deleted)
      const columns = Object.keys(data).filter((k) => k !== idColumn);
      const setClause = columns.map((c) => `${c} = ?`).join(", ");
      const values = columns.map((c) => data[c]);

      db.prepare(`UPDATE ${table} SET ${setClause}, _deleted = 0 WHERE ${idColumn} = ?`).run(
        ...values,
        data[idColumn]
      );
    } else {
      // Insert new
      const columns = Object.keys(data);
      const placeholders = columns.map(() => "?").join(", ");
      const values = columns.map((c) => data[c]);

      db.prepare(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`).run(
        ...values
      );
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * List available backups
 */
export function listBackups(entityType?: string): Array<{
  filename: string;
  entityType: string;
  entityId: string;
  deletedAt: string;
  path: string;
}> {
  ensureBackupDir();

  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".json"));
  const backups: Array<{
    filename: string;
    entityType: string;
    entityId: string;
    deletedAt: string;
    path: string;
  }> = [];

  for (const filename of files) {
    try {
      const filepath = path.join(BACKUP_DIR, filename);
      const data = JSON.parse(fs.readFileSync(filepath, "utf-8"));

      if (!entityType || data.entityType === entityType) {
        backups.push({
          filename,
          entityType: data.entityType,
          entityId: data.entityId,
          deletedAt: data.deletedAt,
          path: filepath,
        });
      }
    } catch {
      // Skip invalid backup files
    }
  }

  return backups.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}

/**
 * Clean up old backups (keep last N days)
 */
export function cleanupOldBackups(retentionDays: number = 30): number {
  ensureBackupDir();

  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".json"));
  let deleted = 0;

  for (const filename of files) {
    const filepath = path.join(BACKUP_DIR, filename);
    const stats = fs.statSync(filepath);

    if (stats.mtimeMs < cutoff) {
      fs.unlinkSync(filepath);
      deleted++;
    }
  }

  console.log(`Cleaned up ${deleted} old backups`);
  return deleted;
}
