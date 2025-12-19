/**
 * Keywords CRUD routes
 */

import { Router, Request, Response, NextFunction } from "express";
import { dbRun, dbGet, dbAll } from "../db/connection";
import type { Keyword, Business } from "@marketbrewer/shared";
import { HttpError } from "../middleware/error-handler";
import { generateId, toSlug } from "@marketbrewer/shared";

const router = Router();

/**
 * GET /businesses/:id/keywords - List keywords for a business
 */
router.get(
  "/:id/keywords",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = req.params.id;
      const keywords = dbAll<Keyword>(
        "SELECT * FROM keywords WHERE business_id = ? ORDER BY created_at DESC",
        [businessId]
      );
      res.json({ keywords });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /businesses/:id/keywords - Create a keyword
 */
router.post(
  "/:id/keywords",
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
      const { keyword, search_intent, language } = req.body as {
        keyword: string;
        search_intent?: string | null;
        language?: "en" | "es";
      };
      if (!keyword || typeof keyword !== "string") {
        throw new HttpError(400, "Keyword is required", "VALIDATION_ERROR");
      }
      if (language !== undefined && language !== "en" && language !== "es") {
        throw new HttpError(400, "Invalid language", "VALIDATION_ERROR");
      }
      const id = generateId();
      const slug = toSlug(keyword);
      const now = new Date().toISOString();
      dbRun(
        `INSERT INTO keywords (id, business_id, slug, keyword, search_intent, language, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          businessId,
          slug,
          keyword,
          search_intent ?? null,
          language ?? "en",
          now,
        ]
      );
      const created = dbGet<Keyword>("SELECT * FROM keywords WHERE id = ?", [
        id,
      ]);
      res.status(201).json({ keyword: created });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /businesses/:id/keywords/:keywordId - Update a keyword
 */
router.put(
  "/:id/keywords/:keywordId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: businessId, keywordId } = req.params;
      const existing = dbGet<Keyword>(
        "SELECT * FROM keywords WHERE id = ? AND business_id = ?",
        [keywordId, businessId]
      );
      if (!existing) {
        throw new HttpError(404, "Keyword not found", "NOT_FOUND");
      }
      const { keyword, search_intent, language } = req.body as {
        keyword?: string;
        search_intent?: string | null;
        language?: "en" | "es";
      };
      const updates: string[] = [];
      const values: unknown[] = [];
      if (keyword !== undefined) {
        updates.push("keyword = ?");
        values.push(keyword);
        updates.push("slug = ?");
        values.push(toSlug(keyword));
      }
      if (search_intent !== undefined) {
        updates.push("search_intent = ?");
        values.push(search_intent ?? null);
      }
      if (language !== undefined) {
        if (language !== "en" && language !== "es") {
          throw new HttpError(400, "Invalid language", "VALIDATION_ERROR");
        }
        updates.push("language = ?");
        values.push(language);
      }
      if (updates.length === 0) {
        res.json({ keyword: existing });
        return;
      }
      values.push(keywordId);
      dbRun(`UPDATE keywords SET ${updates.join(", ")} WHERE id = ?`, values);
      const updated = dbGet<Keyword>("SELECT * FROM keywords WHERE id = ?", [
        keywordId,
      ]);
      res.json({ keyword: updated });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /businesses/:id/keywords/:keywordId - Delete a keyword
 */
router.delete(
  "/:id/keywords/:keywordId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: businessId, keywordId } = req.params;
      const existing = dbGet<Keyword>(
        "SELECT * FROM keywords WHERE id = ? AND business_id = ?",
        [keywordId, businessId]
      );
      if (!existing) {
        throw new HttpError(404, "Keyword not found", "NOT_FOUND");
      }
      dbRun("DELETE FROM keywords WHERE id = ?", [keywordId]);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
