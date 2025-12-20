/**
 * Questionnaire data types for MarketBrewer SEO Platform
 * V1 Business Profile Redesign (December 2025)
 */

export enum SearchIntent {
  TRANSACTIONAL = "transactional",
  INFORMATIONAL = "informational",
  NAVIGATIONAL = "navigational",
  LOCAL = "local",
  COMMERCIAL = "commercial",
}

export enum BrandVoiceTone {
  PROFESSIONAL = "professional",
  CASUAL = "casual",
  FRIENDLY = "friendly",
  AUTHORITATIVE = "authoritative",
  PLAYFUL = "playful",
}

export interface ServiceOffering {
  name: string;        // English name (required)
  slug: string;        // URL-friendly slug (auto-generated from EN name)
  isPrimary: boolean;
  nameEs?: string;     // Spanish name (optional)
}

export interface QuestionnaireDataStructure {
  // Identity (simplified)
  identity: {
    tagline: string;
    yearEstablished: string;
    ownerName: string;
  };

  // Services section
  services: {
    offerings: ServiceOffering[];
  };

  // Audience (simplified)
  audience: {
    targetDescription: string;
    languages: string[];
  };

  // Brand (simplified)
  brand: {
    voiceTone: BrandVoiceTone | string;
    forbiddenTerms: string[];
    callToAction: string;
  };

  // Service type (moved from old location section)
  serviceType: "onsite" | "mobile" | "both";

  // Social media profiles
  socialProfiles?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    google?: string;
    linktree?: string;
    [key: string]: string | undefined;
  };

  // SEO content generation settings
  seoSettings?: {
    enabledLanguages: string[]; // e.g., ["en", "es"] - languages to generate content for
  };

  // Future: industry-specific data
  industryData?: Record<string, unknown>;
}

/**
 * Get default/empty questionnaire data structure
 */
export function createEmptyQuestionnaire(): QuestionnaireDataStructure {
  return {
    identity: {
      tagline: "",
      yearEstablished: "",
      ownerName: "",
    },
    services: {
      offerings: [],
    },
    audience: {
      targetDescription: "",
      languages: [],
    },
    brand: {
      voiceTone: BrandVoiceTone.PROFESSIONAL,
      forbiddenTerms: [],
      callToAction: "",
    },
    serviceType: "onsite",
    socialProfiles: {
      instagram: "",
      facebook: "",
      twitter: "",
      linkedin: "",
      google: "",
      linktree: "",
    },
    seoSettings: {
      enabledLanguages: ["en"], // Default to English only
    },
  };
}

/**
 * Best-effort normalization for legacy saved questionnaire payloads.
 * Allows the UI/server to load older data without breaking.
 */
export function normalizeQuestionnaireData(
  raw: unknown
): QuestionnaireDataStructure {
  const base = createEmptyQuestionnaire();

  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;

  // Legacy V0 shape (identity/location/audience/brand)
  const identity = (obj.identity ?? {}) as Record<string, unknown>;
  const audience = (obj.audience ?? {}) as Record<string, unknown>;
  const brand = (obj.brand ?? {}) as Record<string, unknown>;
  const location = (obj.location ?? {}) as Record<string, unknown>;

  const legacyOwnerName =
    typeof identity.contactName === "string" ? identity.contactName : "";

  const legacyServiceType =
    typeof location.serviceType === "string" ? location.serviceType : undefined;

  const legacyForbiddenWords = Array.isArray(brand.forbiddenWords)
    ? (brand.forbiddenWords.filter((x) => typeof x === "string") as string[])
    : [];

  const next: QuestionnaireDataStructure = {
    ...base,
    identity: {
      tagline:
        typeof identity.tagline === "string"
          ? identity.tagline
          : base.identity.tagline,
      yearEstablished:
        typeof identity.yearEstablished === "string"
          ? identity.yearEstablished
          : base.identity.yearEstablished,
      ownerName:
        typeof identity.ownerName === "string"
          ? identity.ownerName
          : legacyOwnerName,
    },
    services:
      obj.services && typeof obj.services === "object"
        ? (obj.services as QuestionnaireDataStructure["services"])
        : base.services,
    audience: {
      targetDescription:
        typeof audience.targetDescription === "string"
          ? audience.targetDescription
          : base.audience.targetDescription,
      languages: Array.isArray(audience.languages)
        ? (audience.languages.filter((x) => typeof x === "string") as string[])
        : base.audience.languages,
    },
    brand: {
      voiceTone:
        typeof brand.voiceTone === "string"
          ? brand.voiceTone
          : base.brand.voiceTone,
      callToAction:
        typeof brand.callToAction === "string"
          ? brand.callToAction
          : base.brand.callToAction,
      forbiddenTerms: Array.isArray(brand.forbiddenTerms)
        ? (brand.forbiddenTerms.filter(
            (x) => typeof x === "string"
          ) as string[])
        : legacyForbiddenWords,
    },
    serviceType:
      legacyServiceType === "onsite" ||
      legacyServiceType === "mobile" ||
      legacyServiceType === "both"
        ? legacyServiceType
        : typeof obj.serviceType === "string" &&
          (obj.serviceType === "onsite" ||
            obj.serviceType === "mobile" ||
            obj.serviceType === "both")
        ? obj.serviceType
        : base.serviceType,
    socialProfiles:
      obj.socialProfiles && typeof obj.socialProfiles === "object"
        ? (obj.socialProfiles as QuestionnaireDataStructure["socialProfiles"])
        : base.socialProfiles,
    industryData:
      obj.industryData && typeof obj.industryData === "object"
        ? (obj.industryData as Record<string, unknown>)
        : base.industryData,
    seoSettings:
      obj.seoSettings && typeof obj.seoSettings === "object"
        ? {
            enabledLanguages: Array.isArray(
              (obj.seoSettings as Record<string, unknown>).enabledLanguages
            )
              ? ((obj.seoSettings as Record<string, unknown>).enabledLanguages as string[])
              : base.seoSettings?.enabledLanguages ?? ["en"],
          }
        : base.seoSettings,
  };

  return next;
}
