/**
 * Zod validation schemas for business entities
 */

import { z } from "zod";

export const CreateBusinessSchema = z.object({
  name: z.string().min(1, "Name is required"),
  industry: z.string().min(1, "Industry is required"),
  website: z.string().url().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
});

export const UpdateBusinessSchema = z.object({
  name: z.string().min(1).optional(),
  industry: z.string().min(1).optional(),
  website: z.string().url().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
});

export const CreateKeywordSchema = z.object({
  keyword: z.string().min(1, "Keyword is required"),
  search_intent: z.string().nullable().optional(),
  priority: z.number().int().min(1).max(10).default(5),
});

export const CreateServiceAreaSchema = z.object({
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required").max(2),
  county: z.string().nullable().optional(),
  priority: z.number().int().min(1).max(10).default(5),
});

export const UpdateQuestionnaireSchema = z.object({
  data: z.record(z.unknown()),
});

export type CreateBusinessInput = z.infer<typeof CreateBusinessSchema>;
export type UpdateBusinessInput = z.infer<typeof UpdateBusinessSchema>;
export type CreateKeywordInput = z.infer<typeof CreateKeywordSchema>;
export type CreateServiceAreaInput = z.infer<typeof CreateServiceAreaSchema>;
export type UpdateQuestionnaireInput = z.infer<
  typeof UpdateQuestionnaireSchema
>;
