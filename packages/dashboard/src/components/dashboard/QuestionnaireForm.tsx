import React, { useState, useEffect } from "react";
import {
  QuestionnaireDataStructure,
  BrandVoiceTone,
  ServiceOffering,
} from "@marketbrewer/shared";

interface QuestionnaireFormProps {
  data: QuestionnaireDataStructure;
  onDataChange: (data: QuestionnaireDataStructure) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving?: boolean;
  isLoading?: boolean;
  hasUnsavedChanges?: boolean;
  businessId?: string;
  onBulkOperationChange?: (isLoading: boolean) => void;
}

type TabName = "identity" | "services" | "audience" | "brand";

const TABS: { name: TabName; label: string }[] = [
  { name: "identity", label: "Identity" },
  { name: "services", label: "Services" },
  { name: "audience", label: "Audience" },
  { name: "brand", label: "Brand" },
];

const BRAND_VOICE_OPTIONS = Object.values(BrandVoiceTone);

/**
 * QuestionnaireForm V1 - Clean rebuild for V1 schema
 *
 * V1 Structure:
 * - identity: { tagline, yearEstablished, ownerName }
 * - services: { offerings[] }
 * - audience: { targetDescription, languages[] }
 * - brand: { voiceTone, forbiddenTerms[], callToAction }
 * - serviceType: "onsite" | "mobile" | "both"
 *
 * Note: Business name and industry are now in Core Details (Business table)
 * Note: Location/hours/social are now in separate profile sections
 */
