/**
 * Business CRUD routes
 */

import { Router, Request, Response, NextFunction } from "express";
import { dbRun, dbGet, dbAll } from "../db/connection";
import {
  CreateBusinessSchema,
  UpdateBusinessSchema,
  generateId,
  normalizeQuestionnaireData,
} from "@marketbrewer/shared";
import type { Business, Questionnaire } from "@marketbrewer/shared";
import { HttpError } from "../middleware/error-handler";

const router = Router();

/**
 * GET /businesses - List all businesses
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const businesses = dbAll<Business>(
      "SELECT * FROM businesses ORDER BY created_at DESC"
    );
    res.json({ businesses });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /businesses/:id - Get single business
 */
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const business = dbGet<Business>("SELECT * FROM businesses WHERE id = ?", [
      req.params.id,
    ]);

    if (!business) {
      throw new HttpError(404, "Business not found", "NOT_FOUND");
    }

    res.json({ business });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /businesses - Create new business
 */
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = CreateBusinessSchema.parse(req.body);
    const id = generateId();
    const now = new Date().toISOString();

    const industryType = data.industry_type ?? data.industry ?? null;
    const industryLegacy = data.industry ?? industryType;
    if (!industryLegacy || !industryType) {
      throw new HttpError(400, "Industry is required", "VALIDATION_ERROR");
    }

    dbRun(
      `INSERT INTO businesses (
        id,
        name,
        industry,
        industry_type,
        website,
        phone,
        email,
        gbp_url,
        primary_city,
        primary_state,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name,
        industryLegacy,
        industryType,
        data.website ?? null,
        data.phone ?? null,
        data.email ?? null,
        data.gbp_url ?? null,
        null,
        null,
        now,
        now,
      ]
    );

    // Create empty questionnaire for the business
    const questionnaireId = generateId();
    dbRun(
      `INSERT INTO questionnaires (id, business_id, data, completeness_score, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [questionnaireId, id, "{}", 0, now, now]
    );

    const business = dbGet<Business>("SELECT * FROM businesses WHERE id = ?", [
      id,
    ]);
    res.status(201).json({ business });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /businesses/:id - Update business
 */
router.put("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = dbGet<Business>("SELECT * FROM businesses WHERE id = ?", [
      req.params.id,
    ]);

    if (!existing) {
      throw new HttpError(404, "Business not found", "NOT_FOUND");
    }

    const data = UpdateBusinessSchema.parse(req.body);
    const now = new Date().toISOString();

    const updates: string[] = ["updated_at = ?"];
    const values: unknown[] = [now];

    if (data.name !== undefined) {
      updates.push("name = ?");
      values.push(data.name);
    }
    if (data.industry !== undefined) {
      updates.push("industry = ?");
      values.push(data.industry);
    }
    if (data.industry_type !== undefined) {
      updates.push("industry_type = ?");
      values.push(data.industry_type);

      // Keep legacy industry column populated for older consumers.
      if (data.industry === undefined) {
        updates.push("industry = ?");
        values.push(data.industry_type);
      }
    }
    if (data.website !== undefined) {
      updates.push("website = ?");
      values.push(data.website);
    }
    if (data.phone !== undefined) {
      updates.push("phone = ?");
      values.push(data.phone);
    }
    if (data.email !== undefined) {
      updates.push("email = ?");
      values.push(data.email);
    }
    if (data.gbp_url !== undefined) {
      updates.push("gbp_url = ?");
      values.push(data.gbp_url);
    }
    if (data.primary_city !== undefined) {
      updates.push("primary_city = ?");
      values.push(data.primary_city);
    }
    if (data.primary_state !== undefined) {
      updates.push("primary_state = ?");
      values.push(data.primary_state);
    }

    values.push(req.params.id);
    dbRun(`UPDATE businesses SET ${updates.join(", ")} WHERE id = ?`, values);

    const business = dbGet<Business>("SELECT * FROM businesses WHERE id = ?", [
      req.params.id,
    ]);
    res.json({ business });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /businesses/:id - Delete business
 */
router.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = dbGet<Business>(
        "SELECT * FROM businesses WHERE id = ?",
        [req.params.id]
      );

      if (!existing) {
        throw new HttpError(404, "Business not found", "NOT_FOUND");
      }

      // Delete cascades due to foreign key constraints
      dbRun("DELETE FROM businesses WHERE id = ?", [req.params.id]);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /businesses/:id/questionnaire - Get questionnaire
 */
router.get(
  "/:id/questionnaire",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const questionnaire = dbGet<Questionnaire>(
        "SELECT * FROM questionnaires WHERE business_id = ? ORDER BY updated_at DESC, created_at DESC LIMIT 1",
        [req.params.id]
      );

      if (!questionnaire) {
        throw new HttpError(404, "Questionnaire not found", "NOT_FOUND");
      }

      // Parse JSON data
      const result = {
        ...questionnaire,
        data: normalizeQuestionnaireData(
          JSON.parse((questionnaire.data as unknown as string) || "{}")
        ),
      };

      res.json({ questionnaire: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /businesses/:id/questionnaire - Update questionnaire
 */
router.put(
  "/:id/questionnaire",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = dbGet<Questionnaire>(
        "SELECT * FROM questionnaires WHERE business_id = ? ORDER BY updated_at DESC, created_at DESC LIMIT 1",
        [req.params.id]
      );

      if (!existing) {
        throw new HttpError(404, "Questionnaire not found", "NOT_FOUND");
      }

      const { data } = req.body;

      if (!data || typeof data !== "object") {
        throw new HttpError(
          400,
          "Invalid questionnaire data",
          "VALIDATION_ERROR"
        );
      }

      // Normalize data and calculate completeness score
      const { calculateCompletenessScore } = await import(
        "@marketbrewer/shared"
      );
      const normalized = normalizeQuestionnaireData(data);

      const business = dbGet<Business>(
        "SELECT * FROM businesses WHERE id = ?",
        [req.params.id]
      );
      if (!business) {
        throw new HttpError(404, "Business not found", "NOT_FOUND");
      }

      const socialLinkCount = dbGet<{ count: number }>(
        "SELECT COUNT(*) as count FROM business_social_links WHERE business_id = ?",
        [req.params.id]
      )?.count;

      const hoursExists = dbGet<{ exists: number }>(
        "SELECT 1 as exists FROM business_hours WHERE business_id = ? LIMIT 1",
        [req.params.id]
      )?.exists;

      const fullAddressExists = dbGet<{ exists: number }>(
        "SELECT 1 as exists FROM business_locations WHERE business_id = ? AND street_address IS NOT NULL AND TRIM(street_address) <> '' LIMIT 1",
        [req.params.id]
      )?.exists;

      const completenessScore = calculateCompletenessScore({
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
      const now = new Date().toISOString();

      dbRun(
        `UPDATE questionnaires SET data = ?, completeness_score = ?, updated_at = ? WHERE id = ?`,
        [JSON.stringify(normalized), completenessScore, now, existing.id]
      );

      const questionnaire = dbGet<Questionnaire>(
        "SELECT * FROM questionnaires WHERE id = ?",
        [existing.id]
      );

      const result = {
        ...questionnaire,
        data: normalizeQuestionnaireData(
          JSON.parse((questionnaire!.data as unknown as string) || "{}")
        ),
      };

      res.json({ questionnaire: result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
