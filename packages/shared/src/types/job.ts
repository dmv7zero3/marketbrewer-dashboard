/**
 * Job and page entity types for MarketBrewer SEO Platform
 */

export type JobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";
export type PageStatus = "queued" | "processing" | "completed" | "failed";
export type PageLocationStatus = "active" | "coming-soon";

/**
 * Page Types - combinations of content type and location type:
 *
 * Content Types:
 * - keyword: SEO keywords (e.g., "best fried chicken", "halal burgers")
 * - service: Services/Menu items (e.g., "SEO Audit", "Local SEO Strategy")
 * - blog: Blog topics derived from keywords (localized posts for SEO)
 *
 * Location Types:
 * - location: Physical store locations (where business exists)
 * - service-area: Nearby cities (no store, targets surrounding areas)
 *
 * Combinations:
 * - keyword-service-area: Keywords × Service Areas (most common for local SEO)
 * - keyword-location: Keywords × Store Locations
 * - service-service-area: Services/Menu Items × Service Areas
 * - service-location: Services/Menu Items × Store Locations
 * - blog-service-area: Blog topics × Service Areas
 * - blog-location: Blog topics × Store Locations
 *
 * Legacy (backwards compatible):
 * - location-keyword: Alias for keyword-location
 * - service-area: Alias for keyword-service-area
 */
export type PageType =
  | "keyword-service-area"
  | "keyword-location"
  | "service-service-area"
  | "service-location"
  | "blog-service-area"
  | "blog-location"
  // Legacy aliases (backwards compatible)
  | "location-keyword"
  | "service-area";

export interface GenerationJob {
  id: string;
  business_id: string;
  status: JobStatus;
  page_type: PageType;
  total_pages: number;
  completed_pages: number;
  failed_pages: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface JobPage {
  id: string;
  job_id: string;
  business_id: string;
  keyword_slug: string | null;
  keyword_text: string | null;
  keyword_language: "en" | "es";
  service_area_slug: string;
  url_path: string;
  status: PageStatus;
  location_status: PageLocationStatus; // 'active' or 'coming-soon' for location-based pages
  worker_id: string | null;
  attempts: number;
  claimed_at: string | null;
  completed_at: string | null;
  content: string | null;
  error_message: string | null;
  section_count: number;
  model_name: string | null;
  prompt_version: string | null;
  generation_duration_ms: number | null;
  word_count: number | null;
  created_at: string;
}

export interface Worker {
  id: string;
  status: "active" | "idle" | "offline";
  last_heartbeat: string | null;
  current_page_id: string | null;
  pages_completed: number;
  pages_failed: number;
  created_at: string;
}

export interface JobWithCounts extends GenerationJob {
  queued_count: number;
  processing_count: number;
  completed_count: number;
  failed_count: number;
}
