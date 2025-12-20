/**
 * VariableReference component - Documents available template variables
 */

import React, { useState } from "react";

type VariableCategory = "required" | "optional" | "keyword" | "service" | "output";

interface Variable {
  name: string;
  description: string;
  source: string;
  example?: string;
  category: VariableCategory;
}

const VARIABLES: Variable[] = [
  // Required (Core)
  {
    name: "business_name",
    description: "Name of the business",
    source: "Business Profile",
    example: "Nash Smashed Burgers",
    category: "required",
  },
  {
    name: "city",
    description: "Target city name",
    source: "Service Area / Location",
    example: "Arlington",
    category: "required",
  },
  {
    name: "state",
    description: "2-letter state code",
    source: "Service Area / Location",
    example: "VA",
    category: "required",
  },
  {
    name: "phone",
    description: "Business phone number",
    source: "Business Profile",
    example: "(555) 123-4567",
    category: "required",
  },

  // Optional (Business)
  {
    name: "industry",
    description: "Business industry type",
    source: "Business Profile",
    example: "Restaurant",
    category: "optional",
  },
  {
    name: "industry_type",
    description: "Schema.org industry subtype",
    source: "Business Profile",
    example: "FastFoodRestaurant",
    category: "optional",
  },
  {
    name: "website",
    description: "Business website URL",
    source: "Business Profile",
    example: "https://example.com",
    category: "optional",
  },
  {
    name: "email",
    description: "Business email address",
    source: "Business Profile",
    example: "info@example.com",
    category: "optional",
  },
  {
    name: "gbp_url",
    description: "Google Business Profile URL",
    source: "Business Profile",
    example: "https://maps.google.com/...",
    category: "optional",
  },

  // Optional (Questionnaire)
  {
    name: "tagline",
    description: "Business tagline or slogan",
    source: "Questionnaire > Identity",
    example: "Your trusted local partner",
    category: "optional",
  },
  {
    name: "year_established",
    description: "Year business was founded",
    source: "Questionnaire > Identity",
    example: "2010",
    category: "optional",
  },
  {
    name: "years_experience",
    description: "Calculated years in business",
    source: "Questionnaire > Identity",
    example: "15",
    category: "optional",
  },
  {
    name: "owner_name",
    description: "Business owner/contact name",
    source: "Questionnaire > Identity",
    example: "John Smith",
    category: "optional",
  },
  {
    name: "target_audience",
    description: "Primary customer demographics",
    source: "Questionnaire > Audience",
    example: "Families with young children",
    category: "optional",
  },
  {
    name: "languages",
    description: "Languages spoken/supported",
    source: "Questionnaire > Audience",
    example: "English, Spanish",
    category: "optional",
  },
  {
    name: "voice_tone",
    description: "Brand voice/tone",
    source: "Questionnaire > Brand",
    example: "professional",
    category: "optional",
  },
  {
    name: "tone",
    description: "Alias for voice_tone",
    source: "Questionnaire > Brand",
    example: "friendly",
    category: "optional",
  },
  {
    name: "cta_text",
    description: "Preferred call-to-action",
    source: "Questionnaire > Brand",
    example: "Call us today for a free consultation",
    category: "optional",
  },
  {
    name: "forbidden_terms",
    description: "Words/phrases to avoid",
    source: "Questionnaire > Brand",
    example: "cheap, discount",
    category: "optional",
  },
  {
    name: "service_type",
    description: "Service delivery type",
    source: "Questionnaire",
    example: "onsite, mobile, both",
    category: "optional",
  },

  // Keyword-specific
  {
    name: "primary_keyword",
    description: "Target SEO keyword (English)",
    source: "Keywords",
    example: "best burgers near me",
    category: "keyword",
  },
  {
    name: "primary_keyword_es",
    description: "Target SEO keyword (Spanish)",
    source: "Keywords",
    example: "mejores hamburguesas cerca",
    category: "keyword",
  },
  {
    name: "search_intent",
    description: "User search intent type",
    source: "Keywords",
    example: "transactional, informational, local",
    category: "keyword",
  },

  // Service-specific
  {
    name: "primary_service",
    description: "Main service offering (English)",
    source: "Services",
    example: "Smash Burgers",
    category: "service",
  },
  {
    name: "primary_service_es",
    description: "Main service offering (Spanish)",
    source: "Services",
    example: "Hamburguesas Smash",
    category: "service",
  },
  {
    name: "services_list",
    description: "Comma-separated list of all services",
    source: "Services",
    example: "Burgers, Fries, Shakes",
    category: "service",
  },

  // Location-specific
  {
    name: "county",
    description: "County name if available",
    source: "Service Area",
    example: "Arlington County",
    category: "optional",
  },
  {
    name: "street_address",
    description: "Physical street address",
    source: "Business Location",
    example: "123 Main St",
    category: "optional",
  },
  {
    name: "postal_code",
    description: "ZIP/postal code",
    source: "Business Location",
    example: "22201",
    category: "optional",
  },

  // Output instructions
  {
    name: "word_count",
    description: "Target word count for body content",
    source: "Template Settings",
    example: "400",
    category: "output",
  },
];

