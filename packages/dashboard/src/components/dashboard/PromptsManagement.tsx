/**
 * PromptsManagement - Manage prompt templates for content generation
 */

import React, { useEffect, useState, useCallback } from "react";
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
import { EmptyState, EmptyStateIcons } from "../ui/EmptyState";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import {
  PromptEditor,
  PromptPreview,
  VariableReference,
  type PromptEditorFormData,
} from "./prompts";

type TabName = "templates" | "editor" | "preview" | "variables" | "instructions";

const TABS: { name: TabName; label: string }[] = [
  { name: "templates", label: "Templates" },
  { name: "editor", label: "Editor" },
  { name: "preview", label: "Preview" },
  { name: "variables", label: "Variables" },
  { name: "instructions", label: "Instructions" },
];

type PageType =
  | "keyword-service-area"
  | "keyword-location"
  | "service-service-area"
  | "service-location"
  | "location-keyword"
  | "service-area";

const EMPTY_FORM: PromptEditorFormData = {
  page_type: "location-keyword",
  version: 1,
  template: "",
  required_variables: "",
  optional_variables: "",
  word_count_target: 400,
  is_active: true,
};

export const PromptsManagement: React.FC = () => {
  const { selectedBusiness, businesses } = useBusiness();
  const { addToast } = useToast();

  // Get business details from the businesses array
  const businessDetails = businesses.find((b) => b.id === selectedBusiness);
  const [activeTab, setActiveTab] = useState<TabName>("templates");
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editing/creating state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<PromptEditorFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Preview state
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);

  // Delete confirmation
  const { confirm, dialogProps, setIsLoading } = useConfirmDialog();
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Load templates when business changes
  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      if (!selectedBusiness) return;
      try {
        setLoading(true);
        setError(null);
        const { prompt_templates } = await listPromptTemplates(
          selectedBusiness,
          { signal: controller.signal }
        );
        setTemplates(prompt_templates);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        const msg =
          e instanceof Error ? e.message : "Failed to load prompt templates";
        setError(msg);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    setTemplates([]);
    setEditingId(null);
    setIsCreating(false);
    setSelectedPreviewId(null);
    load();

    return () => controller.abort();
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
    // Calculate next version number for default page type
    const existingVersions = templates
      .filter((t) => t.page_type === "location-keyword")
      .map((t) => t.version);
    const nextVersion = existingVersions.length > 0 ? Math.max(...existingVersions) + 1 : 1;

    setIsCreating(true);
    setEditingId(null);
    setFormData({ ...EMPTY_FORM, version: nextVersion });
    setActiveTab("editor");
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
    setActiveTab("editor");
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData(EMPTY_FORM);
    setActiveTab("templates");
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
    if (formData.word_count_target < 100 || formData.word_count_target > 10000) {
      addToast("Word count target must be between 100 and 10,000", "error", 4000);
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

  const handleDelete = useCallback(
    async (id: string, pageType: string, version: number) => {
      if (!selectedBusiness || deletingIds.has(id)) return;

      const confirmed = await confirm({
        title: "Delete Template?",
        message: `Are you sure you want to delete the ${pageType} v${version} template? This action cannot be undone.`,
        confirmLabel: "Delete",
        variant: "danger",
      });

      if (!confirmed) return;

      setDeletingIds((prev) => new Set(prev).add(id));
      setIsLoading(true);

      try {
        await deletePromptTemplate(selectedBusiness, id);
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        addToast("Template deleted successfully", "success");
        if (editingId === id) {
          handleCancel();
        }
        if (selectedPreviewId === id) {
          setSelectedPreviewId(null);
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
        setIsLoading(false);
      }
    },
    [selectedBusiness, deletingIds, confirm, editingId, selectedPreviewId, addToast, setIsLoading]
  );

  const handlePreview = (template: PromptTemplate) => {
    setSelectedPreviewId(template.id);
    setActiveTab("preview");
  };

  // Stats
  const totalTemplates = templates.length;
  const activeTemplates = templates.filter((t) => t.is_active).length;
  const locationKeywordTemplates = templates.filter(
    (t) => t.page_type === "location-keyword"
  ).length;
  const serviceAreaTemplates = templates.filter(
    (t) => t.page_type === "service-area"
  ).length;

  const renderStatsCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-dark-800 border rounded-lg p-4">
        <div className="text-2xl font-bold text-dark-100">{totalTemplates}</div>
        <div className="text-sm text-dark-400">Total Templates</div>
      </div>
      <div className="bg-dark-800 border rounded-lg p-4">
        <div className="text-2xl font-bold text-metro-green">{activeTemplates}</div>
        <div className="text-sm text-dark-400">Active</div>
      </div>
      <div className="bg-dark-800 border rounded-lg p-4">
        <div className="text-2xl font-bold text-purple-600">
          {locationKeywordTemplates}
        </div>
        <div className="text-sm text-dark-400">Location-Keyword</div>
      </div>
      <div className="bg-dark-800 border rounded-lg p-4">
        <div className="text-2xl font-bold text-metro-green">
          {serviceAreaTemplates}
        </div>
        <div className="text-sm text-dark-400">Service-Area</div>
      </div>
    </div>
  );

  const renderTemplatesTab = () => (
    <div className="space-y-4">
      {renderStatsCards()}

      <button
        className="bg-metro-orange text-white px-4 py-2 rounded hover:bg-metro-orange-600"
        onClick={handleStartCreate}
      >
        + Add New Template
      </button>

      {error && <p className="text-metro-red">{error}</p>}

      {loading ? (
        <p className="text-dark-400">Loading templates...</p>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={EmptyStateIcons.prompts}
          title="No prompt templates"
          description="Create your first prompt template to start generating SEO content."
          action={{
            label: "Create Template",
            onClick: handleStartCreate,
          }}
        />
      ) : (
        <ul className="space-y-3">
          {templates.map((t) => (
            <li
              key={t.id}
              className="border rounded p-4 bg-dark-800 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-0.5 text-xs rounded font-medium ${
                        t.page_type === "location-keyword"
                          ? "bg-purple-900/50 text-purple-400"
                          : "bg-metro-green-950 text-metro-green"
                      }`}
                    >
                      {t.page_type}
                    </span>
                    <span className="text-sm text-dark-400">v{t.version}</span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${
                        t.is_active
                          ? "bg-metro-green-950 text-metro-green"
                          : "bg-dark-800 text-dark-400"
                      }`}
                    >
                      {t.is_active ? "Active" : "Inactive"}
                    </span>
                    <span className="text-sm text-dark-400">
                      {t.word_count_target} words
                    </span>
                  </div>
                  <p className="text-dark-200 text-sm font-mono line-clamp-3 whitespace-pre-wrap">
                    {t.template.substring(0, 200)}
                    {t.template.length > 200 ? "..." : ""}
                  </p>
                  {(t.required_variables || t.optional_variables) && (
                    <div className="mt-2 text-xs text-dark-400">
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
                    className="text-dark-400 hover:text-dark-100 text-sm"
                    onClick={() => handlePreview(t)}
                  >
                    Preview
                  </button>
                  <button
                    className="text-metro-orange hover:text-blue-800 text-sm"
                    onClick={() => handleStartEdit(t)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-metro-red hover:text-red-800 text-sm disabled:opacity-50"
                    onClick={() => handleDelete(t.id, t.page_type, t.version)}
                    disabled={deletingIds.has(t.id)}
                  >
                    {deletingIds.has(t.id) ? "..." : "Delete"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const renderEditorTab = () => {
    if (!isCreating && !editingId) {
      return (
        <EmptyState
          icon={EmptyStateIcons.prompts}
          title="No template selected"
          description="Create a new template or select an existing one to edit."
          action={{
            label: "Create New Template",
            onClick: handleStartCreate,
          }}
          secondaryAction={{
            label: "View Templates",
            onClick: () => setActiveTab("templates"),
          }}
        />
      );
    }

    return (
      <PromptEditor
        mode={isCreating ? "create" : "edit"}
        formData={formData}
        onChange={setFormData}
        onSave={handleSave}
        onCancel={handleCancel}
        saving={saving}
        existingTemplates={templates}
      />
    );
  };

  const renderPreviewTab = () => {
    const selectedTemplate = selectedPreviewId
      ? templates.find((t) => t.id === selectedPreviewId)
      : null;

    return (
      <div className="space-y-4">
        {templates.length > 0 && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-dark-200">
              Select Template:
            </label>
            <select
              className="border rounded px-3 py-1.5"
              value={selectedPreviewId || ""}
              onChange={(e) => setSelectedPreviewId(e.target.value || null)}
            >
              <option value="">-- Select a template --</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.page_type} v{t.version}
                  {t.is_active ? " (Active)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <PromptPreview
          template={selectedTemplate || null}
          businessName={businessDetails?.name}
          businessPhone={businessDetails?.phone || undefined}
          primaryCity={businessDetails?.primary_city || undefined}
          primaryState={businessDetails?.primary_state || undefined}
        />
      </div>
    );
  };

  const renderVariablesTab = () => <VariableReference />;

  const renderInstructionsTab = () => (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-semibold mb-3">
          1. Output Format Requirements
        </h2>
        <div className="bg-dark-900 p-4 rounded border">
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
          <ul className="mt-4 space-y-2 text-sm text-dark-200">
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
        <ul className="space-y-2 text-dark-200">
          <li>
            <strong>Variable format:</strong> Use double curly braces:{" "}
            <code className="bg-dark-800 px-1 rounded">
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
        <ul className="space-y-2 text-dark-200">
          <li>
            - Mention the location (city, state) 2-3 times naturally in the body
          </li>
          <li>- Include the phone number once in the body content</li>
          <li>- End with a clear call-to-action</li>
          <li>- Write for local searchers, not generic audiences</li>
          <li>- Keep language natural and avoid keyword stuffing</li>
          <li>- Use active voice and benefit-focused language</li>
          <li>- Don&apos;t use placeholder text that might slip through</li>
          <li>- Don&apos;t make up facts, testimonials, or statistics</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">4. Page Types</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border rounded p-4 bg-purple-50">
            <h3 className="font-semibold text-purple-400 mb-2">
              location-keyword
            </h3>
            <p className="text-sm text-dark-200 mb-2">
              Keyword-focused page optimized for specific search intent. Answer
              what searchers are looking for.
            </p>
            <p className="text-sm text-dark-400">
              <strong>Example:</strong> &quot;Best Burgers in Arlington&quot;
            </p>
          </div>
          <div className="border rounded p-4 bg-metro-green-950">
            <h3 className="font-semibold text-metro-green mb-2">service-area</h3>
            <p className="text-sm text-dark-200 mb-2">
              Service-focused page for a specific city. Focus on the service
              offering and local presence.
            </p>
            <p className="text-sm text-dark-400">
              <strong>Example:</strong> &quot;Plumbing Services in Sterling,
              VA&quot;
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">5. Example Template</h2>
        <div className="bg-dark-900 p-4 rounded border">
          <pre className="text-sm whitespace-pre-wrap font-mono text-dark-200">
            {`You are an SEO content writer for {{business_name}}, a {{industry}} business.

Write a local SEO landing page for "{{primary_keyword}}" targeting customers in {{city}}, {{state}}.

BUSINESS CONTEXT:
- Business Name: {{business_name}}
- Phone: {{phone}}
- Years Experience: {{years_experience}}
- Tagline: {{tagline}}

TARGET AUDIENCE:
{{target_audience}}

REQUIREMENTS:
1. Title tag (max 70 characters) - include keyword and city
2. Meta description (max 160 characters) - compelling, include location
3. Body content ({{word_count}} words):
   - Opening paragraph mentioning {{city}} and the keyword
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
          <p className="text-dark-400">
            Select a business to manage prompt templates.
          </p>
        ) : (
          <>
            <div className="border-b border-dark-700">
              <nav className="flex gap-4" aria-label="Tabs">
                {TABS.map((tab) => (
                  <button
                    key={tab.name}
                    onClick={() => setActiveTab(tab.name)}
                    className={`px-3 py-2 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.name
                        ? "border-blue-600 text-metro-orange"
                        : "border-transparent text-dark-400 hover:text-dark-100 hover:border-dark-600"
                    }`}
                  >
                    {tab.label}
                    {tab.name === "editor" && (isCreating || editingId) && (
                      <span className="ml-1 w-2 h-2 bg-metro-orange rounded-full inline-block" />
                    )}
                  </button>
                ))}
              </nav>
            </div>
            <div className="pt-2">
              {activeTab === "templates" && renderTemplatesTab()}
              {activeTab === "editor" && renderEditorTab()}
              {activeTab === "preview" && renderPreviewTab()}
              {activeTab === "variables" && renderVariablesTab()}
              {activeTab === "instructions" && renderInstructionsTab()}
            </div>
          </>
        )}
      </div>
      <ConfirmDialog {...dialogProps} />
    </DashboardLayout>
  );
};

export default PromptsManagement;
