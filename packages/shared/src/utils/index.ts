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

  // Required minimum - profile is 0% if missing business name
  if (!business.name?.trim()) {
    return 0;
  }

  let score = 0;
  const maxScore = 100;

  // === ESSENTIALS SECTION (30 points) ===
  // Business Details
  if (business.phone) score += 5;
  if (business.email) score += 5;
  if (business.website) score += 5;
  if (business.gbp_url) score += 5;

  // Primary Location
  if (business.primary_city?.trim()) score += 2.5;
  if (business.primary_state?.trim()) score += 2.5;

  // === LOCATION & HOURS SECTION (20 points) ===
  if (hasFullAddress) score += 10;
  if (hasHours) score += 10;

  // === CONTENT PROFILE SECTION (50 points) ===

  // Identity (12 points)
  if (questionnaire.identity?.tagline?.trim()) score += 4;
  if (questionnaire.identity?.yearEstablished?.toString()?.trim()) score += 4;
  if (questionnaire.identity?.ownerName?.trim()) score += 4;

  // Services (12 points)
  const services = questionnaire.services?.offerings || [];
  if (services.length >= 1) score += 4;
  if (services.some((s) => s?.isPrimary)) score += 4;
  if (services.length >= 2) score += 4;

  // Audience (13 points)
  if (questionnaire.audience?.targetDescription?.trim()) score += 6;
  if ((questionnaire.audience?.languages || []).length > 0) score += 7;

  // Brand (13 points)
  if (questionnaire.brand?.voiceTone?.trim()) score += 5;
  if (questionnaire.brand?.callToAction?.trim()) score += 5;
  if ((questionnaire.brand?.forbiddenTerms || []).length > 0) score += 3;

  // === SOCIAL LINKS SECTION (bonus 5 points if present, up to max 100) ===
  if (socialLinkCount >= 1) score += 2;
  if (socialLinkCount >= 2) score += 2;
  if (socialLinkCount >= 3) score += 1;

  return Math.max(0, Math.min(maxScore, Math.round(score)));
}
