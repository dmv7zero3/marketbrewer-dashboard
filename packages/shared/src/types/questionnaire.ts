/**
 * Questionnaire data types for MarketBrewer SEO Platform
 * Represents structured business profile information for content generation
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
  name: string;
  description: string;
  isPrimary: boolean;
}

export interface QuestionnaireDataStructure {
  // Identity section
  identity: {
    businessName: string;
    industry: string;
    tagline: string;
    yearEstablished: string;
    contactName: string;
  };

  // Location section
  location: {
    address: string;
    serviceType: "onsite" | "mobile" | "both";
  };

  // Services section
  services: {
    offerings: ServiceOffering[];
  };

  // Audience section
  audience: {
    targetDescription: string;
    demographics: string;
    painPoints: string;
    languages: string[];
  };

  // Brand section
  brand: {
    voiceTone: BrandVoiceTone | string;
    requiredPhrases: string[];
    forbiddenWords: string[];
    callToAction: string;
  };
}

/**
 * Completeness tracking for each section
 * Helps track which sections have been filled out
 */
export interface SectionCompleteness {
  identity: boolean;
  location: boolean;
  services: boolean;
  audience: boolean;
  brand: boolean;
}

/**
 * Calculate overall completeness percentage
 */
export function calculateCompleteness(
  completeness: SectionCompleteness
): number {
  const sections = Object.values(completeness);
  const complete = sections.filter((c) => c).length;
  return Math.round((complete / sections.length) * 100);
}

/**
 * Check if section has required fields filled
 */
export function isSectionComplete(
  section: keyof QuestionnaireDataStructure,
  data: QuestionnaireDataStructure
): boolean {
  switch (section) {
    case "identity":
      return !!(
        data.identity.businessName &&
        data.identity.industry &&
        data.identity.contactName
      );
    case "location":
      return !!(data.location.address && data.location.serviceType);
    case "services":
      return data.services.offerings.length > 0;
    case "audience":
      return !!(
        data.audience.targetDescription &&
        data.audience.demographics &&
        data.audience.painPoints
      );
    case "brand":
      return !!(
        data.brand.voiceTone &&
        data.brand.callToAction &&
        data.brand.requiredPhrases.length > 0
      );
    default:
      return false;
  }
}

/**
 * Get default/empty questionnaire data structure
 */
export function createEmptyQuestionnaire(): QuestionnaireDataStructure {
  return {
    identity: {
      businessName: "",
      industry: "",
      tagline: "",
      yearEstablished: new Date().getFullYear().toString(),
      contactName: "",
    },
    location: {
      address: "",
      serviceType: "onsite",
    },
    services: {
      offerings: [],
    },
    audience: {
      targetDescription: "",
      demographics: "",
      painPoints: "",
      languages: [],
    },
    brand: {
      voiceTone: BrandVoiceTone.PROFESSIONAL,
      requiredPhrases: [],
      forbiddenWords: [],
      callToAction: "",
    },
  };
}
