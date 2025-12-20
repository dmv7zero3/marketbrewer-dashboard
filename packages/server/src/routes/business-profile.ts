/**
 * Business Profile V1 routes
 * - Profile locations (service area vs physical)
 * - Business hours
 * - Social links
 */

import { Router, Request, Response, NextFunction } from "express";

import { dbAll, dbGet, dbRun } from "../db/connection";
import { HttpError } from "../middleware/error-handler";

import {
  CreateBusinessLocationSchema,
  UpdateBusinessLocationSchema,
  UpdateBusinessHoursSchema,
  CreateBusinessSocialLinkSchema,
  SocialPlatformSchema,
  generateId,
  normalizeQuestionnaireData,
} from "@marketbrewer/shared";

import type {
  Business,
  BusinessHours,
  BusinessLocation,
  BusinessSocialLink,
} from "@marketbrewer/shared";

const router = Router();

function requireBusiness(businessId: string): Business {
  const business = dbGet<Business>("SELECT * FROM businesses WHERE id = ?", [
    businessId,
  ]);
  if (!business) {
    throw new HttpError(404, "Business not found", "NOT_FOUND");
  }
  return business;
}

async function recomputeCompletenessScore(businessId: string): Promise<void> {
  const { calculateCompletenessScore } = await import("@marketbrewer/shared");

  const business = dbGet<Business>("SELECT * FROM businesses WHERE id = ?", [
    businessId,
  ]);
  if (!business) return;

  const questionnaireRow = dbGet<{ id: string; data: string }>(
    "SELECT id, data FROM questionnaires WHERE business_id = ? ORDER BY updated_at DESC, created_at DESC LIMIT 1",
    [businessId]
  );
  if (!questionnaireRow) return;

  const normalized = normalizeQuestionnaireData(
    JSON.parse(questionnaireRow.data || "{}")
  );

  const socialLinkCount = dbGet<{ count: number }>(
    "SELECT COUNT(*) as count FROM business_social_links WHERE business_id = ?",
    [businessId]
  )?.count;

  const hoursExists = dbGet<{ found: number }>(
    "SELECT 1 as found FROM business_hours WHERE business_id = ? LIMIT 1",
    [businessId]
  )?.found;

  const fullAddressExists = dbGet<{ found: number }>(
    "SELECT 1 as found FROM business_locations WHERE business_id = ? AND street_address IS NOT NULL AND TRIM(street_address) <> '' LIMIT 1",
    [businessId]
  )?.found;

  const score = calculateCompletenessScore({
    business: {
      name: business.name,
      industry_type: business.industry_type ?? null,
      phone: business.phone,
      email: business.email,
      website: business.website,
      gbp_url: business.gbp_url ?? null,
      primary_city: business.primary_city ?? null,
      primary_state: business.primary_state ?? null,
    },
    questionnaire: normalized,
    socialLinkCount: socialLinkCount ?? 0,
    hasHours: !!hoursExists,
    hasFullAddress: !!fullAddressExists,
  });

  dbRun(
    "UPDATE questionnaires SET completeness_score = ?, updated_at = ? WHERE id = ?",
    [score, new Date().toISOString(), questionnaireRow.id]
  );
}

// ============================================
// PROFILE LOCATIONS
// ============================================

/**
 * GET /businesses/:id/locations - List profile locations
 */
