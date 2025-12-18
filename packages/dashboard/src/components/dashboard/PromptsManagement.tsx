import React, { useEffect, useState } from "react";
import { DashboardLayout } from "./DashboardLayout";
import { useBusiness } from "../../contexts/BusinessContext";
import { useToast } from "../../contexts/ToastContext";
import {
  listPromptTemplates,
  createPromptTemplate,
  updatePromptTemplate,
  deletePromptTemplate,
} from "../../api/prompts";
import type { PromptTemplate } from "@marketbrewer/shared";

type TabName = "templates" | "variables" | "instructions";

const TABS: { name: TabName; label: string }[] = [
  { name: "templates", label: "Templates" },
  { name: "variables", label: "Variables" },
  { name: "instructions", label: "Instructions" },
];

type PageType = "location-keyword" | "service-area";

interface TemplateFormData {
  page_type: PageType;
  version: number;
  template: string;
  required_variables: string;
  optional_variables: string;
  word_count_target: number;
  is_active: boolean;
}

const EMPTY_FORM: TemplateFormData = {
  page_type: "location-keyword",
  version: 1,
  template: "",
  required_variables: "",
  optional_variables: "",
  word_count_target: 400,
  is_active: true,
};

export const PromptsManagement: React.FC = () => {
  const { selectedBusiness } = useBusiness();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabName>("templates");
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editing/creating state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<TemplateFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete tracking
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Load templates when business changes
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!selectedBusiness) return;
      try {
        setLoading(true);
        setError(null);
        const { prompt_templates } = await listPromptTemplates(
          selectedBusiness
        );
        if (!mounted) return;
        setTemplates(prompt_templates);
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Failed to load prompt templates";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    setTemplates([]);
    setEditingId(null);
    setIsCreating(false);
    load();
    return () => {
      mounted = false;
    };
  }, [selectedBusiness]);

  // Parse JSON array stored as string, or comma-separated input to array
  const parseVariables = (input: string): string[] => {
    const trimmed = input.trim();
    if (!trimmed) return [];
    return trimmed
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  };

  // Convert stored JSON string to comma-separated for display
  const variablesToDisplayString = (jsonStr: string | null): string => {
    if (!jsonStr) return "";
    try {
      const arr = JSON.parse(jsonStr);
      if (Array.isArray(arr)) {
        return arr.join(", ");
      }
      return "";
    } catch {
      return "";
    }
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  };

  const handleStartEdit = (template: PromptTemplate) => {
    setEditingId(template.id);
    setIsCreating(false);
    setFormData({
      page_type: template.page_type,
      version: template.version,
      template: template.template,
      required_variables: variablesToDisplayString(template.required_variables),
      optional_variables: variablesToDisplayString(template.optional_variables),
      word_count_target: template.word_count_target,
      is_active: template.is_active === 1,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!selectedBusiness) return;

    // Validation
    if (!formData.template.trim()) {
      addToast("Template content is required", "error", 4000);
      return;
    }
    if (formData.version < 1) {
      addToast("Version must be at least 1", "error", 4000);
      return;
    }
    if (formData.word_count_target < 1) {
      addToast("Word count target must be at least 1", "error", 4000);
      return;
    }

    const reqVars = parseVariables(formData.required_variables);
    const optVars = parseVariables(formData.optional_variables);

    try {
      setSaving(true);

      if (isCreating) {
        const { prompt_template } = await createPromptTemplate(
          selectedBusiness,
          {
            page_type: formData.page_type,
            version: formData.version,
            template: formData.template,
            required_variables: reqVars.length > 0 ? reqVars : undefined,
            optional_variables: optVars.length > 0 ? optVars : undefined,
            word_count_target: formData.word_count_target,
            is_active: formData.is_active,
          }
        );
        setTemplates((prev) => [prompt_template, ...prev]);
        addToast("Template created successfully", "success");
      } else if (editingId) {
        const { prompt_template } = await updatePromptTemplate(
          selectedBusiness,
          editingId,
          {
            page_type: formData.page_type,
            version: formData.version,
            template: formData.template,
            required_variables: reqVars,
            optional_variables: optVars,
            word_count_target: formData.word_count_target,
            is_active: formData.is_active,
          }
        );
        setTemplates((prev) =>
          prev.map((t) => (t.id === editingId ? prompt_template : t))
        );
        addToast("Template updated successfully", "success");
      }

      handleCancel();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save template";
      addToast(msg, "error", 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!selectedBusiness || deletingIds.has(id)) return;

    if (!window.confirm("Are you sure you want to delete this template?")) {
      return;
    }

    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await deletePromptTemplate(selectedBusiness, id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      addToast("Template deleted successfully", "success");
      if (editingId === id) {
        handleCancel();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to delete template";
      addToast(msg, "error", 5000);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const renderTemplateForm = () => (
    <div className="space-y-4 p-4 border rounded bg-gray-50">
      <h3 className="font-semibold text-lg">
        {isCreating ? "New Template" : "Edit Template"}
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Page Type
          </label>
          <select
            className="border rounded px-2 py-1 w-full"
            value={formData.page_type}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                page_type: e.target.value as PageType,
              }))
            }
            disabled={saving}
          >
            <option value="location-keyword">location-keyword</option>
            <option value="service-area">service-area</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Version
          </label>
          <input
            type="number"
            className="border rounded px-2 py-1 w-full"
            value={formData.version}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                version: parseInt(e.target.value || "1", 10),
              }))
            }
            min={1}
            disabled={saving}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Template Content
        </label>
        <textarea
          className="border rounded p-2 w-full font-mono text-sm"
          rows={20}
          value={formData.template}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, template: e.target.value }))
          }
          placeholder="Enter your prompt template here...&#10;&#10;Use {{variable_name}} for dynamic content."
          disabled={saving}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Required Variables (comma-separated)
          </label>
          <input
            type="text"
            className="border rounded px-2 py-1 w-full"
            value={formData.required_variables}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                required_variables: e.target.value,
              }))
            }
            placeholder="business_name, city, state, phone"
            disabled={saving}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Optional Variables (comma-separated)
          </label>
          <input
            type="text"
            className="border rounded px-2 py-1 w-full"
            value={formData.optional_variables}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                optional_variables: e.target.value,
              }))
            }
            placeholder="years_experience, differentiators, tone"
            disabled={saving}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Word Count Target
          </label>
          <input
            type="number"
            className="border rounded px-2 py-1 w-full"
            value={formData.word_count_target}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                word_count_target: parseInt(e.target.value || "400", 10),
              }))
            }
            min={1}
            disabled={saving}
          />
        </div>

        <div className="flex items-center pt-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  is_active: e.target.checked,
                }))
              }
              disabled={saving}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-gray-700">Active</span>
          </label>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Template"}
        </button>
        <button
          className="border px-4 py-2 rounded hover:bg-gray-100 disabled:opacity-50"
          onClick={handleCancel}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </div>
  );

  const renderTemplatesTab = () => (
    <div className="space-y-4">
      {!isCreating && !editingId && (
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={handleStartCreate}
        >
          + Add New Template
        </button>
      )}

      {(isCreating || editingId) && renderTemplateForm()}

      {error && <p className="text-red-600">{error}</p>}

      {loading ? (
        <p className="text-gray-500">Loading templates...</p>
      ) : templates.length === 0 && !isCreating ? (
        <p className="text-gray-500">
          No prompt templates found. Create one to get started.
        </p>
      ) : (
        <ul className="space-y-3">
          {templates.map((t) => (
            <li
              key={t.id}
              className={`border rounded p-4 bg-white ${
                editingId === t.id ? "ring-2 ring-blue-500" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-0.5 text-xs rounded font-medium ${
                        t.page_type === "location-keyword"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {t.page_type}
                    </span>
                    <span className="text-sm text-gray-600">v{t.version}</span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${
                        t.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {t.is_active ? "Active" : "Inactive"}
                    </span>
                    <span className="text-sm text-gray-500">
                      {t.word_count_target} words
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm font-mono line-clamp-3 whitespace-pre-wrap">
                    {t.template.substring(0, 200)}
                    {t.template.length > 200 ? "..." : ""}
                  </p>
                  {(t.required_variables || t.optional_variables) && (
                    <div className="mt-2 text-xs text-gray-500">
                      {t.required_variables && (
                        <span>
                          Required:{" "}
                          {variablesToDisplayString(t.required_variables)}
                        </span>
                      )}
                      {t.required_variables && t.optional_variables && " | "}
                      {t.optional_variables && (
                        <span>
                          Optional:{" "}
                          {variablesToDisplayString(t.optional_variables)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    className="text-blue-600 hover:text-blue-800 text-sm"
                    onClick={() => handleStartEdit(t)}
                    disabled={editingId !== null || isCreating}
                  >
                    Edit
                  </button>
                  <button
                    className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                    onClick={() => handleDelete(t.id)}
                    disabled={deletingIds.has(t.id)}
                  >
                    {deletingIds.has(t.id) ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const renderVariablesTab = () => (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-semibold mb-3">
          Required Variables (All Templates)
        </h2>
        <p className="text-sm text-gray-600 mb-3">
          These variables should be included in every template for consistent
          output.
        </p>
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
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-2 border-b font-mono text-sm">
                  {"{{business_name}}"}
                </td>
                <td className="px-4 py-2 border-b text-sm">
                  Name of the business
                </td>
                <td className="px-4 py-2 border-b text-sm text-gray-600">
                  Business Profile
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-2 border-b font-mono text-sm">
                  {"{{city}}"}
                </td>
                <td className="px-4 py-2 border-b text-sm">Target city name</td>
                <td className="px-4 py-2 border-b text-sm text-gray-600">
                  Service Area
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-2 border-b font-mono text-sm">
                  {"{{state}}"}
                </td>
                <td className="px-4 py-2 border-b text-sm">
                  2-letter state code (e.g., VA)
                </td>
                <td className="px-4 py-2 border-b text-sm text-gray-600">
                  Service Area
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-sm">{"{{phone}}"}</td>
                <td className="px-4 py-2 text-sm">Business phone number</td>
                <td className="px-4 py-2 text-sm text-gray-600">
                  Business Profile
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">
          Optional Variables (Enhance Quality)
        </h2>
        <p className="text-sm text-gray-600 mb-3">
          Use these to add more context and improve content quality.
        </p>
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
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-2 border-b font-mono text-sm">
                  {"{{years_experience}}"}
                </td>
                <td className="px-4 py-2 border-b text-sm">
                  Years in business
                </td>
                <td className="px-4 py-2 border-b text-sm text-gray-600">
                  Questionnaire
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-2 border-b font-mono text-sm">
                  {"{{differentiators}}"}
                </td>
                <td className="px-4 py-2 border-b text-sm">
                  Unique selling points
                </td>
                <td className="px-4 py-2 border-b text-sm text-gray-600">
                  Questionnaire
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-2 border-b font-mono text-sm">
                  {"{{target_audience}}"}
                </td>
                <td className="px-4 py-2 border-b text-sm">
                  Primary customer demographics
                </td>
                <td className="px-4 py-2 border-b text-sm text-gray-600">
                  Questionnaire
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-2 border-b font-mono text-sm">
                  {"{{cta_text}}"}
                </td>
                <td className="px-4 py-2 border-b text-sm">
                  Call-to-action text
                </td>
                <td className="px-4 py-2 border-b text-sm text-gray-600">
                  Content Preferences
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-2 border-b font-mono text-sm">
                  {"{{industry}}"}
                </td>
                <td className="px-4 py-2 border-b text-sm">
                  Business industry
                </td>
                <td className="px-4 py-2 border-b text-sm text-gray-600">
                  Business Profile
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-2 border-b font-mono text-sm">
                  {"{{primary_service}}"}
                </td>
                <td className="px-4 py-2 border-b text-sm">
                  Main service offering
                </td>
                <td className="px-4 py-2 border-b text-sm text-gray-600">
                  Services
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-2 border-b font-mono text-sm">
                  {"{{primary_keyword}}"}
                </td>
                <td className="px-4 py-2 border-b text-sm">
                  Target SEO keyword
                </td>
                <td className="px-4 py-2 border-b text-sm text-gray-600">
                  Keyword
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-2 border-b font-mono text-sm">
                  {"{{search_intent}}"}
                </td>
                <td className="px-4 py-2 border-b text-sm">
                  User search intent (informational, commercial, transactional)
                </td>
                <td className="px-4 py-2 border-b text-sm text-gray-600">
                  Keyword
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-sm">{"{{tone}}"}</td>
                <td className="px-4 py-2 text-sm">
                  Writing tone (professional, friendly, casual)
                </td>
                <td className="px-4 py-2 text-sm text-gray-600">
                  Content Preferences
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );

  const renderInstructionsTab = () => (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-semibold mb-3">
          1. Output Format Requirements
        </h2>
        <div className="bg-gray-50 p-4 rounded border">
          <p className="mb-3">
            All prompts must instruct the model to return JSON in this exact
            format:
          </p>
          <pre className="bg-gray-800 text-green-400 p-4 rounded text-sm overflow-x-auto">
            {`{
  "title": "≤70 characters",
  "metaDescription": "≤160 characters",
  "body": "350-450 words of content"
}`}
          </pre>
          <ul className="mt-4 space-y-2 text-sm text-gray-700">
            <li>
              <strong>Title:</strong> Maximum 70 characters. Include keyword and
              city.
            </li>
            <li>
              <strong>Meta Description:</strong> Maximum 160 characters.
              Compelling, include location.
            </li>
            <li>
              <strong>Body:</strong> 350-450 words. Include phone number once,
              mention city 2-3 times.
            </li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">2. Template Syntax</h2>
        <ul className="space-y-2 text-gray-700">
          <li>
            <strong>Variable format:</strong> Use double curly braces:{" "}
            <code className="bg-gray-100 px-1 rounded">
              {"{{variable_name}}"}
            </code>
          </li>
          <li>
            <strong>Replacement:</strong> Variables are replaced at generation
            time with actual business data
          </li>
          <li>
            <strong>Accuracy:</strong> Don&apos;t instruct the model to invent
            facts not provided in variables
          </li>
          <li>
            <strong>Validation:</strong> The system will warn if required
            variables are missing from output
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">3. Best Practices</h2>
        <ul className="space-y-2 text-gray-700">
          <li>
            ✓ Mention the location (city, state) 2-3 times naturally in the body
          </li>
          <li>✓ Include the phone number once in the body content</li>
          <li>✓ End with a clear call-to-action</li>
          <li>✓ Write for local searchers, not generic audiences</li>
          <li>✓ Keep language natural and avoid keyword stuffing</li>
          <li>✓ Use active voice and benefit-focused language</li>
          <li>✗ Don&apos;t use placeholder text that might slip through</li>
          <li>✗ Don&apos;t make up facts, testimonials, or statistics</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">4. Page Types</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border rounded p-4 bg-purple-50">
            <h3 className="font-semibold text-purple-800 mb-2">
              service-location
            </h3>
            <p className="text-sm text-gray-700 mb-2">
              Business service in a specific city. Focus on the service offering
              and local presence.
            </p>
            <p className="text-sm text-gray-600">
              <strong>Example:</strong> &quot;HVAC Repair in Sterling, VA&quot;
            </p>
          </div>
          <div className="border rounded p-4 bg-green-50">
            <h3 className="font-semibold text-green-800 mb-2">
              keyword-location
            </h3>
            <p className="text-sm text-gray-700 mb-2">
              Keyword-focused page optimized for specific search intent. Answer
              what searchers are looking for.
            </p>
            <p className="text-sm text-gray-600">
              <strong>Example:</strong> &quot;Best Fried Chicken in
              Arlington&quot;
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">5. Example Template</h2>
        <div className="bg-gray-50 p-4 rounded border">
          <pre className="text-sm whitespace-pre-wrap font-mono text-gray-700">
            {`You are an SEO content writer for {{business_name}}, a {{industry}} business.

Write a local SEO landing page for the service "{{primary_service}}" targeting customers in {{city}}, {{state}}.

BUSINESS CONTEXT:
- Business Name: {{business_name}}
- Phone: {{phone}}
- Years Experience: {{years_experience}}
- Key Differentiators: {{differentiators}}

TARGET AUDIENCE:
{{target_audience}}

REQUIREMENTS:
1. Title tag (max 70 characters) - include service and city
2. Meta description (max 160 characters) - compelling, include location
3. Body content (400-450 words):
   - Opening paragraph mentioning {{city}} and the service
   - Why choose {{business_name}} (2-3 paragraphs)
   - Local relevance to {{city}}, {{state}}
   - Clear call-to-action with phone number

TONE: {{tone}}

OUTPUT FORMAT (JSON only, no markdown):
{
  "title": "...",
  "metaDescription": "...",
  "body": "..."
}

IMPORTANT:
- Do NOT use placeholder text
- Do NOT invent facts not provided
- Include {{phone}} naturally once in body
- Mention {{city}} 2-3 times naturally`}
          </pre>
        </div>
      </section>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Prompt Templates</h1>
        {!selectedBusiness ? (
          <p className="text-gray-600">
            Select a business to manage prompt templates.
          </p>
        ) : (
          <>
            <div className="border-b border-gray-200">
              <nav className="flex gap-4" aria-label="Tabs">
                {TABS.map((tab) => (
                  <button
                    key={tab.name}
                    onClick={() => setActiveTab(tab.name)}
                    className={`px-3 py-2 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.name
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
            <div className="pt-2">
              {activeTab === "templates" && renderTemplatesTab()}
              {activeTab === "variables" && renderVariablesTab()}
              {activeTab === "instructions" && renderInstructionsTab()}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PromptsManagement;
