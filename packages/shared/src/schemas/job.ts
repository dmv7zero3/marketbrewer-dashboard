/**
 * Zod validation schemas for job entities
 */

import { z } from "zod";

export const PageTypeSchema = z.enum(["service-location", "keyword-location"]);

export const CreateGenerationJobSchema = z.object({
  page_type: PageTypeSchema,
});

export const ClaimPageSchema = z.object({
  worker_id: z.string().min(1, "Worker ID is required"),
});

export const CompletePageSchema = z.object({
  status: z.enum(["completed", "failed"]),
  content: z.string().optional(),
  error_message: z.string().optional(),
  section_count: z.number().int().optional(),
  model_name: z.string().optional(),
  prompt_version: z.string().optional(),
  generation_duration_ms: z.number().int().optional(),
  word_count: z.number().int().optional(),
});

export const WorkerHeartbeatSchema = z.object({
  worker_id: z.string().min(1),
  current_page_id: z.string().nullable().optional(),
});

export type CreateGenerationJobInput = z.infer<
  typeof CreateGenerationJobSchema
>;
export type ClaimPageInput = z.infer<typeof ClaimPageSchema>;
export type CompletePageInput = z.infer<typeof CompletePageSchema>;
export type WorkerHeartbeatInput = z.infer<typeof WorkerHeartbeatSchema>;
