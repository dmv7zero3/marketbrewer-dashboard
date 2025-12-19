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

/**
 * Page Types:
 * - location-keyword: Business location city (where store exists) × keyword
 *   Example: Manassas × best fried chicken
 * - service-area: Nearby city (no store) × keyword
 *   Example: Centreville × best fried chicken (targets Centreville, directs to Manassas store)
 */
export type PageType = "location-keyword" | "service-area";

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
