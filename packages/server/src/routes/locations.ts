/**
 * Locations CRUD routes
 */

import { Router, Request, Response, NextFunction } from "express";
import { dbRun, dbGet, dbAll } from "../db/connection";
import {
  CreateLocationSchema,
  UpdateLocationSchema,
  generateId,
  toCityStateSlug,
} from "@marketbrewer/shared";
import type {
  Location,
  LocationStats,
  ServiceArea,
} from "@marketbrewer/shared";
import { HttpError } from "../middleware/error-handler";

const router = Router();

/**
 * GET /businesses/:id/locations - List all locations for a business
 */
router.get(
  "/:id/locations",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, state, country } = req.query;

      let query = "SELECT * FROM locations WHERE business_id = ?";
      const params: unknown[] = [req.params.id];

      if (status) {
        query += " AND status = ?";
        params.push(status);
      }
      if (state) {
        query += " AND state = ?";
        params.push(state);
      }
      if (country) {
        query += " AND country = ?";
        params.push(country);
      }

      query +=
        " ORDER BY is_headquarters DESC, priority DESC, state ASC, city ASC";

      const locations = dbAll<Location>(query, params);
      res.json({ locations });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /businesses/:id/locations/stats - Get location statistics
 */
router.get(
  "/:id/locations/stats",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const locations = dbAll<Location>(
        "SELECT * FROM locations WHERE business_id = ?",
        [req.params.id]
      );

      const stats: LocationStats = {
        total: locations.length,
        active: locations.filter((l) => l.status === "active").length,
        upcoming: locations.filter((l) => l.status === "upcoming").length,
        byState: {},
        byCountry: {},
      };

      locations.forEach((location) => {
        stats.byState[location.state] =
          (stats.byState[location.state] || 0) + 1;
        stats.byCountry[location.country] =
          (stats.byCountry[location.country] || 0) + 1;
      });

      res.json({ stats });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /businesses/:id/locations/:locationId - Get single location
 */
router.get(
  "/:id/locations/:locationId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const location = dbGet<Location>(
        "SELECT * FROM locations WHERE id = ? AND business_id = ?",
        [req.params.locationId, req.params.id]
      );

      if (!location) {
        throw new HttpError(404, "Location not found", "NOT_FOUND");
      }

      res.json({ location });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /businesses/:id/locations - Create new location
 */
router.post(
  "/:id/locations",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = CreateLocationSchema.parse(req.body);
      const id = generateId();
      const timestamp = new Date().toISOString();

      const displayName =
        data.display_name ||
        `${req.body.business_name || "Location"} (${data.city})`;

      const fullAddress =
        data.full_address ||
        (data.address
          ? `${data.address}, ${data.city}, ${data.state} ${
              data.zip_code || ""
            }`.trim()
          : null);

      dbRun(
        `INSERT INTO locations (
          id, business_id, name, city, state, country, status,
          display_name, address, zip_code, full_address,
          phone, email, google_maps_url, store_id, order_link,
          is_headquarters, note, priority, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          req.params.id,
          data.name,
          data.city,
          data.state,
          data.country,
          data.status,
          displayName,
          data.address ?? null,
          data.zip_code ?? null,
          fullAddress,
          data.phone ?? null,
          data.email ?? null,
          data.google_maps_url ?? null,
          data.store_id ?? null,
          data.order_link ?? null,
          data.is_headquarters ? 1 : 0,
          data.note ?? null,
          data.priority ?? 0,
          timestamp,
          timestamp,
        ]
      );

      if (data.status === "active") {
        const existingArea = dbGet<ServiceArea>(
          "SELECT * FROM service_areas WHERE business_id = ? AND city = ? AND state = ?",
          [req.params.id, data.city, data.state]
        );

        if (!existingArea) {
          const serviceAreaSlug = toCityStateSlug(data.city, data.state);
          dbRun(
            `INSERT INTO service_areas (
              id, business_id, slug, city, state, country, location_id, priority, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              generateId(),
              req.params.id,
              serviceAreaSlug,
              data.city,
              data.state,
              data.country,
              id,
              data.priority ?? 0,
              timestamp,
              timestamp,
            ]
          );
        } else {
          dbRun(
            "UPDATE service_areas SET location_id = ?, updated_at = ? WHERE id = ?",
            [id, timestamp, existingArea.id]
          );
        }
      }

      const location = dbGet<Location>("SELECT * FROM locations WHERE id = ?", [
        id,
      ]);
      res.status(201).json({ location });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /businesses/:id/locations/:locationId - Update location
 */