const CATEGORY_INFO: Record<
  VariableCategory,
  { label: string; color: string; description: string }
> = {
  required: {
    label: "Required",
    color: "bg-red-100 text-red-800",
    description: "Must be included in every template for consistent output",
  },
  optional: {
    label: "Optional",
    color: "bg-blue-100 text-blue-800",
    description: "Enhances content quality when available",
  },
  keyword: {
    label: "Keyword",
    color: "bg-purple-100 text-purple-800",
    description: "Used for keyword-targeted pages",
  },
  service: {
    label: "Service",
    color: "bg-green-100 text-green-800",
    description: "Related to business service offerings",
  },
  output: {
    label: "Output",
    color: "bg-gray-100 text-gray-800",
    description: "Controls generation parameters",
  },
};

export const VariableReference: React.FC = () => {
  const [filter, setFilter] = useState<VariableCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredVariables = VARIABLES.filter((v) => {
    const matchesCategory = filter === "all" || v.category === filter;
    const matchesSearch =
      !searchQuery ||
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.source.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const copyVariable = (name: string) => {
    navigator.clipboard.writeText(`{{${name}}}`);
  };

  return (
    <div className="space-y-6">
      {/* Category legend */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(Object.entries(CATEGORY_INFO) as [VariableCategory, typeof CATEGORY_INFO[VariableCategory]][]).map(
          ([key, info]) => (
            <button
              key={key}
              onClick={() => setFilter(filter === key ? "all" : key)}
              className={`p-3 rounded border text-left transition-all ${
                filter === key
                  ? "ring-2 ring-blue-500 border-blue-500"
                  : "hover:bg-gray-50"
              }`}
            >
              <span className={`px-2 py-0.5 text-xs rounded ${info.color}`}>
                {info.label}
              </span>
              <p className="text-xs text-gray-600 mt-1">
                {VARIABLES.filter((v) => v.category === key).length} variables
              </p>
            </button>
          )
        )}
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          className="border rounded px-3 py-2 w-full"
          placeholder="Search variables..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Variables table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border rounded">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                Variable
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                Description
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                Source
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                Example
              </th>
              <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b w-16">
                Copy
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredVariables.map((v) => (
              <tr key={v.name} className="hover:bg-gray-50">
                <td className="px-4 py-2 border-b">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm bg-gray-100 px-1 rounded">
                      {`{{${v.name}}}`}
                    </code>
                    <span
                      className={`px-1.5 py-0.5 text-xs rounded ${
                        CATEGORY_INFO[v.category].color
                      }`}
                    >
                      {CATEGORY_INFO[v.category].label}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2 border-b text-sm text-gray-700">
                  {v.description}
                </td>
                <td className="px-4 py-2 border-b text-sm text-gray-600">
                  {v.source}
                </td>
                <td className="px-4 py-2 border-b text-sm text-gray-500 font-mono">
                  {v.example || "-"}
                </td>
                <td className="px-4 py-2 border-b text-center">
                  <button
                    onClick={() => copyVariable(v.name)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                    title="Copy to clipboard"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredVariables.length === 0 && (
        <p className="text-center text-gray-500 py-8">
          No variables match your search criteria.
        </p>
      )}

      {/* Usage tips */}
      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <h4 className="font-medium text-blue-900 mb-2">Usage Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            - Variables use double curly braces: <code className="bg-blue-100 px-1 rounded">{`{{variable_name}}`}</code>
          </li>
          <li>
            - Required variables must be present in business data for generation to succeed
          </li>
          <li>
            - Optional variables will be replaced with empty string if not available
          </li>
          <li>
            - Click the copy button to copy the variable syntax to your clipboard
          </li>
        </ul>
      </div>
    </div>
  );
};

export default VariableReference;
