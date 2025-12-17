/**
 * Job pages routes for worker claim/complete operations
 */

import { Router, Request, Response, NextFunction } from "express";
import db, { dbRun, dbGet, dbAll } from "../db/connection";
import { ClaimPageSchema, CompletePageSchema } from "@marketbrewer/shared";
import type { JobPage, GenerationJob } from "@marketbrewer/shared";
import { HttpError } from "../middleware/error-handler";

const router = Router();

const MAX_ATTEMPTS = 3;

/**
 * POST /jobs/:jobId/claim - Atomically claim a page for processing
 *
 * Uses SQLite's UPDATE...RETURNING for atomic claim operation
 */
router.post(
  "/:jobId/claim",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { jobId } = req.params;
      const data = ClaimPageSchema.parse(req.body);
      const now = new Date().toISOString();

      // Verify job exists and is not completed/cancelled
      const job = dbGet<GenerationJob>(
        "SELECT * FROM generation_jobs WHERE id = ?",
        [jobId]
      );

      if (!job) {
        throw new HttpError(404, "Job not found", "NOT_FOUND");
      }

      if (job.status === "completed" || job.status === "cancelled") {
        throw new HttpError(
          409,
          "Job is already completed or cancelled",
          "JOB_ALREADY_CLAIMED"
        );
      }

      // Update job status to processing if it's pending
      if (job.status === "pending") {
        dbRun(
          `UPDATE generation_jobs SET status = 'processing', started_at = ? WHERE id = ?`,
          [now, jobId]
        );
      }

      // Atomic claim: Single UPDATE...RETURNING for true atomicity (P0 fix)
      // This prevents race conditions where two workers claim the same page
      const claimStmt = db.prepare(`
      UPDATE job_pages 
      SET 
        status = 'processing',
        worker_id = @worker_id,
        claimed_at = @claimed_at,
        attempts = attempts + 1
      WHERE id = (
        SELECT id FROM job_pages 
        WHERE job_id = @job_id 
          AND status = 'queued'
          AND attempts < @max_attempts
        ORDER BY created_at ASC
        LIMIT 1
      )
      RETURNING *
    `);

      const claimedPage = claimStmt.get({
        worker_id: data.worker_id,
        claimed_at: now,
        job_id: jobId,
        max_attempts: MAX_ATTEMPTS,
      }) as JobPage | undefined;

      if (!claimedPage) {
        // No pages available to claim
        res.status(409).json({
          error: "No pages available to claim",
          code: "NO_PAGES",
        });
        return;
      }

      res.json({ page: claimedPage });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /jobs/:jobId/pages/:pageId/complete - Mark page as completed or failed
 */
router.put(
  "/:jobId/pages/:pageId/complete",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { jobId, pageId } = req.params;
      const data = CompletePageSchema.parse(req.body);
      const now = new Date().toISOString();

      // Verify page exists and belongs to job
      const page = dbGet<JobPage>(
        "SELECT * FROM job_pages WHERE id = ? AND job_id = ?",
        [pageId, jobId]
      );

      if (!page) {
        throw new HttpError(404, "Page not found", "NOT_FOUND");
      }

      if (page.status !== "processing") {
        throw new HttpError(
          409,
          "Page is not in processing state",
          "JOB_ALREADY_CLAIMED"
        );
      }

      // Update page status
      if (data.status === "completed") {
        dbRun(
          `UPDATE job_pages 
         SET status = 'completed', 
             completed_at = ?, 
             content = ?,
             section_count = ?,
             model_name = ?,
             prompt_version = ?,
             generation_duration_ms = ?,
             word_count = ?
         WHERE id = ?`,
          [
            now,
            data.content ?? null,
            data.section_count ?? 3,
            data.model_name ?? null,
            data.prompt_version ?? null,
            data.generation_duration_ms ?? null,
            data.word_count ?? null,
            pageId,
          ]
        );

        // Update job completed count
        dbRun(
          `UPDATE generation_jobs SET completed_pages = completed_pages + 1 WHERE id = ?`,
          [jobId]
        );
      } else {
        // Failed
        dbRun(
          `UPDATE job_pages 
         SET status = 'failed', 
             completed_at = ?, 
             error_message = ?
         WHERE id = ?`,
          [now, data.error_message ?? "Unknown error", pageId]
        );

        // Update job failed count
        dbRun(
          `UPDATE generation_jobs SET failed_pages = failed_pages + 1 WHERE id = ?`,
          [jobId]
        );
      }

      // Check if job is complete
      const job = dbGet<GenerationJob>(
        "SELECT * FROM generation_jobs WHERE id = ?",
        [jobId]
      );

      if (job && job.completed_pages + job.failed_pages >= job.total_pages) {
        // Job is complete
        const finalStatus =
          job.failed_pages === job.total_pages ? "failed" : "completed";
        dbRun(
          `UPDATE generation_jobs SET status = ?, completed_at = ? WHERE id = ?`,
          [finalStatus, now, jobId]
        );
      }

      const updatedPage = dbGet<JobPage>(
        "SELECT * FROM job_pages WHERE id = ?",
        [pageId]
      );
      res.json({ page: updatedPage });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /jobs/:jobId/pages - List pages for a job
 */
router.get(
  "/:jobId/pages",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { jobId } = req.params;
      const status = req.query.status as string | undefined;

      let query = "SELECT * FROM job_pages WHERE job_id = ?";
      const params: unknown[] = [jobId];

      if (status) {
        query += " AND status = ?";
        params.push(status);
      }

      query += " ORDER BY created_at ASC";

      const pages = dbAll<JobPage>(query, params);
      res.json({ pages });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /jobs/:jobId/release-stale - Release pages stuck in processing
 */
router.post(
  "/:jobId/release-stale",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { jobId } = req.params;
      const staleMinutes = parseInt(req.query.minutes as string) || 5;

      const result = dbRun(
        `UPDATE job_pages
       SET status = 'queued', worker_id = NULL, claimed_at = NULL
       WHERE job_id = ? 
         AND status = 'processing'
         AND claimed_at < datetime('now', '-' || ? || ' minutes')`,
        [jobId, staleMinutes]
      );

      res.json({
        released_count: result.changes,
        stale_threshold_minutes: staleMinutes,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
