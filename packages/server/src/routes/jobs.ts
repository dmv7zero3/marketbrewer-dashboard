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
  QuestionnaireDataStructure,
  ServiceOffering,
} from "@marketbrewer/shared";
import { HttpError } from "../middleware/error-handler";
import { toSlug } from "@marketbrewer/shared";

const router = Router();

/**
 * Helper to get services/menu items from questionnaire
 */
function getServicesFromQuestionnaire(questionnaire: Questionnaire): ServiceOffering[] {
  try {
    const raw = typeof questionnaire.data === 'string'
      ? JSON.parse(questionnaire.data)
      : questionnaire.data;
    const data = raw as unknown as QuestionnaireDataStructure;
    return data?.services?.offerings || [];
  } catch {
    return [];
  }
}

/**
 * Normalize page_type to handle legacy aliases
 */
function normalizePageType(pageType: string): string {
  // Map legacy types to new types
  if (pageType === 'service-area') return 'keyword-service-area';
  if (pageType === 'location-keyword') return 'keyword-location';
  return pageType;
}

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
        "SELECT * FROM keywords WHERE business_id = ? ORDER BY created_at DESC, keyword ASC",
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

      // Validate requirements based on page type
      const normalizedType = normalizePageType(data.page_type);
      const isKeywordBased = normalizedType === "keyword-location" || normalizedType === "keyword-service-area";
      const isLocationBased = normalizedType === "keyword-location" || normalizedType === "service-location";

      if (isKeywordBased && keywords.length === 0) {
        throw new HttpError(
          422,
          "At least one keyword is required for keyword-based pages",
          "INSUFFICIENT_DATA"
        );
      }

      if (isLocationBased) {
        const locationCount = dbGet<{ count: number }>(
          "SELECT COUNT(*) as count FROM locations WHERE business_id = ? AND status IN ('active', 'coming-soon') AND is_headquarters = 0",
          [businessId]
        );
        if (!locationCount || locationCount.count === 0) {
          throw new HttpError(
            422,
            "At least one store location is required for location-based pages",
            "INSUFFICIENT_DATA"
          );
        }
      }

      // Generate job pages based on page type
      const jobId = generateId();
      const now = new Date().toISOString();
      const jobPages: Array<{
        id: string;
        job_id: string;
        business_id: string;
        keyword_slug: string | null;
        keyword_text: string | null;
        keyword_language: "en" | "es";
        service_area_slug: string;
        url_path: string;
        status: string;
        location_status: "active" | "coming-soon";
        created_at: string;
      }> = [];

      // Normalize page type for legacy aliases
      const normalizedPageType = normalizePageType(data.page_type);

      // Get locations for location-based page types (both active and coming-soon)
      const locations = dbAll<{ city: string; state: string; status: "active" | "coming-soon" }>(
        "SELECT DISTINCT city, state, status FROM locations WHERE business_id = ? AND status IN ('active', 'coming-soon') AND is_headquarters = 0 ORDER BY priority DESC",
        [businessId]
      );

      // Get services/menu items for service-based page types
      const services = getServicesFromQuestionnaire(questionnaire);

      if (normalizedPageType === "keyword-location") {
        // keyword-location: Keywords × Store Locations (active + coming-soon)
        for (const keyword of keywords) {
          for (const location of locations) {
            const locationSlug = toCityStateSlug(location.city, location.state);
            const urlPath = `/${keyword.slug}/${locationSlug}`;

            jobPages.push({
              id: generateId(),
              job_id: jobId,
              business_id: businessId,
              keyword_slug: keyword.slug,
              keyword_text: keyword.keyword,
              keyword_language: keyword.language ?? "en",
              service_area_slug: locationSlug,
              url_path: urlPath,
              status: "queued",
              location_status: location.status, // active or coming-soon
              created_at: now,
            });
          }
        }
      } else if (normalizedPageType === "keyword-service-area") {
        // keyword-service-area: Keywords × Service Areas
        for (const keyword of keywords) {
          for (const area of serviceAreas) {
            const serviceAreaSlug = toCityStateSlug(area.city, area.state);
            const urlPath = `/${keyword.slug}/${serviceAreaSlug}`;

            jobPages.push({
              id: generateId(),
              job_id: jobId,
              business_id: businessId,
              keyword_slug: keyword.slug,
              keyword_text: keyword.keyword,
              keyword_language: keyword.language ?? "en",
              service_area_slug: serviceAreaSlug,
              url_path: urlPath,
              status: "queued",
              location_status: "active", // Service areas don't have coming-soon status
              created_at: now,
            });
          }
        }
      } else if (normalizedPageType === "service-location") {
        // service-location: Services/Menu Items × Store Locations
        if (services.length === 0) {
          throw new HttpError(
            422,
            "At least one service/menu item is required for service-location pages",
            "INSUFFICIENT_DATA"
          );
        }

        for (const service of services) {
          for (const location of locations) {
            const locationSlug = toCityStateSlug(location.city, location.state);
            const urlPath = `/${service.slug}/${locationSlug}`;

            jobPages.push({
              id: generateId(),
              job_id: jobId,
              business_id: businessId,
              keyword_slug: service.slug,
              keyword_text: service.name,
              keyword_language: "en", // Services are always in English (nameEs is optional display)
              service_area_slug: locationSlug,
              url_path: urlPath,
              status: "queued",
              location_status: location.status, // active or coming-soon
              created_at: now,
            });
          }
        }
      } else if (normalizedPageType === "service-service-area") {
        // service-service-area: Services/Menu Items × Service Areas
        if (services.length === 0) {
          throw new HttpError(
            422,
            "At least one service/menu item is required for service-service-area pages",
            "INSUFFICIENT_DATA"
          );
        }

        for (const service of services) {
          for (const area of serviceAreas) {
            const serviceAreaSlug = toCityStateSlug(area.city, area.state);
            const urlPath = `/${service.slug}/${serviceAreaSlug}`;

            jobPages.push({
              id: generateId(),
              job_id: jobId,
              business_id: businessId,
              keyword_slug: service.slug,
              keyword_text: service.name,
              keyword_language: "en",
              service_area_slug: serviceAreaSlug,
              url_path: urlPath,
              status: "queued",
              location_status: "active", // Service areas don't have coming-soon status
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
          id, job_id, business_id, keyword_slug, keyword_text, keyword_language, service_area_slug,
          url_path, status, location_status, worker_id, attempts, claimed_at,
          completed_at, content, error_message, section_count,
          model_name, prompt_version, generation_duration_ms,
          word_count, created_at
        ) VALUES (
          @id, @job_id, @business_id, @keyword_slug, @keyword_text, @keyword_language, @service_area_slug,
          @url_path, @status, @location_status, @worker_id, @attempts, @claimed_at,
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
            keyword_text: string | null;
            keyword_language: "en" | "es";
            service_area_slug: string;
            url_path: string;
            status: string;
            location_status: "active" | "coming-soon";
            created_at: string;
          }>
        ) => {
          for (const page of pages) {
            insertStmt.run({
              id: page.id,
              job_id: page.job_id,
              business_id: page.business_id,
              keyword_slug: page.keyword_slug,
              keyword_text: page.keyword_text,
              keyword_language: page.keyword_language,
              service_area_slug: page.service_area_slug,
              url_path: page.url_path,
              status: "queued",
              location_status: page.location_status,
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
 * POST /businesses/:id/generate/preview - Preview pages that would be created
 *
 * Returns a list of all pages that would be generated without creating the job.
 * Supports filtering and pagination for reviewing before committing.
 */
router.post(
  "/:id/generate/preview",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = req.params.id;
      const search = req.query.search as string | undefined;
      const language = req.query.language as string | undefined;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
      const offset = (page - 1) * limit;

      // Verify business exists
      const business = dbGet<Business>(
        "SELECT * FROM businesses WHERE id = ?",
        [businessId]
      );
      if (!business) {
        throw new HttpError(404, "Business not found", "NOT_FOUND");
      }

      const data = CreateGenerationJobSchema.parse(req.body);

      // Get keywords and service areas
      const keywords = dbAll<Keyword>(
        "SELECT * FROM keywords WHERE business_id = ? ORDER BY created_at DESC, keyword ASC",
        [businessId]
      );

      const serviceAreas = dbAll<ServiceArea>(
        "SELECT * FROM service_areas WHERE business_id = ? ORDER BY priority DESC",
        [businessId]
      );

      // Get locations for location-based page types (both active and coming-soon)
      const locations = dbAll<{ city: string; state: string; status: "active" | "coming-soon" }>(
        "SELECT DISTINCT city, state, status FROM locations WHERE business_id = ? AND status IN ('active', 'coming-soon') AND is_headquarters = 0 ORDER BY priority DESC",
        [businessId]
      );

      // Get questionnaire for service-based page types
      const questionnaire = dbGet<Questionnaire>(
        "SELECT * FROM questionnaires WHERE business_id = ?",
        [businessId]
      );
      const services = questionnaire ? getServicesFromQuestionnaire(questionnaire) : [];

      // Normalize page type for legacy aliases
      const normalizedPageType = normalizePageType(data.page_type);

      // Generate preview pages (not persisted)
      const previewPages: Array<{
        keyword_slug: string | null;
        keyword_text: string | null;
        keyword_language: "en" | "es";
        service_area_slug: string;
        service_area_city: string;
        service_area_state: string;
        location_status: "active" | "coming-soon";
        url_path: string;
      }> = [];

      if (normalizedPageType === "keyword-location") {
        for (const keyword of keywords) {
          for (const location of locations) {
            const locationSlug = toCityStateSlug(location.city, location.state);
            previewPages.push({
              keyword_slug: keyword.slug,
              keyword_text: keyword.keyword,
              keyword_language: keyword.language ?? "en",
              service_area_slug: locationSlug,
              service_area_city: location.city,
              service_area_state: location.state,
              location_status: location.status,
              url_path: `/${keyword.slug}/${locationSlug}`,
            });
          }
        }
      } else if (normalizedPageType === "keyword-service-area") {
        for (const keyword of keywords) {
          for (const area of serviceAreas) {
            const serviceAreaSlug = toCityStateSlug(area.city, area.state);
            previewPages.push({
              keyword_slug: keyword.slug,
              keyword_text: keyword.keyword,
              keyword_language: keyword.language ?? "en",
              service_area_slug: serviceAreaSlug,
              service_area_city: area.city,
              service_area_state: area.state,
              location_status: "active",
              url_path: `/${keyword.slug}/${serviceAreaSlug}`,
            });
          }
        }
      } else if (normalizedPageType === "service-location") {
        for (const service of services) {
          for (const location of locations) {
            const locationSlug = toCityStateSlug(location.city, location.state);
            previewPages.push({
              keyword_slug: service.slug,
              keyword_text: service.name,
              keyword_language: "en",
              service_area_slug: locationSlug,
              service_area_city: location.city,
              service_area_state: location.state,
              location_status: location.status,
              url_path: `/${service.slug}/${locationSlug}`,
            });
          }
        }
      } else if (normalizedPageType === "service-service-area") {
        for (const service of services) {
          for (const area of serviceAreas) {
            const serviceAreaSlug = toCityStateSlug(area.city, area.state);
            previewPages.push({
              keyword_slug: service.slug,
              keyword_text: service.name,
              keyword_language: "en",
              service_area_slug: serviceAreaSlug,
              service_area_city: area.city,
              service_area_state: area.state,
              location_status: "active",
              url_path: `/${service.slug}/${serviceAreaSlug}`,
            });
          }
        }
      }

      // Apply filters
      let filteredPages = previewPages;

      if (language && (language === "en" || language === "es")) {
        filteredPages = filteredPages.filter((p) => p.keyword_language === language);
      }

      if (search && search.trim()) {
        const searchLower = search.trim().toLowerCase();
        filteredPages = filteredPages.filter(
          (p) =>
            p.keyword_text?.toLowerCase().includes(searchLower) ||
            p.url_path.toLowerCase().includes(searchLower) ||
            p.service_area_city.toLowerCase().includes(searchLower) ||
            p.service_area_state.toLowerCase().includes(searchLower)
        );
      }

      const total = filteredPages.length;
      const paginatedPages = filteredPages.slice(offset, offset + limit);

      // Count by language
      const languageCounts = {
        en: previewPages.filter((p) => p.keyword_language === "en").length,
        es: previewPages.filter((p) => p.keyword_language === "es").length,
      };

      // Get unique keywords and areas for stats
      const uniqueKeywords = new Set(previewPages.map((p) => p.keyword_slug)).size;
      const uniqueAreas = new Set(previewPages.map((p) => p.service_area_slug)).size;

      res.json({
        pages: paginatedPages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        summary: {
          total_pages: previewPages.length,
          unique_keywords: uniqueKeywords,
          unique_service_areas: uniqueAreas,
          by_language: languageCounts,
        },
        business: {
          id: business.id,
          name: business.name,
        },
        page_type: data.page_type,
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
