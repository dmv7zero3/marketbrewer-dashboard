import React, { useEffect, useState, useMemo, useCallback } from "react";
import { DashboardLayout } from "./DashboardLayout";
import { StickyFooter } from "./StickyFooter";
import { useBusiness } from "../../contexts/BusinessContext";
import { useToast } from "../../contexts/ToastContext";
import { getQuestionnaire, updateQuestionnaire } from "../../api/businesses";
import {
  createEmptyQuestionnaire,
  normalizeQuestionnaireData,
  toSlug,
} from "@marketbrewer/shared";
import { safeDeepMerge } from "../../lib/safe-deep-merge";
import { deepEqual } from "../../lib/deep-equal";
import type {
  QuestionnaireDataStructure,
  ServiceOffering,
} from "@marketbrewer/shared";
import { EmptyState, EmptyStateIcons, StatsCards } from "../ui";
import { useConfirmDialog } from "../../hooks";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import {
  KeywordsSettings,
  isSpanishEnabled,
  DEFAULT_ENABLED_LANGUAGES,
} from "./KeywordsSettings";

type TabName = "manage" | "bulk-add" | "settings";

const TABS: { name: TabName; label: string }[] = [
  { name: "manage", label: "Manage" },
  { name: "bulk-add", label: "Bulk Add" },
  { name: "settings", label: "Settings" },
];

/**
 * ServicesManagement: Top-level dashboard page for managing service offerings
 * Supports bilingual (EN/ES) service names with shared slugs
 */