export const QuestionnaireForm: React.FC<QuestionnaireFormProps> = ({
  data,
  onDataChange,
  onSave,
  onCancel,
  isSaving = false,
  isLoading = false,
  hasUnsavedChanges = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabName>("identity");
  const [warnings, setWarnings] = useState<Record<string, string[]>>({});
  const [bulkServicesText, setBulkServicesText] = useState<string>("");

  // Validate current section (gentle validation - warnings only)
  const validateCurrentSection = () => {
    const newWarnings: Record<string, string[]> = {};

    if (activeTab === "identity") {
      const warns: string[] = [];
      if (!data.identity.ownerName)
        warns.push("Owner name helps personalize content");
      if (warns.length > 0) newWarnings.identity = warns;
    } else if (activeTab === "services") {
      const warns: string[] = [];
      if (data.services.offerings.length === 0)
        warns.push("Add at least one service offering");
      if (warns.length > 0) newWarnings.services = warns;
    } else if (activeTab === "audience") {
      const warns: string[] = [];
      if (!data.audience.targetDescription)
        warns.push("Target description helps tailor content");
      if (warns.length > 0) newWarnings.audience = warns;
    } else if (activeTab === "brand") {
      const warns: string[] = [];
      if (!data.brand.voiceTone) warns.push("Voice tone is not selected");
      if (!data.brand.callToAction) warns.push("Call to action is required");
      if (warns.length > 0) newWarnings.brand = warns;
    }

    setWarnings(newWarnings);
  };

  // Validate when tab changes or data changes
  useEffect(() => {
    validateCurrentSection();
  }, [activeTab, data]);

  // Clear warnings when changes are discarded
  useEffect(() => {
    if (!hasUnsavedChanges) {
      setWarnings({});
    }
  }, [hasUnsavedChanges]);

  const handleTabChange = (tab: TabName) => {
    setActiveTab(tab);
  };

  const updateData = <K extends keyof QuestionnaireDataStructure>(
    section: K,
    updates: Partial<QuestionnaireDataStructure[K]>
  ) => {
    const newData = {
      ...data,
      [section]: {
        ...(data[section] as object),
        ...(updates as object),
      },
    } as QuestionnaireDataStructure;
    onDataChange(newData);
  };

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

  const handleBulkServicesAdd = () => {
    const parsed = parseBulkServices(bulkServicesText);
    if (parsed.length === 0) {
      alert(
        "No valid service lines found. Use 'Name | Description | primary' format."
      );
      return;
    }
    updateData("services", {
      offerings: [...data.services.offerings, ...parsed],
    });
    setBulkServicesText("");
  };

  // V1 uses simplified completeness: check if key fields are filled
  const calculateSimpleCompleteness = (): number => {
    let filled = 0;
    let total = 0;

    // Identity (3 fields)
    if (data.identity.tagline) filled++;
    total++;
    if (data.identity.yearEstablished) filled++;
    total++;
    if (data.identity.ownerName) filled++;
    total++;

    // Services (1 field)
    if (data.services.offerings.length > 0) filled++;
    total++;

    // Audience (2 fields)
    if (data.audience.targetDescription) filled++;
    total++;
    if (data.audience.languages.length > 0) filled++;
    total++;

    // Brand (3 fields)
    if (data.brand.voiceTone) filled++;
    total++;
    if (data.brand.forbiddenTerms.length > 0) filled++;
    total++;
    if (data.brand.callToAction) filled++;
    total++;

    return Math.round((filled / total) * 100);
  };

  const BRAND_VOICE_OPTIONS = Object.values(BrandVoiceTone);

  if (isLoading) {
    return <div className="text-gray-500">Loading questionnaire...</div>;
  }

  const completeness = calculateSimpleCompleteness();

  return (
    <div className="space-y-4">
      {/* Header with progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Content Profile</h3>
          <span className="text-sm text-gray-600">
            {completeness}% Complete
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${completeness}%` }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-300 overflow-x-auto pb-2 -mb-px">
        {TABS.map(({ name, label }) => (
          <button
            key={name}
            onClick={() => handleTabChange(name)}
            className={`px-4 py-2 font-medium whitespace-nowrap transition-colors ${
              activeTab === name
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="space-y-4">
        {/* Identity Tab */}
        {activeTab === "identity" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Core identity and background information
            </p>

            <div>
              <label className="block text-sm font-medium mb-1">Tagline</label>
              <input
                type="text"
                value={data.identity.tagline}
                onChange={(e) =>
                  updateData("identity", { tagline: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
                placeholder="e.g., The Best Fried Chicken in Town"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional. Used in meta descriptions and content.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Year Established
              </label>
              <input
                type="text"
                value={data.identity.yearEstablished}
                onChange={(e) =>
                  updateData("identity", { yearEstablished: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
                placeholder="e.g., 2015"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional. Adds credibility to content.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Owner Name
              </label>
              <input
                type="text"
                value={data.identity.ownerName}
                onChange={(e) =>
                  updateData("identity", { ownerName: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
                placeholder="e.g., John Smith"
              />
              {warnings.identity && warnings.identity.length > 0 && (
                <p className="text-yellow-600 text-xs mt-1">
                  ⚠ {warnings.identity[0]}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Optional. Helps personalize content.
              </p>
            </div>
          </div>
        )}

        {/* Services Tab */}
        {activeTab === "services" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Define your service offerings
            </p>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">
                  Service Offerings
                </label>
                <button
                  onClick={() => {
                    const newOfferings = [
                      ...data.services.offerings,
                      { name: "", description: "", isPrimary: false },
                    ];
                    updateData("services", { offerings: newOfferings });
                  }}
                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                >
                  Add Service
                </button>
              </div>

              <div className="space-y-3">
                {data.services.offerings.map((offering, idx) => (
                  <div
                    key={idx}
                    className="border rounded p-3 space-y-2 bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={offering.name}
                        onChange={(e) => {
                          const newOfferings = [...data.services.offerings];
                          newOfferings[idx].name = e.target.value;
                          updateData("services", { offerings: newOfferings });
                        }}
                        className="flex-1 border rounded px-2 py-1 text-sm"
                        placeholder="Service name"
                      />
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={offering.isPrimary}
                          onChange={(e) => {
                            const newOfferings = [...data.services.offerings];
                            newOfferings[idx].isPrimary = e.target.checked;
                            updateData("services", { offerings: newOfferings });
                          }}
                        />
                        Primary
                      </label>
                      <button
                        onClick={() => {
                          const newOfferings = data.services.offerings.filter(
                            (_, i) => i !== idx
                          );
                          updateData("services", { offerings: newOfferings });
                        }}
                        className="text-red-600 hover:text-red-700 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                    <textarea
                      value={offering.description}
                      onChange={(e) => {
                        const newOfferings = [...data.services.offerings];
                        newOfferings[idx].description = e.target.value;
                        updateData("services", { offerings: newOfferings });
                      }}
                      className="w-full border rounded px-2 py-1 text-sm"
                      placeholder="Brief description of this service"
                      rows={2}
                    />
                  </div>
                ))}
              </div>

              {warnings.services && warnings.services.length > 0 && (
                <p className="text-yellow-600 text-xs mt-1">
                  ⚠ {warnings.services[0]}
                </p>
              )}

              {/* Bulk add services */}
              <div className="mt-4 space-y-2 border-t pt-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium">
                    Bulk Add Services
                  </label>
                  <span className="text-xs text-gray-500">
                    Format: Name | Description | primary
                  </span>
                </div>
                <textarea
                  value={bulkServicesText}
                  onChange={(e) => setBulkServicesText(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                  rows={4}
                  placeholder="Fried Chicken | Crispy signature chicken | primary&#10;Catering | On-site and delivery |"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleBulkServicesAdd}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    Add Services
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Audience Tab */}
        {activeTab === "audience" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Define your target audience</p>

            <div>
              <label className="block text-sm font-medium mb-1">
                Target Audience Description
              </label>
              <textarea
                value={data.audience.targetDescription}
                onChange={(e) =>
                  updateData("audience", { targetDescription: e.target.value })
                }
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="e.g., Working parents, families, late-night diners looking for quick quality meals"
                rows={3}
              />
              {warnings.audience && warnings.audience.length > 0 && (
                <p className="text-yellow-600 text-xs mt-1">
                  ⚠ {warnings.audience[0]}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Optional. Helps tailor content tone and focus.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Languages
              </label>
              <input
                type="text"
                value={data.audience.languages.join(", ")}
                onChange={(e) =>
                  updateData("audience", {
                    languages: e.target.value
                      .split(",")
                      .map((l) => l.trim())
                      .filter(Boolean),
                  })
                }
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="e.g., English, Spanish"
              />
              <p className="text-xs text-gray-500 mt-1">
                Comma-separated list. Optional.
              </p>
            </div>
          </div>
        )}

        {/* Brand Tab */}
        {activeTab === "brand" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Define your brand voice and communication style
            </p>

            <div>
              <label className="block text-sm font-medium mb-1">
                Brand Voice Tone
              </label>
              <select
                value={data.brand.voiceTone}
                onChange={(e) =>
                  updateData("brand", {
                    voiceTone: e.target.value as BrandVoiceTone,
                  })
                }
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Select a tone...</option>
                {BRAND_VOICE_OPTIONS.map((tone) => (
                  <option key={tone} value={tone}>
                    {tone.charAt(0).toUpperCase() + tone.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
              {warnings.brand && warnings.brand.length > 0 && (
                <p className="text-yellow-600 text-xs mt-1">
                  ⚠ {warnings.brand[0]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Call to Action
              </label>
              <textarea
                value={data.brand.callToAction}
                onChange={(e) =>
                  updateData("brand", { callToAction: e.target.value })
                }
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="e.g., Call us today at (555) 123-4567 or visit our website to order online"
                rows={2}
              />
              <p className="text-xs text-gray-500 mt-1">
                Main call-to-action used in content.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">
                  Forbidden Terms
                </label>
                <button
                  onClick={() => {
                    updateData("brand", {
                      forbiddenTerms: [...data.brand.forbiddenTerms, ""],
                    });
                  }}
                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                >
                  Add Term
                </button>
              </div>
              <div className="space-y-2">
                {data.brand.forbiddenTerms.map((term, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={term}
                      onChange={(e) => {
                        const newTerms = [...data.brand.forbiddenTerms];
                        newTerms[idx] = e.target.value;
                        updateData("brand", { forbiddenTerms: newTerms });
                      }}
                      className="flex-1 border rounded px-2 py-1 text-sm"
                      placeholder="e.g., cheap, mediocre"
                    />
                    <button
                      onClick={() => {
                        const newTerms = data.brand.forbiddenTerms.filter(
                          (_, i) => i !== idx
                        );
                        updateData("brand", { forbiddenTerms: newTerms });
                      }}
                      className="text-red-600 hover:text-red-700 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Optional. Terms to avoid in generated content.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 justify-end pt-4 border-t">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        {hasUnsavedChanges && (
          <span className="text-xs text-yellow-600 flex items-center">
            ⚠ Unsaved changes
          </span>
        )}
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
};
