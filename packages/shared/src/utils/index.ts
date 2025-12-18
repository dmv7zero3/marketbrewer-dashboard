/**
 * Utility functions for @marketbrewer/shared
 */

import type { Business } from "../types/business";
import type { QuestionnaireDataStructure } from "../types/questionnaire";

/**
 * Convert a string to a URL-friendly slug
 * Transliterates diacritics for SEO-friendly URLs (San José → san-jose)
 * Matches real-world search behavior where users type without accents
 */
export function toSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD") // Decompose combined characters (é → e + ́)
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritical marks
    .replace(/[^\w\s-]/g, "") // Remove non-alphanumeric except spaces and hyphens
    .replace(/[\s_-]+/g, "-") // Replace spaces/underscores with single hyphen
    .replace(/^-+|-+$/g, ""); // Trim hyphens from start/end
}

/**
 * Generate a city-state slug (e.g., "sterling-va")
 */
export function toCityStateSlug(city: string, state: string): string {
  return `${toSlug(city)}-${state.toLowerCase()}`;
}

/**
 * Generate a URL path for a page
 */
export function generateUrlPath(
  keywordSlug: string | null,
  serviceAreaSlug: string
): string {
  if (keywordSlug) {
    return `/${keywordSlug}/${serviceAreaSlug}`;
  }
  return `/${serviceAreaSlug}`;
}

/**
 * Generate a unique ID (simple UUID v4 alternative)
 */
export function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Calculate Business Profile V1 completeness score (0-100)
 */

export interface CompletenessScoreInput {
  business: Pick<
    Business,
    | "name"
    | "industry_type"
    | "phone"
    | "email"
    | "website"
    | "gbp_url"
    | "primary_city"
    | "primary_state"
  >;
  questionnaire: QuestionnaireDataStructure;
  socialLinkCount: number;
  hasHours: boolean;
  hasFullAddress: boolean;
}

export function calculateCompletenessScore(
  input: CompletenessScoreInput
): number {
  const { business, questionnaire, socialLinkCount, hasHours, hasFullAddress } =
    input;

  // Required minimums
  if (!business.name?.trim() || !business.industry_type?.trim()) {
    return 0;
  }

  let score = 0;

  // Contact (20)
  if (business.phone) score += 8;
  if (business.email) score += 4;
  if (business.website) score += 4;
  if (business.gbp_url) score += 4;

  // Location (15)
  if (business.primary_city && business.primary_state) score += 10;
  if (hasFullAddress) score += 5;

  // Identity (15)
  if (questionnaire.identity?.tagline) score += 8;
  if (questionnaire.identity?.yearEstablished) score += 4;
  if (questionnaire.identity?.ownerName) score += 3;

  // Services (20)
  const services = questionnaire.services?.offerings || [];
  if (services.length >= 1) score += 10;
  if (services.some((s) => !!s.isPrimary)) score += 5;
  if (services.length >= 3) score += 5;

  // Brand (15)
  if (questionnaire.brand?.voiceTone) score += 5;
  if (questionnaire.brand?.callToAction) score += 5;
  if ((questionnaire.brand?.forbiddenTerms || []).length > 0) score += 5;

  // Social & Hours (15)
  if (socialLinkCount >= 1) score += 5;
  if (socialLinkCount >= 3) score += 5;
  if (hasHours) score += 5;

  return Math.max(0, Math.min(100, score));
}
