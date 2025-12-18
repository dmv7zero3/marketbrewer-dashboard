/**
 * Zod validation schemas for Business Profile V1 tables
 */

import { z } from "zod";

export const LocationTypeSchema = z.enum(["physical", "service_area"]);

export const CreateBusinessLocationSchema = z.object({
  location_type: LocationTypeSchema.default("service_area"),
  is_primary: z.boolean().optional(),

  street_address: z.string().nullable().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postal_code: z.string().nullable().optional(),
  country: z.string().min(2).default("US"),
});

export const UpdateBusinessLocationSchema =
  CreateBusinessLocationSchema.partial();

export const DayOfWeekSchema = z.enum([
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]);

export const BusinessHoursEntrySchema = z.object({
  day_of_week: DayOfWeekSchema,
  opens: z.string().nullable().optional(),
  closes: z.string().nullable().optional(),
  is_closed: z.boolean().optional(),
});

export const UpdateBusinessHoursSchema = z.object({
  hours: z.array(BusinessHoursEntrySchema),
});

export const SocialPlatformSchema = z.enum([
  "facebook",
  "instagram",
  "twitter",
  "linkedin",
  "youtube",
  "tiktok",
  "yelp",
]);

export const CreateBusinessSocialLinkSchema = z.object({
  platform: SocialPlatformSchema,
  url: z.string().url(),
});
