/**
 * Zod schemas for location validation
 *
 * Simplified status model (V1.1):
 * - active: Location is open and operational
 * - upcoming: Location is planned/coming soon
 */

import { z } from "zod";

export const LocationStatusSchema = z.enum(["active", "upcoming"]);

export const CreateLocationSchema = z.object({
  // Required
  name: z.string().min(1, "Name is required").max(200),
  city: z.string().min(1, "City is required").max(100),
  state: z.string().min(1, "State/region is required").max(100),
  country: z.string().min(1, "Country is required").max(100).default("USA"),
  status: LocationStatusSchema.default("active"),

  // Optional
  display_name: z.string().max(300).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  zip_code: z.string().max(20).optional().nullable(),
  full_address: z.string().max(500).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z
    .string()
    .email("Invalid email")
    .optional()
    .nullable()
    .or(z.literal("")),
  google_maps_url: z
    .string()
    .url("Invalid URL")
    .optional()
    .nullable()
    .or(z.literal("")),
  store_id: z.string().max(100).optional().nullable(),
  order_link: z
    .string()
    .url("Invalid URL")
    .optional()
    .nullable()
    .or(z.literal("")),
  is_headquarters: z.boolean().optional(),
  note: z.string().max(1000).optional().nullable(),
  priority: z.number().int().min(0).optional(),
});

export const UpdateLocationSchema = CreateLocationSchema.partial();

export const BulkImportLocationSchema = z.object({
  locations: z.array(CreateLocationSchema),
  auto_create_service_areas: z.boolean().default(true),
});

export type CreateLocationInput = z.infer<typeof CreateLocationSchema>;
export type UpdateLocationInput = z.infer<typeof UpdateLocationSchema>;
export type BulkImportLocationInput = z.infer<typeof BulkImportLocationSchema>;

/**
 * Schema for migrating from old status values to new ones
 * Maps: coming-soon → upcoming, closed → (removed), temporarily-closed → (removed)
 */
export const LegacyLocationStatusSchema = z.enum([
  "active",
  "coming-soon",
  "closed",
  "temporarily-closed",
]);

export function migrateLocationStatus(
  oldStatus: z.infer<typeof LegacyLocationStatusSchema>
): z.infer<typeof LocationStatusSchema> {
  switch (oldStatus) {
    case "active":
      return "active";
    case "coming-soon":
      return "upcoming";
    case "closed":
    case "temporarily-closed":
      // Closed locations should be handled separately (archive/delete)
      // Default to upcoming for migration purposes
      return "upcoming";
    default:
      return "active";
  }
}
