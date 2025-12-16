/**
 * Utility functions for @marketbrewer/shared
 */

/**
 * Convert a string to a URL-friendly slug
 */
export function toSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
 * Calculate questionnaire completeness score
 */
export function calculateCompletenessScore(
  data: Record<string, unknown>
): number {
  const requiredFields = [
    "business_name",
    "industry",
    "phone",
    "services",
    "service_areas",
    "target_audience",
  ];

  const optionalFields = [
    "website",
    "email",
    "address",
    "tagline",
    "year_established",
    "differentiators",
    "testimonials",
    "awards",
    "brand_voice",
    "cta_text",
  ];

  let score = 0;
  const requiredWeight = 60 / requiredFields.length;
  const optionalWeight = 40 / optionalFields.length;

  for (const field of requiredFields) {
    if (
      data[field] !== undefined &&
      data[field] !== null &&
      data[field] !== ""
    ) {
      score += requiredWeight;
    }
  }

  for (const field of optionalFields) {
    if (
      data[field] !== undefined &&
      data[field] !== null &&
      data[field] !== ""
    ) {
      score += optionalWeight;
    }
  }

  return Math.round(Math.min(100, score));
}
