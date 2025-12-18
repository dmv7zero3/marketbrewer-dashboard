/**
 * Generation jobs routes
 */

import { Router, Request, Response, NextFunction } from "express";
import { dbRun, dbGet, dbAll } from "../db/connection";
import db from "../db/connection";
import {
  CreateGenerationJobSchema,
  generateId,
  toCityStateSlug,
} from "@marketbrewer/shared";
import type {
  GenerationJob,
  JobWithCounts,
  Business,
  Keyword,
  ServiceArea,
  Questionnaire,
} from "@marketbrewer/shared";
import { HttpError } from "../middleware/error-handler";

const router = Router();

/**
 * POST /businesses/:id/generate - Create generation job
 */
router.post(
  "/:id/generate",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = req.params.id;

      // Verify business exists
      const business = dbGet<Business>(
        "SELECT * FROM businesses WHERE id = ?",
        [businessId]
      );
      if (!business) {
        throw new HttpError(404, "Business not found", "NOT_FOUND");
      }

      // Check questionnaire completeness
      const questionnaire = dbGet<Questionnaire>(
        "SELECT * FROM questionnaires WHERE business_id = ?",
        [businessId]
      );

      if (!questionnaire || questionnaire.completeness_score < 40) {
        throw new HttpError(
          422,
          "Questionnaire must be at least 40% complete",
          "INSUFFICIENT_DATA",
          {
            current_score: questionnaire?.completeness_score ?? 0,
            required_score: 40,
          }
        );
      }

      const data = CreateGenerationJobSchema.parse(req.body);

      // Get keywords and service areas for the business
      const keywords = dbAll<Keyword>(
        "SELECT * FROM keywords WHERE business_id = ? ORDER BY priority DESC",
        [businessId]
      );

      const serviceAreas = dbAll<ServiceArea>(
        "SELECT * FROM service_areas WHERE business_id = ? ORDER BY priority DESC",
        [businessId]
      );

      if (serviceAreas.length === 0) {
        throw new HttpError(
          422,
          "At least one service area is required",
          "INSUFFICIENT_DATA"
        );
      }

      if (data.page_type === "location-keyword" && keywords.length === 0) {
        throw new HttpError(
          422,
          "At least one keyword is required for location-keyword pages",
          "INSUFFICIENT_DATA"
        );
      }

      // Generate job pages based on page type
      const jobId = generateId();
      const now = new Date().toISOString();
      const jobPages: Array<{
        id: string;
        job_id: string;
        business_id: string;
        keyword_slug: string | null;
        service_area_slug: string;
        url_path: string;
        status: string;
        created_at: string;
      }> = [];

      if (data.page_type === "location-keyword") {
        // location-keyword: Business location city × keyword
        // Uses actual store locations (NOT service areas)
        const locations = dbAll<{ city: string; state: string }>(
          "SELECT DISTINCT city, state FROM locations WHERE business_id = ? AND status = 'active' AND is_headquarters = 0 ORDER BY priority DESC",
          [businessId]
        );

        for (const keyword of keywords) {
          for (const location of locations) {
            const locationSlug = toCityStateSlug(location.city, location.state);
            const urlPath = `/${keyword.slug}/${locationSlug}`;

            jobPages.push({
              id: generateId(),
              job_id: jobId,
              business_id: businessId,
              keyword_slug: keyword.slug,
              service_area_slug: locationSlug,
              url_path: urlPath,
              status: "queued",
              created_at: now,
            });
          }
        }
      } else if (data.page_type === "service-area") {
        // service-area: Nearby city (no store) × keyword
        // Uses service areas (cities around stores, not store cities themselves)
        for (const keyword of keywords) {
          for (const area of serviceAreas) {
            const serviceAreaSlug = toCityStateSlug(area.city, area.state);
            const urlPath = `/${keyword.slug}/${serviceAreaSlug}`;

            jobPages.push({
              id: generateId(),
              job_id: jobId,
              business_id: businessId,
              keyword_slug: keyword.slug,
              service_area_slug: serviceAreaSlug,
              url_path: urlPath,
              status: "queued",
              created_at: now,
            });
          }
        }
      }

      const totalPages = jobPages.length;

      // Insert job
      dbRun(
        `INSERT INTO generation_jobs (id, business_id, status, page_type, total_pages, completed_pages, failed_pages, created_at, started_at, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          jobId,
          businessId,
          "pending",
          data.page_type,
          totalPages,
          0,
          0,
          now,
          null,
          null,
        ]
      );

      // Batch insert job pages (10x faster for large jobs)
      // Using named parameters for maintainability (P0 fix)
      const insertStmt = db.prepare(
        `INSERT INTO job_pages (
          id, job_id, business_id, keyword_slug, service_area_slug, 
          url_path, status, worker_id, attempts, claimed_at, 
          completed_at, content, error_message, section_count, 
          model_name, prompt_version, generation_duration_ms, 
          word_count, created_at
        ) VALUES (
          @id, @job_id, @business_id, @keyword_slug, @service_area_slug,
          @url_path, @status, @worker_id, @attempts, @claimed_at,
          @completed_at, @content, @error_message, @section_count,
          @model_name, @prompt_version, @generation_duration_ms,
          @word_count, @created_at
        )`
      );

      const batchInsert = db.transaction(
        (
          pages: Array<{
            id: string;
            job_id: string;
            business_id: string;
            keyword_slug: string | null;
            service_area_slug: string;
            url_path: string;
            status: string;
            created_at: string;
          }>
        ) => {
          for (const page of pages) {
            insertStmt.run({
              id: page.id,
              job_id: page.job_id,
              business_id: page.business_id,
              keyword_slug: page.keyword_slug,
              service_area_slug: page.service_area_slug,
              url_path: page.url_path,
              status: "queued",
              worker_id: null,
              attempts: 0,
              claimed_at: null,
              completed_at: null,
              content: null,
              error_message: null,
              section_count: 3,
              model_name: null,
              prompt_version: null,
              generation_duration_ms: null,
              word_count: null,
              created_at: page.created_at,
            });
          }
        }
      );

      batchInsert(jobPages);

      const job = dbGet<GenerationJob>(
        "SELECT * FROM generation_jobs WHERE id = ?",
        [jobId]
      );

      res.status(201).json({
        job,
        total_pages_created: totalPages,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /businesses/:id/jobs - List jobs for business
 */
router.get(
  "/:id/jobs",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = req.params.id;

      const jobs = dbAll<GenerationJob>(
        "SELECT * FROM generation_jobs WHERE business_id = ? ORDER BY created_at DESC",
        [businessId]
      );

      res.json({ jobs });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /businesses/:id/jobs/:jobId - Get job status with counts
 */
router.get(
  "/:id/jobs/:jobId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: businessId, jobId } = req.params;

      const job = dbGet<GenerationJob>(
        "SELECT * FROM generation_jobs WHERE id = ? AND business_id = ?",
        [jobId, businessId]
      );

      if (!job) {
        throw new HttpError(404, "Job not found", "NOT_FOUND");
      }

      // Get page counts by status
      const counts = dbAll<{ status: string; count: number }>(
        `SELECT status, COUNT(*) as count FROM job_pages WHERE job_id = ? GROUP BY status`,
        [jobId]
      );

      const statusCounts = {
        queued: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      };

      for (const row of counts) {
        if (row.status in statusCounts) {
          statusCounts[row.status as keyof typeof statusCounts] = row.count;
        }
      }

      const result: JobWithCounts = {
        ...job,
        queued_count: statusCounts.queued,
        processing_count: statusCounts.processing,
        completed_count: statusCounts.completed,
        failed_count: statusCounts.failed,
      };

      res.json({ job: result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