router.get(
  "/:id/locations",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      requireBusiness(req.params.id);
      const locations = dbAll<BusinessLocation>(
        "SELECT * FROM business_locations WHERE business_id = ? ORDER BY is_primary DESC, created_at ASC",
        [req.params.id]
      );
      res.json({ locations });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /businesses/:id/locations - Add profile location
 */
router.post(
  "/:id/locations",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = req.params.id;
      requireBusiness(businessId);

      const data = CreateBusinessLocationSchema.parse(req.body);
      const id = generateId();

      const requestedPrimary = data.is_primary ?? false;
      const existingPrimary = dbGet<{ id: string }>(
        "SELECT id FROM business_locations WHERE business_id = ? AND is_primary = 1 LIMIT 1",
        [businessId]
      );

      // If there is no primary yet, auto-set this new location as primary.
      const finalIsPrimary = requestedPrimary || !existingPrimary;

      if (finalIsPrimary) {
        dbRun(
          "UPDATE business_locations SET is_primary = 0 WHERE business_id = ?",
          [businessId]
        );
      }

      dbRun(
        `INSERT INTO business_locations (
          id,
          business_id,
          location_type,
          is_primary,
          street_address,
          city,
          state,
          postal_code,
          country,
          latitude,
          longitude
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          businessId,
          data.location_type,
          finalIsPrimary ? 1 : 0,
          data.street_address ?? null,
          data.city,
          data.state,
          data.postal_code ?? null,
          data.country,
          null,
          null,
        ]
      );

      if (finalIsPrimary) {
        dbRun(
          "UPDATE businesses SET primary_city = ?, primary_state = ? WHERE id = ?",
          [data.city, data.state, businessId]
        );
      }

      const location = dbGet<BusinessLocation>(
        "SELECT * FROM business_locations WHERE id = ?",
        [id]
      );

      await recomputeCompletenessScore(businessId);

      res.status(201).json({ location });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /businesses/:id/locations/:locId - Update profile location
 */
router.put(
  "/:id/locations/:locId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = req.params.id;
      requireBusiness(businessId);

      const existing = dbGet<BusinessLocation>(
        "SELECT * FROM business_locations WHERE id = ? AND business_id = ?",
        [req.params.locId, businessId]
      );
      if (!existing) {
        throw new HttpError(404, "Location not found", "NOT_FOUND");
      }

      const data = UpdateBusinessLocationSchema.parse(req.body);

      const updates: string[] = [];
      const values: unknown[] = [];

      if (data.location_type !== undefined) {
        updates.push("location_type = ?");
        values.push(data.location_type);
      }
      if (data.street_address !== undefined) {
        updates.push("street_address = ?");
        values.push(data.street_address);
      }
      if (data.city !== undefined) {
        updates.push("city = ?");
        values.push(data.city);
      }
      if (data.state !== undefined) {
        updates.push("state = ?");
        values.push(data.state);
      }
      if (data.postal_code !== undefined) {
        updates.push("postal_code = ?");
        values.push(data.postal_code);
      }
      if (data.country !== undefined) {
        updates.push("country = ?");
        values.push(data.country);
      }

      const wantsPrimary = data.is_primary === true;
      if (wantsPrimary) {
        dbRun(
          "UPDATE business_locations SET is_primary = 0 WHERE business_id = ?",
          [businessId]
        );
        updates.push("is_primary = 1");
      } else if (data.is_primary === false) {
        updates.push("is_primary = 0");
      }

      if (updates.length === 0) {
        const location = dbGet<BusinessLocation>(
          "SELECT * FROM business_locations WHERE id = ?",
          [req.params.locId]
        );
        res.json({ location });
        return;
      }

      values.push(req.params.locId);
      dbRun(
        `UPDATE business_locations SET ${updates.join(", ")} WHERE id = ?`,
        values
      );

      const updated = dbGet<BusinessLocation>(
        "SELECT * FROM business_locations WHERE id = ?",
        [req.params.locId]
      );

      if (wantsPrimary && updated) {
        dbRun(
          "UPDATE businesses SET primary_city = ?, primary_state = ? WHERE id = ?",
          [updated.city, updated.state, businessId]
        );
      }

      await recomputeCompletenessScore(businessId);

      res.json({ location: updated });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /businesses/:id/locations/:locId - Delete profile location
 */
router.delete(
  "/:id/locations/:locId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = req.params.id;
      requireBusiness(businessId);

      const existing = dbGet<BusinessLocation>(
        "SELECT * FROM business_locations WHERE id = ? AND business_id = ?",
        [req.params.locId, businessId]
      );
      if (!existing) {
        throw new HttpError(404, "Location not found", "NOT_FOUND");
      }

      dbRun("DELETE FROM business_locations WHERE id = ?", [req.params.locId]);

      if (existing.is_primary) {
        const nextPrimary = dbGet<BusinessLocation>(
          "SELECT * FROM business_locations WHERE business_id = ? ORDER BY created_at ASC LIMIT 1",
          [businessId]
        );

        if (nextPrimary) {
          dbRun("UPDATE business_locations SET is_primary = 1 WHERE id = ?", [
            nextPrimary.id,
          ]);
          dbRun(
            "UPDATE businesses SET primary_city = ?, primary_state = ? WHERE id = ?",
            [nextPrimary.city, nextPrimary.state, businessId]
          );
        } else {
          dbRun(
            "UPDATE businesses SET primary_city = NULL, primary_state = NULL WHERE id = ?",
            [businessId]
          );
        }
      }

      await recomputeCompletenessScore(businessId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// BUSINESS HOURS
// ============================================

/**
 * GET /businesses/:id/hours - Get all business hours
 */
router.get(
  "/:id/hours",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      requireBusiness(req.params.id);
      const hours = dbAll<BusinessHours>(
        "SELECT * FROM business_hours WHERE business_id = ? ORDER BY day_of_week ASC",
        [req.params.id]
      );
      res.json({ hours });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /businesses/:id/hours - Bulk update business hours
 */
router.put(
  "/:id/hours",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = req.params.id;
      requireBusiness(businessId);

      const data = UpdateBusinessHoursSchema.parse(req.body);

      for (const entry of data.hours) {
        const id = generateId();
        dbRun(
          `INSERT INTO business_hours (id, business_id, day_of_week, opens, closes, is_closed)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(business_id, day_of_week)
           DO UPDATE SET
             opens = excluded.opens,
             closes = excluded.closes,
             is_closed = excluded.is_closed`,
          [
            id,
            businessId,
            entry.day_of_week,
            entry.opens ?? null,
            entry.closes ?? null,
            entry.is_closed ? 1 : 0,
          ]
        );
      }

      const hours = dbAll<BusinessHours>(
        "SELECT * FROM business_hours WHERE business_id = ? ORDER BY day_of_week ASC",
        [businessId]
      );

      await recomputeCompletenessScore(businessId);
      res.json({ hours });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// SOCIAL LINKS
// ============================================

/**
 * GET /businesses/:id/social - List all social links
 */
router.get(
  "/:id/social",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      requireBusiness(req.params.id);
      const links = dbAll<BusinessSocialLink>(
        "SELECT * FROM business_social_links WHERE business_id = ? ORDER BY platform ASC",
        [req.params.id]
      );
      res.json({ links });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /businesses/:id/social - Add social link
 */
router.post(
  "/:id/social",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = req.params.id;
      requireBusiness(businessId);

      const data = CreateBusinessSocialLinkSchema.parse(req.body);
      const id = generateId();

      dbRun(
        `INSERT INTO business_social_links (id, business_id, platform, url)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(business_id, platform)
         DO UPDATE SET url = excluded.url`,
        [id, businessId, data.platform, data.url]
      );

      const link = dbGet<BusinessSocialLink>(
        "SELECT * FROM business_social_links WHERE business_id = ? AND platform = ?",
        [businessId, data.platform]
      );

      await recomputeCompletenessScore(businessId);

      res.status(201).json({ link });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /businesses/:id/social/:platform - Remove social link
 */
router.delete(
  "/:id/social/:platform",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = req.params.id;
      requireBusiness(businessId);

      const platform = SocialPlatformSchema.parse(req.params.platform);

      dbRun(
        "DELETE FROM business_social_links WHERE business_id = ? AND platform = ?",
        [businessId, platform]
      );

      await recomputeCompletenessScore(businessId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