export const ServicesManagement: React.FC = () => {
  const { selectedBusiness, uiLabels } = useBusiness();
  const { addToast } = useToast();
  const { confirm, dialogProps } = useConfirmDialog();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabName>("manage");

  // Data state
  const [questionnaireData, setQuestionnaireData] =
    useState<QuestionnaireDataStructure>(createEmptyQuestionnaire());
  const [originalData, setOriginalData] = useState<QuestionnaireDataStructure>(
    createEmptyQuestionnaire()
  );

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add form state
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceNameEs, setNewServiceNameEs] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  // Bulk add state
  const [bulkText, setBulkText] = useState("");

  // Language settings
  const [enabledLanguages, setEnabledLanguages] = useState<string[]>(
    DEFAULT_ENABLED_LANGUAGES
  );
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Derived state
  const spanishEnabled = isSpanishEnabled(enabledLanguages);

  // Dirty state tracking
  const hasUnsavedChanges = useMemo(() => {
    return !deepEqual(questionnaireData, originalData);
  }, [questionnaireData, originalData]);

  // Load questionnaire data when business changes
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!selectedBusiness) return;

      try {
        setLoading(true);
        setSettingsLoading(true);
        setError(null);

        const { questionnaire } = await getQuestionnaire(selectedBusiness);

        if (!mounted) return;

        // Parse questionnaire data with fallback to empty structure
        let parsedData: QuestionnaireDataStructure = createEmptyQuestionnaire();
        try {
          const rawData = questionnaire.data as unknown;
          if (rawData && typeof rawData === "object") {
            parsedData = safeDeepMerge(
              parsedData,
              rawData as Partial<QuestionnaireDataStructure>
            );
          }
        } catch (e) {
          console.error("Failed to parse questionnaire data:", e);
        }

        // Normalize services to ensure slug exists
        const normalizedServices = (parsedData.services?.offerings || []).map(
          (s) => ({
            ...s,
            slug: s.slug || toSlug(s.name || ""),
          })
        );
        parsedData.services = { offerings: normalizedServices };

        setQuestionnaireData(parsedData);
        setOriginalData(parsedData);

        // Load language settings
        const normalized = normalizeQuestionnaireData(questionnaire.data);
        setEnabledLanguages(
          normalized.seoSettings?.enabledLanguages ?? DEFAULT_ENABLED_LANGUAGES
        );
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Failed to load services data";
        setError(msg);
      } finally {
        setLoading(false);
        setSettingsLoading(false);
      }
    };

    // Reset state when business changes
    setQuestionnaireData(createEmptyQuestionnaire());
    setOriginalData(createEmptyQuestionnaire());
    setNewServiceName("");
    setNewServiceNameEs("");
    setBulkText("");
    setInputError(null);

    load();

    return () => {
      mounted = false;
    };
  }, [selectedBusiness]);

  // Update services in questionnaire data
  const updateServices = (offerings: ServiceOffering[]) => {
    setQuestionnaireData((prev) => ({
      ...prev,
      services: {
        ...prev.services,
        offerings,
      },
    }));
  };

  // Handler for saving language settings changes
  const handleEnabledLanguagesChange = useCallback(
    async (newLanguages: string[]) => {
      if (!selectedBusiness || !questionnaireData) return;

      try {
        setSettingsSaving(true);
        const updatedData: QuestionnaireDataStructure = {
          ...questionnaireData,
          seoSettings: {
            ...questionnaireData.seoSettings,
            enabledLanguages: newLanguages,
          },
        };
        await updateQuestionnaire(selectedBusiness, updatedData);
        setQuestionnaireData(updatedData);
        setOriginalData(updatedData);
        setEnabledLanguages(newLanguages);
        addToast("Language settings saved", "success");
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Failed to save language settings";
        addToast(msg, "error", 5000);
      } finally {
        setSettingsSaving(false);
      }
    },
    [selectedBusiness, questionnaireData, addToast]
  );

  // Add a new service
  const handleAddService = () => {
    if (spanishEnabled) {
      // Bilingual mode - both EN and ES required
      if (!newServiceName.trim() || !newServiceNameEs.trim()) {
        const error = "Both English and Spanish service names are required";
        setInputError(error);
        addToast(error, "error", 5000);
        return;
      }
    } else {
      // English only
      if (!newServiceName.trim()) {
        const error = "Service name is required";
        setInputError(error);
        addToast(error, "error", 5000);
        return;
      }
    }

    const slug = toSlug(newServiceName.trim());

    // Check for duplicate slug
    const exists = questionnaireData.services.offerings.some(
      (s) => s.slug === slug
    );
    if (exists) {
      setInputError("A service with this name already exists");
      addToast("A service with this name already exists", "error", 5000);
      return;
    }

    const newService: ServiceOffering = {
      name: newServiceName.trim(),
      slug,
      isPrimary: questionnaireData.services.offerings.length === 0, // First service is primary
      nameEs: spanishEnabled ? newServiceNameEs.trim() : undefined,
    };

    updateServices([...questionnaireData.services.offerings, newService]);
    setNewServiceName("");
    setNewServiceNameEs("");
    setInputError(null);
    addToast("Service added", "success");
  };

  // Update a service field
  const handleUpdateService = (
    idx: number,
    field: keyof ServiceOffering,
    value: string | boolean
  ) => {
    const newOfferings = [...questionnaireData.services.offerings];
    const service = { ...newOfferings[idx] };

    if (field === "name" && typeof value === "string") {
      service.name = value;
      service.slug = toSlug(value);
    } else if (field === "nameEs" && typeof value === "string") {
      service.nameEs = value;
    } else if (field === "isPrimary" && typeof value === "boolean") {
      service.isPrimary = value;
    }

    newOfferings[idx] = service;
    updateServices(newOfferings);
  };

  // Remove a service
  const handleRemoveService = async (idx: number) => {
    const service = questionnaireData.services.offerings[idx];
    const confirmed = await confirm({
      title: "Delete service?",
      message: `Delete "${service.name}"${
        service.nameEs ? ` / "${service.nameEs}"` : ""
      }? This action cannot be undone.`,
      variant: "danger",
      confirmLabel: "Delete",
    });

    if (!confirmed) return;

    const newOfferings = questionnaireData.services.offerings.filter(
      (_, i) => i !== idx
    );
    updateServices(newOfferings);
    addToast("Service deleted", "success");
  };

  // Parse bulk CSV text
  const parseBulkCSV = (
    text: string,
    bilingual: boolean
  ): { services: { name: string; nameEs?: string }[]; errors: string[] } => {
    const lines = text.split("\n").filter((line) => line.trim());
    const services: { name: string; nameEs?: string }[] = [];
    const errors: string[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Try tab first (Excel/Google Sheets default), then comma
      let parts: string[];
      if (trimmed.includes("\t")) {
        parts = trimmed.split("\t").map((p) => p.trim());
      } else {
        parts = trimmed.split(",").map((p) => p.trim());
      }

      if (bilingual) {
        if (parts.length < 2 || !parts[0] || !parts[1]) {
          errors.push(`Line ${idx + 1}: Missing EN or ES name`);
          return;
        }
        services.push({ name: parts[0], nameEs: parts[1] });
      } else {
        if (!parts[0]) {
          errors.push(`Line ${idx + 1}: Missing service name`);
          return;
        }
        services.push({ name: parts[0] });
      }
    });

    return { services, errors };
  };

  // Bulk add services
  const handleBulkAdd = () => {
    const { services: parsed, errors } = parseBulkCSV(bulkText, spanishEnabled);

    if (errors.length > 0) {
      addToast(`Format errors: ${errors.slice(0, 3).join(", ")}`, "error", 5000);
      return;
    }

    if (parsed.length === 0) {
      addToast("No valid services found", "error", 4000);
      return;
    }

    // Check for duplicates
    const existingSlugs = new Set(
      questionnaireData.services.offerings.map((s) => s.slug)
    );
    const newServices: ServiceOffering[] = [];
    let skipped = 0;

    parsed.forEach((p) => {
      const slug = toSlug(p.name);
      if (existingSlugs.has(slug)) {
        skipped++;
        return;
      }
      existingSlugs.add(slug);
      newServices.push({
        name: p.name,
        slug,
        isPrimary: false,
        nameEs: p.nameEs,
      });
    });

    if (newServices.length === 0) {
      addToast("All services already exist", "info", 3000);
      setBulkText("");
      return;
    }

    updateServices([...questionnaireData.services.offerings, ...newServices]);
    setBulkText("");

    const msg =
      skipped > 0
        ? `Added ${newServices.length} service(s), skipped ${skipped} duplicate(s)`
        : `Added ${newServices.length} service(s)`;
    addToast(msg, "success");
  };

  // Save all changes
  const handleSave = async () => {
    if (!selectedBusiness) return;

    try {
      setSaving(true);
      setError(null);

      await updateQuestionnaire(selectedBusiness, questionnaireData);

      // Update original data to match saved state
      setOriginalData(questionnaireData);

      addToast("Services saved successfully", "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save services";
      setError(msg);
      addToast(msg, "error", 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setQuestionnaireData(originalData);
    setNewServiceName("");
    setNewServiceNameEs("");
    setBulkText("");
    setInputError(null);
  };

  const disabled = saving;

  // Stats for the manage tab
  const stats = spanishEnabled
    ? [
        {
          label: "Total Services",
          value: questionnaireData.services.offerings.length,
          color: "blue" as const,
        },
        {
          label: "With Spanish",
          value: questionnaireData.services.offerings.filter((s) => s.nameEs)
            .length,
          color: "green" as const,
        },
        {
          label: "Missing Spanish",
          value: questionnaireData.services.offerings.filter((s) => !s.nameEs)
            .length,
          color: "yellow" as const,
        },
      ]
    : [
        {
          label: "Total Services",
          value: questionnaireData.services.offerings.length,
          color: "blue" as const,
        },
      ];

  // Render Manage Tab
  const renderManageTab = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <StatsCards stats={stats} loading={loading} />

      {/* Add Service Section */}
      <div className="bg-dark-800 border border-dark-700 rounded-lg p-4 space-y-3">
        <h3 className="text-lg font-semibold text-dark-100">Add New {uiLabels.servicesSingular}</h3>

        {spanishEnabled ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1">
                  English Name
                </label>
                <input
                  className={`border rounded-lg px-3 py-2 w-full bg-dark-700 text-dark-100 focus:ring-2 focus:ring-metro-orange focus:border-metro-orange ${
                    inputError && inputError.includes("English")
                      ? "border-metro-red"
                      : "border-dark-600"
                  }`}
                  placeholder="e.g., Criminal Defense"
                  value={newServiceName}
                  onChange={(e) => {
                    setNewServiceName(e.target.value);
                    setInputError(null);
                  }}
                  disabled={disabled}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1">
                  Spanish Name
                </label>
                <input
                  className={`border rounded-lg px-3 py-2 w-full bg-dark-700 text-dark-100 focus:ring-2 focus:ring-metro-orange focus:border-metro-orange ${
                    inputError && inputError.includes("Spanish")
                      ? "border-metro-red"
                      : "border-dark-600"
                  }`}
                  placeholder="e.g., Defensa Criminal"
                  value={newServiceNameEs}
                  onChange={(e) => {
                    setNewServiceNameEs(e.target.value);
                    setInputError(null);
                  }}
                  disabled={disabled}
                />
              </div>
            </div>
            <button
              className="bg-metro-orange text-white px-6 py-2 rounded-lg hover:bg-metro-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              onClick={handleAddService}
              disabled={disabled}
            >
              Add Bilingual Service
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <input
              className={`border rounded-lg px-3 py-2 flex-1 bg-dark-700 text-dark-100 focus:ring-2 focus:ring-metro-orange focus:border-metro-orange ${
                inputError ? "border-metro-red" : "border-dark-600"
              }`}
              placeholder="Service name"
              value={newServiceName}
              onChange={(e) => {
                setNewServiceName(e.target.value);
                setInputError(null);
              }}
              disabled={disabled}
            />
            <button
              className="bg-metro-orange text-white px-6 py-2 rounded-lg hover:bg-metro-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              onClick={handleAddService}
              disabled={disabled}
            >
              Add Service
            </button>
          </div>
        )}
        {inputError && (
          <p className="text-metro-red text-sm flex items-center gap-1">
            <span>!</span> {inputError}
          </p>
        )}
      </div>

      {/* Services List */}
      {error && (
        <div className="bg-metro-red-950 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-dark-400">Loading services...</span>
        </div>
      ) : questionnaireData.services.offerings.length === 0 ? (
        <EmptyState
          icon={EmptyStateIcons.services}
          title={`No ${uiLabels.servicesLabel.toLowerCase()} yet`}
          description={
            spanishEnabled
              ? `Add your first bilingual ${uiLabels.servicesSingular.toLowerCase()} to start generating SEO content`
              : `Add your first ${uiLabels.servicesSingular.toLowerCase()} to start generating SEO content`
          }
          action={{
            label: spanishEnabled ? `Add Bilingual ${uiLabels.servicesSingular}` : `Add ${uiLabels.servicesSingular}`,
            onClick: () => {
              document
                .querySelector<HTMLInputElement>(
                  'input[placeholder*="English"], input[placeholder="Service name"]'
                )
                ?.focus();
            },
          }}
        />
      ) : (
        <div className="space-y-3">
          {questionnaireData.services.offerings.map((service, idx) => {
            const hasMissingTranslation = spanishEnabled && !service.nameEs;

            return (
              <div
                key={service.slug}
                className={`bg-dark-800 border-2 rounded-lg p-4 transition-all hover:shadow-md ${
                  hasMissingTranslation
                    ? "border-amber-200 bg-amber-50/30"
                    : "border-dark-700"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-3">
                      {service.isPrimary && (
                        <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                          PRIMARY
                        </span>
                      )}
                      {hasMissingTranslation && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-semibold rounded">
                          NEEDS SPANISH
                        </span>
                      )}
                    </div>

                    {/* Service Fields */}
                    {spanishEnabled ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        {/* English Name */}
                        <div className="p-3 rounded-lg border-2 bg-dark-800 border-blue-200">
                          <div className="flex items-center justify-between mb-1">
                            <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded">
                              EN
                            </span>
                          </div>
                          <input
                            type="text"
                            value={service.name}
                            onChange={(e) =>
                              handleUpdateService(idx, "name", e.target.value)
                            }
                            disabled={disabled}
                            className="w-full border border-dark-600 rounded px-2 py-1.5 text-sm bg-dark-700 text-dark-100 focus:ring-2 focus:ring-metro-orange focus:border-metro-orange disabled:bg-dark-800"
                            placeholder="English name"
                          />
                          <p className="text-xs text-dark-400 mt-1 font-mono truncate">
                            /{service.slug}
                          </p>
                        </div>

                        {/* Spanish Name */}
                        <div
                          className={`p-3 rounded-lg border-2 ${
                            service.nameEs
                              ? "bg-dark-800 border-green-200"
                              : "bg-dark-900 border-dark-700 border-dashed"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="inline-block px-2 py-0.5 bg-metro-green-950 text-metro-green text-xs font-bold rounded">
                              ES
                            </span>
                          </div>
                          <input
                            type="text"
                            value={service.nameEs || ""}
                            onChange={(e) =>
                              handleUpdateService(idx, "nameEs", e.target.value)
                            }
                            disabled={disabled}
                            className="w-full border border-dark-600 rounded px-2 py-1.5 text-sm bg-dark-700 text-dark-100 focus:ring-2 focus:ring-metro-orange focus:border-metro-orange disabled:bg-dark-800"
                            placeholder="Spanish name"
                          />
                          <p className="text-xs text-dark-400 mt-1 font-mono truncate">
                            /{service.slug}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-3">
                        <input
                          type="text"
                          value={service.name}
                          onChange={(e) =>
                            handleUpdateService(idx, "name", e.target.value)
                          }
                          disabled={disabled}
                          className="w-full border border-dark-600 rounded-lg px-3 py-2 text-sm bg-dark-700 text-dark-100 focus:ring-2 focus:ring-metro-orange focus:border-metro-orange disabled:bg-dark-800"
                          placeholder="Service name"
                        />
                        <p className="text-xs text-dark-400 mt-1 font-mono">
                          /{service.slug}
                        </p>
                      </div>
                    )}

                    {/* Primary checkbox */}
                    <label className="flex items-center gap-2 text-sm text-dark-200">
                      <input
                        type="checkbox"
                        checked={service.isPrimary}
                        onChange={(e) =>
                          handleUpdateService(idx, "isPrimary", e.target.checked)
                        }
                        disabled={disabled}
                        className="rounded border-dark-600 text-metro-orange focus:ring-metro-orange disabled:opacity-50"
                      />
                      Primary service
                    </label>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => handleRemoveService(idx)}
                    disabled={disabled}
                    className="flex-shrink-0 px-3 py-2 text-metro-red hover:bg-metro-red-950 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                    aria-label={`Delete ${service.name}`}
                  >
                    <span className="flex items-center gap-1">
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      Delete
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );

  // Render Bulk Add Tab
  const renderBulkAddTab = () => {
    const { services: parsedServices, errors: parseErrors } = parseBulkCSV(
      bulkText,
      spanishEnabled
    );

    const hasContent = parsedServices.length > 0;
    const hasParseErrors = parseErrors.length > 0;

    return (
      <div className="space-y-4">
        {/* Format instructions */}
        <div className="text-sm text-dark-400 bg-dark-900 p-3 rounded border">
          <p className="font-medium text-dark-200 mb-1">
            {spanishEnabled
              ? "Paste a 2-column CSV (comma or tab separated)"
              : "Paste service names (one per line)"}
          </p>
          {spanishEnabled ? (
            <p>
              Format:{" "}
              <code className="bg-dark-700 px-1 rounded">
                english name, spanish name
              </code>
            </p>
          ) : (
            <p>One service name per line</p>
          )}
        </div>

        {/* Textarea */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-dark-200">
            Paste services
            {parsedServices.length > 0 && (
              <span className="ml-2 text-xs text-metro-green">
                ({parsedServices.length} service
                {parsedServices.length !== 1 ? "s" : ""} detected)
              </span>
            )}
          </label>
          <textarea
            className="border border-dark-600 rounded p-2 w-full font-mono text-sm h-64 resize-none bg-dark-700 text-dark-100 focus:ring-2 focus:ring-metro-orange focus:border-metro-orange"
            placeholder={
              spanishEnabled
                ? `Criminal Defense, Defensa Criminal
DUI Defense, Defensa de DUI
Personal Injury, Lesiones Personales
Traffic Violations, Violaciones de Trafico`
                : `Criminal Defense
DUI Defense
Personal Injury
Traffic Violations`
            }
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            disabled={disabled}
          />
        </div>

        {/* Parse errors */}
        {hasParseErrors && (
          <div className="p-3 bg-metro-red-950 border border-red-200 rounded text-metro-red-600">
            <p className="text-sm font-medium mb-1">Format errors:</p>
            <ul className="text-sm list-disc pl-5">
              {parseErrors.slice(0, 5).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
              {parseErrors.length > 5 && (
                <li>...and {parseErrors.length - 5} more</li>
              )}
            </ul>
          </div>
        )}

        {/* Success indicator */}
        {parsedServices.length > 0 && !hasParseErrors && (
          <div className="flex items-center gap-2 p-3 bg-metro-green-950 border border-green-200 rounded text-metro-green-600">
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium">
              {parsedServices.length} service
              {parsedServices.length !== 1 ? "s" : ""} ready to add
            </span>
          </div>
        )}

        {/* Preview of parsed services */}
        {parsedServices.length > 0 && parsedServices.length <= 10 && (
          <div className="text-sm">
            <p className="font-medium text-dark-200 mb-2">Preview:</p>
            <div className="bg-dark-900 border rounded p-2 space-y-1 max-h-40 overflow-y-auto">
              {parsedServices.map((service, i) => (
                <div key={i} className="flex gap-2 text-xs font-mono">
                  <span className="text-metro-orange">{service.name}</span>
                  {service.nameEs && (
                    <>
                      <span className="text-dark-500">=</span>
                      <span className="text-metro-green">{service.nameEs}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add button */}
        <button
          className="bg-metro-orange text-white px-4 py-2 rounded hover:bg-metro-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          onClick={handleBulkAdd}
          disabled={disabled || !hasContent || hasParseErrors}
        >
          Add {parsedServices.length} Service
          {parsedServices.length !== 1 ? "s" : ""}
        </button>

        {/* Help text */}
        <div className="text-sm text-dark-400 space-y-1 border-t pt-4">
          <p className="font-medium text-dark-200">Notes:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Duplicate services are automatically skipped</li>
            {spanishEnabled && (
              <>
                <li>Accepts comma-separated or tab-separated values</li>
                <li>Copy from Excel/Google Sheets works directly</li>
              </>
            )}
          </ul>
        </div>
      </div>
    );
  };

  // Render Settings Tab
  const renderSettingsTab = () => {
    if (settingsLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-dark-400">Loading settings...</span>
        </div>
      );
    }
    return (
      <KeywordsSettings
        enabledLanguages={enabledLanguages}
        onEnabledLanguagesChange={handleEnabledLanguagesChange}
        isSaving={settingsSaving}
      />
    );
  };

  return (
    <DashboardLayout>
      <div className="pb-24">
        {/* Header */}
        <div className="mb-6">
          <h1 className="mb-2 text-2xl font-bold">{uiLabels.servicesLabel}</h1>
          <p className="text-dark-400">
            Manage your {uiLabels.servicesLabel.toLowerCase()} for SEO content generation.
          </p>
        </div>

        {!selectedBusiness ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 text-dark-500 mx-auto mb-4">
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                className="w-full h-full"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5.5m0 0H9m0 0H3.5m0 0H1"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-dark-100 mb-2">
              No business selected
            </h3>
            <p className="text-dark-400">
              Select a business from the sidebar to manage its services.
            </p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="border-b border-dark-700 mb-4">
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
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="bg-dark-800 border rounded-lg shadow-sm p-6">
              {activeTab === "manage" && renderManageTab()}
              {activeTab === "bulk-add" && renderBulkAddTab()}
              {activeTab === "settings" && renderSettingsTab()}
            </div>
          </>
        )}
      </div>

      {/* Sticky Footer with Save Controls */}
      {selectedBusiness && !loading && activeTab !== "settings" && (
        <StickyFooter
          hasChanges={hasUnsavedChanges}
          isSaving={saving}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </DashboardLayout>
  );
};

export default ServicesManagement;
