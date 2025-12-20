/**
 * PromptPreview component for previewing prompt templates with sample data
 */

import React, { useState, useMemo } from "react";
import type { PromptTemplate } from "@marketbrewer/shared";

interface PromptPreviewProps {
  template: PromptTemplate | null;
  businessName?: string;
  businessPhone?: string;
  primaryCity?: string;
  primaryState?: string;
}

// Sample values for common variables
const SAMPLE_VALUES: Record<string, string> = {
  business_name: "Sample Business",
  city: "Arlington",
  state: "VA",
  phone: "(555) 123-4567",
  industry: "Professional Services",
  primary_service: "Consulting",
  primary_keyword: "best consulting services",
  years_experience: "15",
  differentiators: "Personalized attention, local expertise, competitive pricing",
  target_audience: "Small and medium businesses looking for growth",
  cta_text: "Call us today for a free consultation",
  search_intent: "commercial",
  tone: "professional",
  county: "Arlington County",
  tagline: "Your trusted local partner",
  owner_name: "John Smith",
};

export const PromptPreview: React.FC<PromptPreviewProps> = ({
  template,
  businessName,
  businessPhone,
  primaryCity,
  primaryState,
}) => {
  const [customValues, setCustomValues] = useState<Record<string, string>>({});

  // Extract variables from template
  const extractedVariables = useMemo(() => {
    if (!template) return [];
    const matches = template.template.match(/\{\{([^}]+)\}\}/g) || [];
    return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "").trim()))];
  }, [template]);

  // Parse declared variables
  const declaredRequired = useMemo(() => {
    if (!template?.required_variables) return [];
    try {
      const parsed = JSON.parse(template.required_variables);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [template]);

  const declaredOptional = useMemo(() => {
    if (!template?.optional_variables) return [];
    try {
      const parsed = JSON.parse(template.optional_variables);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [template]);

  // Merge sample values with business-specific overrides
  const effectiveValues = useMemo(() => {
    const values = { ...SAMPLE_VALUES };
    if (businessName) values.business_name = businessName;
    if (businessPhone) values.phone = businessPhone;
    if (primaryCity) values.city = primaryCity;
    if (primaryState) values.state = primaryState;
    return { ...values, ...customValues };
  }, [businessName, businessPhone, primaryCity, primaryState, customValues]);

  // Substitute variables in template
  const previewContent = useMemo(() => {
    if (!template) return "";
    let content = template.template;
    for (const [key, value] of Object.entries(effectiveValues)) {
      content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    }
    return content;
  }, [template, effectiveValues]);

  // Find any unsubstituted variables
  const unsubstituted = useMemo(() => {
    const matches = previewContent.match(/\{\{([^}]+)\}\}/g) || [];
    return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "").trim()))];
  }, [previewContent]);

  if (!template) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Select a template to preview</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Template info */}
      <div className="flex items-center gap-3">
        <span
          className={`px-2 py-0.5 text-xs rounded font-medium ${
            template.page_type === "location-keyword"
              ? "bg-purple-100 text-purple-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {template.page_type}
        </span>
        <span className="text-sm text-gray-600">v{template.version}</span>
        <span
          className={`px-2 py-0.5 text-xs rounded ${
            template.is_active
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {template.is_active ? "Active" : "Inactive"}
        </span>
        <span className="text-sm text-gray-500">
          Target: {template.word_count_target} words
        </span>
      </div>

      {/* Variable customization */}
      {extractedVariables.length > 0 && (
        <div className="bg-gray-50 border rounded p-4">
          <h4 className="font-medium text-gray-700 mb-3">
            Customize Preview Values
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {extractedVariables.slice(0, 9).map((variable) => (
              <div key={variable}>
                <label className="block text-xs text-gray-600 mb-1">
                  {variable}
                  {declaredRequired.includes(variable) && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>
                <input
                  type="text"
                  className="border rounded px-2 py-1 text-sm w-full"
                  value={customValues[variable] ?? effectiveValues[variable] ?? ""}
                  onChange={(e) =>
                    setCustomValues((prev) => ({
                      ...prev,
                      [variable]: e.target.value,
                    }))
                  }
                  placeholder={SAMPLE_VALUES[variable] || `{{${variable}}}`}
                />
              </div>
            ))}
          </div>
          {extractedVariables.length > 9 && (
            <p className="text-xs text-gray-500 mt-2">
              +{extractedVariables.length - 9} more variables
            </p>
          )}
          {Object.keys(customValues).length > 0 && (
            <button
              className="text-sm text-blue-600 hover:text-blue-700 mt-2"
              onClick={() => setCustomValues({})}
            >
              Reset to defaults
            </button>
          )}
        </div>
      )}

      {/* Warnings */}
      {unsubstituted.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
          <p className="text-sm text-yellow-800">
            <strong>Unsubstituted variables:</strong>{" "}
            {unsubstituted.map((v) => `{{${v}}}`).join(", ")}
          </p>
          <p className="text-xs text-yellow-700 mt-1">
            These variables have no sample values defined.
          </p>
        </div>
      )}

      {/* Preview content */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-700">Preview</h4>
          <span className="text-xs text-gray-500">
            {previewContent.split(/\s+/).length} words
          </span>
        </div>
        <div className="bg-white border rounded p-4 font-mono text-sm whitespace-pre-wrap max-h-[600px] overflow-y-auto">
          {previewContent}
        </div>
      </div>

      {/* Variable summary */}
      <div className="grid grid-cols-2 gap-4">
        {declaredRequired.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Required Variables
            </h4>
            <div className="flex flex-wrap gap-1">
              {declaredRequired.map((v: string) => (
                <span
                  key={v}
                  className={`px-2 py-0.5 text-xs rounded ${
                    extractedVariables.includes(v)
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {v}
                </span>
              ))}
            </div>
          </div>
        )}
        {declaredOptional.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Optional Variables
            </h4>
            <div className="flex flex-wrap gap-1">
              {declaredOptional.map((v: string) => (
                <span
                  key={v}
                  className={`px-2 py-0.5 text-xs rounded ${
                    extractedVariables.includes(v)
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {v}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptPreview;
