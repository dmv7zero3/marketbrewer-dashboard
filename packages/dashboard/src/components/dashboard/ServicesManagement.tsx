import React, { useEffect, useState, useMemo } from "react";
import { DashboardLayout } from "./DashboardLayout";
import { StickyFooter } from "./StickyFooter";
import { useBusiness } from "../../contexts/BusinessContext";
import { useToast } from "../../contexts/ToastContext";
import { getQuestionnaire, updateQuestionnaire } from "../../api/businesses";
import { createEmptyQuestionnaire } from "@marketbrewer/shared";
import { safeDeepMerge } from "../../lib/safe-deep-merge";
import { deepEqual } from "../../lib/deep-equal";
import type {
  QuestionnaireDataStructure,
  ServiceOffering,
} from "@marketbrewer/shared";

/**
 * ServicesManagement: Top-level dashboard page for managing service offerings
 * Edits QuestionnaireDataStructure.services.offerings
 */
export const ServicesManagement: React.FC = () => {
  const { selectedBusiness } = useBusiness();
  const { addToast } = useToast();

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
  const [bulkServicesText, setBulkServicesText] = useState<string>("");

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

        setQuestionnaireData(parsedData);
        setOriginalData(parsedData);
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Failed to load services data";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    // Reset state when business changes
    setQuestionnaireData(createEmptyQuestionnaire());
    setOriginalData(createEmptyQuestionnaire());
    setBulkServicesText("");

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

  // Parse bulk services text
  const parseBulkServices = (text: string): ServiceOffering[] => {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        // Expected format: Name | Description | primary
        const parts = line.split("|").map((p) => p.trim());
        const [name, description = "", primary = ""] = parts;
        return {
          name,
          description,
          isPrimary: /^y(es)?|true|primary$/i.test(primary),
        } as ServiceOffering;
      })
      .filter((s) => s.name);
  };

  // Handlers
  const handleBulkServicesAdd = () => {
    const parsed = parseBulkServices(bulkServicesText);
    if (parsed.length === 0) {
      addToast(
        "No valid service lines found. Use 'Name | Description | primary' format.",
        "warning"
      );
      return;
    }
    updateServices([...questionnaireData.services.offerings, ...parsed]);
    setBulkServicesText("");
    addToast(
      `Added ${parsed.length} service${parsed.length > 1 ? "s" : ""}`,
      "success"
    );
  };

  const handleAddService = () => {
    const newOfferings: ServiceOffering[] = [
      ...questionnaireData.services.offerings,
      { name: "", description: "", isPrimary: false },
    ];
    updateServices(newOfferings);
  };

  const handleUpdateService = (
    idx: number,
    field: keyof ServiceOffering,
    value: string | boolean
  ) => {
    const newOfferings = [...questionnaireData.services.offerings];
    newOfferings[idx] = { ...newOfferings[idx], [field]: value };
    updateServices(newOfferings);
  };

  const handleRemoveService = (idx: number) => {
    const newOfferings = questionnaireData.services.offerings.filter(
      (_, i) => i !== idx
    );
    updateServices(newOfferings);
  };

  const handleSave = async () => {
    if (!selectedBusiness) return;

    try {
      setSaving(true);
      setError(null);

      const response = await updateQuestionnaire(
        selectedBusiness,
        questionnaireData
      );

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
    setBulkServicesText("");
  };

  const disabled = saving;

  return (
    <DashboardLayout>
      <div className="pb-24">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-2xl font-bold">Services</h1>
          <p className="text-gray-600">
            Define your service offerings and product descriptions for
            AI-generated content.
          </p>
        </div>

        {!selectedBusiness ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 text-gray-300 mx-auto mb-4">
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No business selected
            </h3>
            <p className="text-gray-600">
              Select a business from the sidebar to manage its services.
            </p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading services...</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded p-4 text-red-600">
            {error}
          </div>
        ) : (
          <div className="bg-white border rounded-lg shadow-sm p-6">
            <div className="space-y-6">
              {/* Service Offerings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-900">
                    Service Offerings
                  </label>
                  <button
                    onClick={handleAddService}
                    disabled={disabled}
                    className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Add Service
                  </button>
                </div>

                {questionnaireData.services.offerings.length === 0 ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                    <p className="text-gray-500 text-sm">
                      No services added yet. Click "Add Service" to get started.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {questionnaireData.services.offerings.map(
                      (offering, idx) => (
                        <div
                          key={idx}
                          className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="text"
                              value={offering.name}
                              onChange={(e) =>
                                handleUpdateService(idx, "name", e.target.value)
                              }
                              disabled={disabled}
                              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                              placeholder="Service name"
                            />
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={offering.isPrimary}
                                onChange={(e) =>
                                  handleUpdateService(
                                    idx,
                                    "isPrimary",
                                    e.target.checked
                                  )
                                }
                                disabled={disabled}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                              />
                              Primary
                            </label>
                            <button
                              onClick={() => handleRemoveService(idx)}
                              disabled={disabled}
                              className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Remove
                            </button>
                          </div>
                          <textarea
                            value={offering.description}
                            onChange={(e) =>
                              handleUpdateService(
                                idx,
                                "description",
                                e.target.value
                              )
                            }
                            disabled={disabled}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                            placeholder="Brief description of this service"
                            rows={2}
                          />
                        </div>
                      )
                    )}
                  </div>
                )}

                {questionnaireData.services.offerings.length === 0 && (
                  <p className="text-yellow-600 text-xs flex items-center gap-1">
                    <span>⚠</span> Add at least one service offering for better
                    content generation.
                  </p>
                )}
              </div>

              {/* Bulk Add Services */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-900">
                    Bulk Add Services
                  </label>
                  <span className="text-xs text-gray-500">
                    Format: Name | Description | primary
                  </span>
                </div>
                <textarea
                  value={bulkServicesText}
                  onChange={(e) => setBulkServicesText(e.target.value)}
                  disabled={disabled}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                  rows={4}
                  placeholder={`Fried Chicken | Crispy signature chicken | primary\nCatering | On-site and delivery |`}
                />
                <div className="flex justify-end mt-3">
                  <button
                    type="button"
                    onClick={handleBulkServicesAdd}
                    disabled={disabled || !bulkServicesText.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Add Services
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Enter one service per line. Use pipe (|) to separate name,
                  description, and primary flag.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Footer with Save Controls */}
      {selectedBusiness && !loading && (
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
