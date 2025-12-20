/**
 * Business entity types for MarketBrewer SEO Platform
 */

// ============================================
// INDUSTRY TYPES (Schema.org LocalBusiness)
// ============================================

export const INDUSTRY_CATEGORIES = [
  "Food & Beverage",
  "Professional Services",
  "Health & Medical",
  "Home Services",
  "Automotive",
  "Beauty & Wellness",
  "Retail",
  "Other",
] as const;

export type IndustryCategory = (typeof INDUSTRY_CATEGORIES)[number];

export interface IndustryType {
  value: string;
  label: string;
  category: IndustryCategory;
}

export const INDUSTRY_TYPES: readonly IndustryType[] = [
  // Food & Beverage
  { value: "Restaurant", label: "Restaurant", category: "Food & Beverage" },
  {
    value: "FastFoodRestaurant",
    label: "Fast Food Restaurant",
    category: "Food & Beverage",
  },
  { value: "BarOrPub", label: "Bar / Pub", category: "Food & Beverage" },
  {
    value: "CafeOrCoffeeShop",
    label: "Cafe / Coffee Shop",
    category: "Food & Beverage",
  },
  { value: "Bakery", label: "Bakery", category: "Food & Beverage" },

  // Professional Services
  {
    value: "Attorney",
    label: "Attorney / Law Firm",
    category: "Professional Services",
  },
  {
    value: "AccountingService",
    label: "Accounting / CPA",
    category: "Professional Services",
  },
  {
    value: "FinancialService",
    label: "Financial Services",
    category: "Professional Services",
  },
  {
    value: "InsuranceAgency",
    label: "Insurance Agency",
    category: "Professional Services",
  },
  {
    value: "RealEstateAgent",
    label: "Real Estate Agent",
    category: "Professional Services",
  },

  // Health & Medical
  { value: "Dentist", label: "Dentist", category: "Health & Medical" },
  {
    value: "Physician",
    label: "Physician / Doctor",
    category: "Health & Medical",
  },
  {
    value: "Optician",
    label: "Optician / Eye Care",
    category: "Health & Medical",
  },
  { value: "Pharmacy", label: "Pharmacy", category: "Health & Medical" },
  {
    value: "VeterinaryCare",
    label: "Veterinarian",
    category: "Health & Medical",
  },

  // Home Services
  { value: "Plumber", label: "Plumber", category: "Home Services" },
  { value: "Electrician", label: "Electrician", category: "Home Services" },
  { value: "HVACBusiness", label: "HVAC", category: "Home Services" },
  {
    value: "RoofingContractor",
    label: "Roofing",
    category: "Home Services",
  },
  {
    value: "GeneralContractor",
    label: "General Contractor",
    category: "Home Services",
  },
  {
    value: "HomeAndConstructionBusiness",
    label: "Landscaping",
    category: "Home Services",
  },
  {
    value: "MovingCompany",
    label: "Moving Company",
    category: "Home Services",
  },
  { value: "Locksmith", label: "Locksmith", category: "Home Services" },

  // Automotive
  { value: "AutoRepair", label: "Auto Repair", category: "Automotive" },
  { value: "AutoDealer", label: "Auto Dealer", category: "Automotive" },
  {
    value: "AutoBodyShop",
    label: "Auto Body Shop",
    category: "Automotive",
  },

  // Beauty & Wellness
  { value: "HairSalon", label: "Hair Salon", category: "Beauty & Wellness" },
  {
    value: "BeautySalon",
    label: "Beauty Salon",
    category: "Beauty & Wellness",
  },
  { value: "DaySpa", label: "Day Spa", category: "Beauty & Wellness" },
  {
    value: "HealthClub",
    label: "Gym / Health Club",
    category: "Beauty & Wellness",
  },

  // Retail
  { value: "Store", label: "Retail Store", category: "Retail" },
  {
    value: "ClothingStore",
    label: "Clothing Store",
    category: "Retail",
  },
  {
    value: "JewelryStore",
    label: "Jewelry Store",
    category: "Retail",
  },
  { value: "Florist", label: "Florist", category: "Retail" },

  // Other
  { value: "ChildCare", label: "Child Care / Daycare", category: "Other" },
  {
    value: "EducationalOrganization",
    label: "Educational / Tutoring",
    category: "Other",
  },
  { value: "TravelAgency", label: "Travel Agency", category: "Other" },
  {
    value: "LocalBusiness",
    label: "Other Local Business",
    category: "Other",
  },
] as const;

