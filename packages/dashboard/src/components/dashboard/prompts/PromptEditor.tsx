/**
 * PromptEditor component for editing prompt templates
 */

import React from "react";
import type { PromptTemplate } from "@marketbrewer/shared";

type PageType =
  | "keyword-service-area"
  | "keyword-location"
  | "service-service-area"
  | "service-location"
  | "location-keyword"
  | "service-area";

export interface PromptEditorFormData {
  page_type: PageType;
  version: number;
  template: string;
  required_variables: string;
  optional_variables: string;
  word_count_target: number;
  is_active: boolean;
}

interface PromptEditorProps {
  mode: "create" | "edit";
  formData: PromptEditorFormData;
  onChange: (data: PromptEditorFormData) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  existingTemplates?: PromptTemplate[];
}

export const PromptEditor: React.FC<PromptEditorProps> = ({
  mode,
  formData,
  onChange,
  onSave,
  onCancel,
  saving,
  existingTemplates = [],
}) => {
  // Check if this page_type + version combo already exists (for create mode)
  const isDuplicateVersion =
    mode === "create" &&
    existingTemplates.some(
      (t) =>
        t.page_type === formData.page_type && t.version === formData.version
    );

  // Extract variables from template content
  const extractedVariables = React.useMemo(() => {
    const matches = formData.template.match(/\{\{([^}]+)\}\}/g) || [];
    return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "").trim()))];
  }, [formData.template]);

  // Variables declared but not used in template
  const declaredRequired = formData.required_variables
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const declaredOptional = formData.optional_variables
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const allDeclared = [...declaredRequired, ...declaredOptional];
  const undeclaredVariables = extractedVariables.filter(
    (v) => !allDeclared.includes(v)
  );
  const unusedDeclared = allDeclared.filter(
    (v) => !extractedVariables.includes(v)
  );

  return (
    <div className="space-y-4 p-4 border rounded bg-dark-900">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">
          {mode === "create" ? "New Template" : "Edit Template"}
        </h3>
        {extractedVariables.length > 0 && (
          <span className="text-sm text-dark-400">
            {extractedVariables.length} variable
            {extractedVariables.length !== 1 ? "s" : ""} detected
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-dark-200 mb-1">
            Page Type
          </label>
          <select
            className="border rounded px-2 py-1 w-full"
            value={formData.page_type}
            onChange={(e) =>
              onChange({
                ...formData,
                page_type: e.target.value as PageType,
              })
            }
            disabled={saving || mode === "edit"}
          >
            <option value="location-keyword">location-keyword</option>
            <option value="service-area">service-area</option>
          </select>
          {mode === "edit" && (
            <p className="text-xs text-dark-400 mt-1">
              Page type cannot be changed after creation
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-200 mb-1">
            Version
          </label>
          <input
            type="number"
            className={`border rounded px-2 py-1 w-full ${
              isDuplicateVersion ? "border-metro-red" : ""
            }`}
            value={formData.version}
            onChange={(e) =>
              onChange({
                ...formData,
                version: parseInt(e.target.value || "1", 10),
              })
            }
            min={1}
            disabled={saving || mode === "edit"}
          />
          {isDuplicateVersion && (
            <p className="text-xs text-metro-red mt-1">
              Version {formData.version} already exists for {formData.page_type}
            </p>
          )}
          {mode === "edit" && (
            <p className="text-xs text-dark-400 mt-1">
              Version cannot be changed after creation
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-dark-200 mb-1">
          Template Content
        </label>
        <textarea
          className="border rounded p-2 w-full font-mono text-sm"
          rows={20}
          value={formData.template}
          onChange={(e) =>
            onChange({ ...formData, template: e.target.value })
          }
          placeholder={`Enter your prompt template here...

Use {{variable_name}} for dynamic content.

Example:
You are an SEO content writer for {{business_name}}.
Write content for {{city}}, {{state}}.`}
          disabled={saving}
        />
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-dark-400">
            {formData.template.length.toLocaleString()} characters
          </span>
          {formData.template.length > 0 && (
            <span className="text-xs text-dark-400">
              ~{Math.round(formData.template.split(/\s+/).length)} words
            </span>
          )}
        </div>
      </div>

      {/* Variable warnings */}
      {(undeclaredVariables.length > 0 || unusedDeclared.length > 0) && (
        <div className="space-y-2">
          {undeclaredVariables.length > 0 && (
            <div className="bg-metro-yellow-950 border border-yellow-200 rounded p-3">
              <p className="text-sm text-metro-yellow">
                <strong>Variables in template but not declared:</strong>{" "}
                {undeclaredVariables.map((v) => `{{${v}}}`).join(", ")}
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Add these to required or optional variables, or they may not be
                substituted.
              </p>
            </div>
          )}
          {unusedDeclared.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-sm text-blue-800">
                <strong>Declared but not used in template:</strong>{" "}
                {unusedDeclared.join(", ")}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-dark-200 mb-1">
            Required Variables (comma-separated)
          </label>
          <input
            type="text"
            className="border rounded px-2 py-1 w-full"
            value={formData.required_variables}
            onChange={(e) =>
              onChange({
                ...formData,
                required_variables: e.target.value,
              })
            }
            placeholder="business_name, city, state, phone"
            disabled={saving}
          />
          <p className="text-xs text-dark-400 mt-1">
            Content generation will fail if these are missing
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-200 mb-1">
            Optional Variables (comma-separated)
          </label>
          <input
            type="text"
            className="border rounded px-2 py-1 w-full"
            value={formData.optional_variables}
            onChange={(e) =>
              onChange({
                ...formData,
                optional_variables: e.target.value,
              })
            }
            placeholder="years_experience, differentiators, tone"
            disabled={saving}
          />
          <p className="text-xs text-dark-400 mt-1">
            Will be substituted if available, blank otherwise
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-dark-200 mb-1">
            Word Count Target
          </label>
          <input
            type="number"
            className="border rounded px-2 py-1 w-full"
            value={formData.word_count_target}
            onChange={(e) =>
              onChange({
                ...formData,
                word_count_target: parseInt(e.target.value || "400", 10),
              })
            }
            min={100}
            max={10000}
            disabled={saving}
          />
          <p className="text-xs text-dark-400 mt-1">
            Target word count for generated content (100-10,000)
          </p>
        </div>

        <div className="flex items-center pt-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) =>
                onChange({
                  ...formData,
                  is_active: e.target.checked,
                })
              }
              disabled={saving}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-dark-200">Active</span>
          </label>
          <p className="text-xs text-dark-400 ml-2">
            Only active templates are used for content generation
          </p>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          className="bg-metro-orange text-white px-4 py-2 rounded hover:bg-metro-orange-600 disabled:opacity-50"
          onClick={onSave}
          disabled={saving || isDuplicateVersion || !formData.template.trim()}
        >
          {saving ? "Saving..." : mode === "create" ? "Create Template" : "Save Changes"}
        </button>
        <button
          className="border px-4 py-2 rounded hover:bg-dark-800 disabled:opacity-50"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default PromptEditor;
