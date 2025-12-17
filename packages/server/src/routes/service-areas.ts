/**
 * Service areas CRUD routes
 */

import { Router, Request, Response, NextFunction } from "express";
import { dbRun, dbGet, dbAll } from "../db/connection";
import type { ServiceArea, Business } from "@marketbrewer/shared";
import { HttpError } from "../middleware/error-handler";
import { generateId, toCityStateSlug } from "@marketbrewer/shared";

const router = Router();

/**
 * GET /businesses/:id/service-areas - List service areas for a business
 */
router.get(
  "/:id/service-areas",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = req.params.id;
      const areas = dbAll<ServiceArea>(
        "SELECT * FROM service_areas WHERE business_id = ? ORDER BY priority DESC, created_at DESC",
        [businessId]
      );
      res.json({ service_areas: areas });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /businesses/:id/service-areas - Create a service area
 */
router.post(
  "/:id/service-areas",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = req.params.id;
      const business = dbGet<Business>(
        "SELECT * FROM businesses WHERE id = ?",
        [businessId]
      );
      if (!business) {
        throw new HttpError(404, "Business not found", "NOT_FOUND");
      }
      const { city, state, county, priority } = req.body as {
        city: string;
        state: string;
        county?: string | null;
        priority?: number;
      };
      if (!city || !state) {
        throw new HttpError(
          400,
          "City and state are required",
          "VALIDATION_ERROR"
        );
      }
      const id = generateId();
      const slug = toCityStateSlug(city, state);
      const now = new Date().toISOString();
      dbRun(
        `INSERT INTO service_areas (id, business_id, slug, city, state, county, priority, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, businessId, slug, city, state, county ?? null, priority ?? 0, now]
      );
      const created = dbGet<ServiceArea>(
        "SELECT * FROM service_areas WHERE id = ?",
        [id]
      );
      res.status(201).json({ service_area: created });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /businesses/:id/service-areas/:areaId - Update a service area
 */
router.put(
  "/:id/service-areas/:areaId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: businessId, areaId } = req.params;
      const existing = dbGet<ServiceArea>(
        "SELECT * FROM service_areas WHERE id = ? AND business_id = ?",
        [areaId, businessId]
      );
      if (!existing) {
        throw new HttpError(404, "Service area not found", "NOT_FOUND");
      }
      const { city, state, county, priority } = req.body as {
        city?: string;
        state?: string;
        county?: string | null;
        priority?: number;
      };
      const updates: string[] = [];
      const values: unknown[] = [];
      // If city/state changed, update slug too
      let newCity = existing.city;
      let newState = existing.state;
      if (city !== undefined) {
        updates.push("city = ?");
        values.push(city);
        newCity = city;
      }
      if (state !== undefined) {
        updates.push("state = ?");
        values.push(state);
        newState = state;
      }
      if (county !== undefined) {
        updates.push("county = ?");
        values.push(county ?? null);
      }
      if (priority !== undefined) {
        updates.push("priority = ?");
        values.push(priority);
      }
      if (city !== undefined || state !== undefined) {
        updates.push("slug = ?");
        values.push(toCityStateSlug(newCity, newState));
      }
      if (updates.length === 0) {
        res.json({ service_area: existing });
        return;
      }
      values.push(areaId);
      dbRun(
        `UPDATE service_areas SET ${updates.join(", ")} WHERE id = ?`,
        values
      );
      const updated = dbGet<ServiceArea>(
        "SELECT * FROM service_areas WHERE id = ?",
        [areaId]
      );
      res.json({ service_area: updated });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /businesses/:id/service-areas/:areaId - Delete a service area
 */
router.delete(
  "/:id/service-areas/:areaId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: businessId, areaId } = req.params;
      const existing = dbGet<ServiceArea>(
        "SELECT * FROM service_areas WHERE id = ? AND business_id = ?",
        [areaId, businessId]
      );
      if (!existing) {
        throw new HttpError(404, "Service area not found", "NOT_FOUND");
      }
      dbRun("DELETE FROM service_areas WHERE id = ?", [areaId]);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