export function getIndustryLabel(industryType: string): string {
  const found = INDUSTRY_TYPES.find((i) => i.value === industryType);
  return found?.label ?? industryType;
}

export function getIndustryByCategory(): Record<
  IndustryCategory,
  IndustryType[]
> {
  const grouped: Record<string, IndustryType[]> = {};
  for (const industry of INDUSTRY_TYPES) {
    if (!grouped[industry.category]) {
      grouped[industry.category] = [];
    }
    grouped[industry.category].push(industry);
  }
  return grouped as Record<IndustryCategory, IndustryType[]>;
}

// ============================================
// BUSINESS ENTITY
// ============================================

export interface Business {
  id: string;

  // Required (V1)
  name: string;

  // Backward compatible: legacy industry label/slug
  industry: string;

  // V1 redesign: Schema.org subtype
  industry_type?: string | null;

  // Contact (optional)
  phone: string | null;
  email: string | null;
  website: string | null;

  // Primary location (denormalized for quick access)
  primary_city?: string | null;
  primary_state?: string | null;

  // Google Business Profile
  gbp_url?: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface Questionnaire {
  id: string;
  business_id: string;
  data: Record<string, unknown>;
  completeness_score: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// PROFILE LOCATION
// ============================================

export type LocationType = "physical" | "service_area";

export interface BusinessLocation {
  id: string;
  business_id: string;

  location_type: LocationType;
  is_primary: boolean;

  street_address: string | null;
  city: string;
  state: string;
  postal_code: string | null;
  country: string;

  latitude: number | null;
  longitude: number | null;

  created_at: string;
}

// ============================================
// SERVICE TYPE
// ============================================

export type ServiceType = "onsite" | "mobile" | "both";

// ============================================
// BUSINESS HOURS
// ============================================

export type DayOfWeek =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export const DAYS_OF_WEEK: readonly DayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export interface BusinessHours {
  id: string;
  business_id: string;
  day_of_week: DayOfWeek;
  opens: string | null;
  closes: string | null;
  is_closed: boolean;
}

// ============================================
// SOCIAL LINKS
// ============================================

export type SocialPlatform =
  | "facebook"
  | "instagram"
  | "twitter"
  | "linkedin"
  | "youtube"
  | "tiktok"
  | "yelp"
  | "google"
  | "linktree";

export const SOCIAL_PLATFORMS: readonly {
  value: SocialPlatform;
  label: string;
}[] = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "twitter", label: "Twitter / X" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "yelp", label: "Yelp" },
  { value: "google", label: "Google Business" },
  { value: "linktree", label: "Linktree" },
] as const;

export interface BusinessSocialLink {
  id: string;
  business_id: string;
  platform: SocialPlatform;
  url: string;
}

export interface Keyword {
  id: string;
  business_id: string;
  slug: string;
  keyword: string;
  search_intent: string | null;
  language: "en" | "es";
  created_at: string;
}

/**
 * Service Area = Cities you want to target for SEO content
 * These are nearby/surrounding cities, NOT the cities where stores are located.
 * Example: Store in Manassas → service areas might be Centreville, Bull Run, Gainesville
 */
export interface ServiceArea {
  id: string;
  business_id: string;
  slug: string;
  city: string;
  state: string;
  country: string;
  county: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
  location_id?: string | null; // Optional: link to nearest physical location
}

export interface PromptTemplate {
  id: string;
  business_id: string;
  page_type: "location-keyword" | "service-area";
  version: number;
  template: string;
  required_variables: string | null;
  optional_variables: string | null;
  word_count_target: number;
  is_active: number;
  created_at: string;
}
