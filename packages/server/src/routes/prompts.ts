/**
 * Prompt templates CRUD routes
 */

import { Router, Request, Response, NextFunction } from "express";
import { dbRun, dbGet, dbAll } from "../db/connection";
import type { PromptTemplate, Business } from "@marketbrewer/shared";
import { HttpError } from "../middleware/error-handler";
import { generateId } from "@marketbrewer/shared";

const router = Router();

/**
 * GET /businesses/:id/prompts - List prompt templates for a business
 */
router.get(
  "/:id/prompts",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = req.params.id;
      const templates = dbAll<PromptTemplate>(
        "SELECT * FROM prompt_templates WHERE business_id = ? ORDER BY page_type ASC, version DESC, created_at DESC",
        [businessId]
      );
      res.json({ prompt_templates: templates });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /businesses/:id/prompts/:promptId - Get a single prompt template
 */
router.get(
  "/:id/prompts/:promptId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: businessId, promptId } = req.params;
      const template = dbGet<PromptTemplate>(
        "SELECT * FROM prompt_templates WHERE id = ? AND business_id = ?",
        [promptId, businessId]
      );
      if (!template) {
        throw new HttpError(404, "Prompt template not found", "NOT_FOUND");
      }
      res.json({ prompt_template: template });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /businesses/:id/prompts - Create a prompt template
 */
router.post(
  "/:id/prompts",
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

      const {
        page_type,
        version,
        template,
        required_variables,
        optional_variables,
        word_count_target,
        is_active,
      } = req.body as {
        page_type: "service-location" | "keyword-location";
        version: number;
        template: string;
        required_variables?: string[];
        optional_variables?: string[];
        word_count_target: number;
        is_active?: boolean;
      };

      // Validate required fields
      if (
        !page_type ||
        !["service-location", "keyword-location"].includes(page_type)
      ) {
        throw new HttpError(
          400,
          "Invalid page_type. Must be 'service-location' or 'keyword-location'",
          "VALIDATION_ERROR"
        );
      }

      if (version === undefined || typeof version !== "number" || version < 1) {
        throw new HttpError(
          400,
          "Version is required and must be a positive number",
          "VALIDATION_ERROR"
        );
      }

      if (
        !template ||
        typeof template !== "string" ||
        template.trim().length === 0
      ) {
        throw new HttpError(
          400,
          "Template content is required",
          "VALIDATION_ERROR"
        );
      }

      if (
        word_count_target === undefined ||
        typeof word_count_target !== "number" ||
        word_count_target < 1
      ) {
        throw new HttpError(
          400,
          "word_count_target is required and must be a positive number",
          "VALIDATION_ERROR"
        );
      }

      // Check for duplicate page_type + version combination
      const existing = dbGet<PromptTemplate>(
        "SELECT * FROM prompt_templates WHERE business_id = ? AND page_type = ? AND version = ?",
        [businessId, page_type, version]
      );
      if (existing) {
        throw new HttpError(
          409,
          `A template for ${page_type} version ${version} already exists`,
          "DUPLICATE_ERROR"
        );
      }

      const id = generateId();
      const now = new Date().toISOString();

      // Convert arrays to JSON strings for storage
      const requiredVarsJson = required_variables
        ? JSON.stringify(required_variables)
        : null;
      const optionalVarsJson = optional_variables
        ? JSON.stringify(optional_variables)
        : null;
      const isActiveValue = is_active === false ? 0 : 1;

      dbRun(
        `INSERT INTO prompt_templates (id, business_id, page_type, version, template, required_variables, optional_variables, word_count_target, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          businessId,
          page_type,
          version,
          template,
          requiredVarsJson,
          optionalVarsJson,
          word_count_target,
          isActiveValue,
          now,
        ]
      );

      const created = dbGet<PromptTemplate>(
        "SELECT * FROM prompt_templates WHERE id = ?",
        [id]
      );
      res.status(201).json({ prompt_template: created });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /businesses/:id/prompts/:promptId - Update a prompt template
 */
router.put(
  "/:id/prompts/:promptId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: businessId, promptId } = req.params;
      const existing = dbGet<PromptTemplate>(
        "SELECT * FROM prompt_templates WHERE id = ? AND business_id = ?",
        [promptId, businessId]
      );
      if (!existing) {
        throw new HttpError(404, "Prompt template not found", "NOT_FOUND");
      }

      const {
        page_type,
        version,
        template,
        required_variables,
        optional_variables,
        word_count_target,
        is_active,
      } = req.body as {
        page_type?: "service-location" | "keyword-location";
        version?: number;
        template?: string;
        required_variables?: string[];
        optional_variables?: string[];
        word_count_target?: number;
        is_active?: boolean;
      };

      const updates: string[] = [];
      const values: unknown[] = [];

      if (page_type !== undefined) {
        if (!["service-location", "keyword-location"].includes(page_type)) {
          throw new HttpError(
            400,
            "Invalid page_type. Must be 'service-location' or 'keyword-location'",
            "VALIDATION_ERROR"
          );
        }
        updates.push("page_type = ?");
        values.push(page_type);
      }

      if (version !== undefined) {
        if (typeof version !== "number" || version < 1) {
          throw new HttpError(
            400,
            "Version must be a positive number",
            "VALIDATION_ERROR"
          );
        }
        updates.push("version = ?");
        values.push(version);
      }

      if (template !== undefined) {
        if (typeof template !== "string" || template.trim().length === 0) {
          throw new HttpError(
            400,
            "Template content cannot be empty",
            "VALIDATION_ERROR"
          );
        }
        updates.push("template = ?");
        values.push(template);
      }

      if (required_variables !== undefined) {
        updates.push("required_variables = ?");
        values.push(
          required_variables ? JSON.stringify(required_variables) : null
        );
      }

      if (optional_variables !== undefined) {
        updates.push("optional_variables = ?");
        values.push(
          optional_variables ? JSON.stringify(optional_variables) : null
        );
      }

      if (word_count_target !== undefined) {
        if (typeof word_count_target !== "number" || word_count_target < 1) {
          throw new HttpError(
            400,
            "word_count_target must be a positive number",
            "VALIDATION_ERROR"
          );
        }
        updates.push("word_count_target = ?");
        values.push(word_count_target);
      }

      if (is_active !== undefined) {
        updates.push("is_active = ?");
        values.push(is_active ? 1 : 0);
      }

      if (updates.length === 0) {
        res.json({ prompt_template: existing });
        return;
      }

      // Check for duplicate page_type + version combination if either is being updated
      if (page_type !== undefined || version !== undefined) {
        const newPageType = page_type ?? existing.page_type;
        const newVersion = version ?? existing.version;

        const duplicate = dbGet<PromptTemplate>(
          "SELECT * FROM prompt_templates WHERE business_id = ? AND page_type = ? AND version = ? AND id != ?",
          [businessId, newPageType, newVersion, promptId]
        );
        if (duplicate) {
          throw new HttpError(
            409,
            `A template for ${newPageType} version ${newVersion} already exists`,
            "DUPLICATE_ERROR"
          );
        }
      }

      values.push(promptId);
      dbRun(
        `UPDATE prompt_templates SET ${updates.join(", ")} WHERE id = ?`,
        values
      );

      const updated = dbGet<PromptTemplate>(
        "SELECT * FROM prompt_templates WHERE id = ?",
        [promptId]
      );
      res.json({ prompt_template: updated });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /businesses/:id/prompts/:promptId - Delete a prompt template
 */
router.delete(
  "/:id/prompts/:promptId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: businessId, promptId } = req.params;
      const existing = dbGet<PromptTemplate>(
        "SELECT * FROM prompt_templates WHERE id = ? AND business_id = ?",
        [promptId, businessId]
      );
      if (!existing) {
        throw new HttpError(404, "Prompt template not found", "NOT_FOUND");
      }
      dbRun("DELETE FROM prompt_templates WHERE id = ?", [promptId]);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
