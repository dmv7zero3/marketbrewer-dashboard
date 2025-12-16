/**
 * Business entity types for MarketBrewer SEO Platform
 */

export interface Business {
  id: string;
  name: string;
  industry: string;
  website: string | null;
  phone: string | null;
  email: string | null;
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

export interface Keyword {
  id: string;
  business_id: string;
  slug: string;
  keyword: string;
  search_intent: string | null;
  priority: number;
  created_at: string;
}

export interface ServiceArea {
  id: string;
  business_id: string;
  slug: string;
  city: string;
  state: string;
  county: string | null;
  priority: number;
  created_at: string;
}

export interface PromptTemplate {
  id: string;
  business_id: string;
  page_type: "service-location" | "keyword-location";
  version: number;
  template: string;
  required_variables: string | null;
  optional_variables: string | null;
  word_count_target: number;
  is_active: number;
  created_at: string;
}