router.put(
  "/:id/locations/:locationId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = dbGet<Location>(
        "SELECT * FROM locations WHERE id = ? AND business_id = ?",
        [req.params.locationId, req.params.id]
      );

      if (!existing) {
        throw new HttpError(404, "Location not found", "NOT_FOUND");
      }

      const data = UpdateLocationSchema.parse(req.body);
      const now = new Date().toISOString();

      const updates: string[] = ["updated_at = ?"];
      const values: unknown[] = [now];

      Object.entries(data).forEach(([key, value]) => {
        if (value === undefined) {
          return;
        }
        const columnName = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
        const normalizedValue =
          typeof value === "boolean" ? (value ? 1 : 0) : value;
        updates.push(`${columnName} = ?`);
        values.push(normalizedValue);
      });

      values.push(req.params.locationId);
      dbRun(`UPDATE locations SET ${updates.join(", ")} WHERE id = ?`, values);

      const location = dbGet<Location>("SELECT * FROM locations WHERE id = ?", [
        req.params.locationId,
      ]);
      res.json({ location });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /businesses/:id/locations/:locationId - Delete location
 */
router.delete(
  "/:id/locations/:locationId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = dbGet<Location>(
        "SELECT * FROM locations WHERE id = ? AND business_id = ?",
        [req.params.locationId, req.params.id]
      );

      if (!existing) {
        throw new HttpError(404, "Location not found", "NOT_FOUND");
      }

      const linkedAreas = dbAll<ServiceArea>(
        "SELECT * FROM service_areas WHERE location_id = ?",
        [req.params.locationId]
      );

      if (linkedAreas.length > 0) {
        dbRun(
          "UPDATE service_areas SET location_id = NULL, updated_at = ? WHERE location_id = ?",
          [new Date().toISOString(), req.params.locationId]
        );
      }

      dbRun("DELETE FROM locations WHERE id = ?", [req.params.locationId]);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /businesses/:id/locations/bulk-import - Bulk import locations
 */
router.post(
  "/:id/locations/bulk-import",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const autoCreateServiceAreas =
        typeof req.body.auto_create_service_areas === "boolean"
          ? req.body.auto_create_service_areas
          : true;

      if (!Array.isArray(req.body.locations)) {
        throw new HttpError(
          400,
          "locations must be an array",
          "VALIDATION_ERROR"
        );
      }

      const created: Location[] = [];
      const errors: Array<{ index: number; error: string }> = [];

      req.body.locations.forEach((locData: unknown, index: number) => {
        const parsed = CreateLocationSchema.safeParse(locData);
        if (!parsed.success) {
          errors.push({
            index,
            error: parsed.error.errors.map((issue) => issue.message).join(", "),
          });
          return;
        }

        const data = parsed.data;

        try {
          const id = generateId();
          const timestamp = new Date().toISOString();
          const displayName =
            data.display_name ||
            `${req.body.business_name || "Location"} (${data.city})`;

          const fullAddress =
            data.full_address ||
            (data.address
              ? `${data.address}, ${data.city}, ${data.state} ${
                  data.zip_code || ""
                }`.trim()
              : null);

          dbRun(
            `INSERT INTO locations (
              id, business_id, name, city, state, country, status,
              display_name, address, zip_code, full_address,
              phone, email, google_maps_url, store_id, order_link,
              is_headquarters, note, priority, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              req.params.id,
              data.name,
              data.city,
              data.state,
              data.country,
              data.status,
              displayName,
              data.address ?? null,
              data.zip_code ?? null,
              fullAddress,
              data.phone ?? null,
              data.email ?? null,
              data.google_maps_url ?? null,
              data.store_id ?? null,
              data.order_link ?? null,
              data.is_headquarters ? 1 : 0,
              data.note ?? null,
              data.priority ?? 0,
              timestamp,
              timestamp,
            ]
          );

          if (autoCreateServiceAreas && data.status === "active") {
            const existingArea = dbGet<ServiceArea>(
              "SELECT * FROM service_areas WHERE business_id = ? AND city = ? AND state = ?",
              [req.params.id, data.city, data.state]
            );

            if (!existingArea) {
              const serviceAreaSlug = toCityStateSlug(data.city, data.state);
              dbRun(
                `INSERT INTO service_areas (
                  id, business_id, slug, city, state, country, location_id, priority, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  generateId(),
                  req.params.id,
                  serviceAreaSlug,
                  data.city,
                  data.state,
                  data.country,
                  id,
                  data.priority ?? 0,
                  timestamp,
                  timestamp,
                ]
              );
            } else {
              dbRun(
                "UPDATE service_areas SET location_id = ?, updated_at = ? WHERE id = ?",
                [id, timestamp, existingArea.id]
              );
            }
          }

          const location = dbGet<Location>(
            "SELECT * FROM locations WHERE id = ?",
            [id]
          );
          if (location) {
            created.push(location);
          }
        } catch (error) {
          errors.push({
            index,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      });

      res.status(201).json({
        created: created.length,
        failed: errors.length,
        locations: created,
        errors,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
