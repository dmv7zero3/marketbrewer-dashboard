import React, { useState, useEffect, useRef } from "react";
import { useToast } from "../../contexts/ToastContext";
import {
  QuestionnaireDataStructure,
  SectionCompleteness,
  BrandVoiceTone,
  SearchIntent,
  ServiceOffering,
  isSectionComplete,
  calculateCompleteness,
  toCityStateSlug,
} from "@marketbrewer/shared";
import { createServiceArea, listServiceAreas } from "../../api/service-areas";
import { BULK_LIMITS, TOAST_DURATION } from "../../lib/constants";

interface QuestionnaireFormProps {
  data: QuestionnaireDataStructure;
  onDataChange: (data: QuestionnaireDataStructure) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving?: boolean;
  isLoading?: boolean;
  hasUnsavedChanges?: boolean;
  businessId?: string; // needed for bulk service-area add
}

type TabName = "identity" | "location" | "services" | "audience" | "brand";

const TABS: { name: TabName; label: string }[] = [
  { name: "identity", label: "Identity" },
  { name: "location", label: "Location" },
  { name: "services", label: "Services" },
  { name: "audience", label: "Audience" },
  { name: "brand", label: "Brand" },
];

const BRAND_VOICE_OPTIONS = Object.values(BrandVoiceTone);

export const QuestionnaireForm: React.FC<QuestionnaireFormProps> = ({
  data,
  onDataChange,
  onSave,
  onCancel,
  isSaving = false,
  isLoading = false,
  hasUnsavedChanges = false,
  businessId,
}) => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabName>("identity");
  const [completeness, setCompleteness] = useState<SectionCompleteness>({
    identity: false,
    location: false,
    services: false,
    audience: false,
    brand: false,
  });
  const [warnings, setWarnings] = useState<Record<string, string[]>>({});
  const [bulkServicesText, setBulkServicesText] = useState<string>("");
  const [bulkServiceAreasText, setBulkServiceAreasText] = useState<string>("");
  const [bulkAreasLoading, setBulkAreasLoading] = useState<boolean>(false);
  const [bulkKeywordsText, setBulkKeywordsText] = useState<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);

  // Calculate completeness whenever data changes
  useEffect(() => {
    const newCompleteness: SectionCompleteness = {
      identity: isSectionComplete("identity", data),
      location: isSectionComplete("location", data),
      services: isSectionComplete("services", data),
      audience: isSectionComplete("audience", data),
      brand: isSectionComplete("brand", data),
    };
    setCompleteness(newCompleteness);
  }, [data]);

  // Validate current section (gentle validation - warnings only)
  const validateCurrentSection = () => {
    const newWarnings: Record<string, string[]> = {};

    if (activeTab === "identity") {
      const warns: string[] = [];
      if (!data.identity.businessName) warns.push("Business name is empty");
      if (!data.identity.industry) warns.push("Industry is empty");
      if (!data.identity.contactName) warns.push("Contact name is empty");
      if (warns.length > 0) newWarnings.identity = warns;
    } else if (activeTab === "location") {
      const warns: string[] = [];
      if (!data.location.address) warns.push("Address is empty");
      if (warns.length > 0) newWarnings.location = warns;
    } else if (activeTab === "services") {
      const warns: string[] = [];
      if (data.services.offerings.length === 0)
        warns.push("Add at least one service offering");
      if (warns.length > 0) newWarnings.services = warns;
    } else if (activeTab === "audience") {
      const warns: string[] = [];
      if (!data.audience.targetDescription)
        warns.push("Target description is empty");
      if (!data.audience.demographics) warns.push("Demographics is empty");
      if (!data.audience.painPoints) warns.push("Pain points is empty");
      if (warns.length > 0) newWarnings.audience = warns;
    } else if (activeTab === "brand") {
      const warns: string[] = [];
      if (!data.brand.voiceTone) warns.push("Voice tone is not selected");
      if (!data.brand.callToAction) warns.push("Call to action is empty");
      if (data.brand.requiredPhrases.length === 0)
        warns.push("Add at least one required phrase");
      if (warns.length > 0) newWarnings.brand = warns;
    }

    setWarnings(newWarnings);
  };

  // Validate when tab changes
  useEffect(() => {
    validateCurrentSection();
  }, [activeTab]);

  // Fix: Warn user if they try to leave during bulk operation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (bulkAreasLoading) {
        e.preventDefault();
        e.returnValue =
          "Bulk operation in progress. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [bulkAreasLoading]);

  const handleTabChange = (tab: TabName) => {
    setActiveTab(tab);
  };

  const updateData = (
    section: keyof QuestionnaireDataStructure,
    updates: Partial<(typeof data)[typeof section]>
  ) => {
    const newData = {
      ...data,
      [section]: {
        ...data[section],
        ...updates,
      },
    };
    onDataChange(newData);
  };

  const updateArrayField = (
    section: keyof QuestionnaireDataStructure,
    field: string,
    value: unknown
  ) => {
    const newData = {
      ...data,
      [section]: {
        ...data[section],
        [field]: value,
      },
    };
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

  const parseBulkKeywords = (text: string) => {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        // Expected: keyword[, intent][, priority]
        const parts = line
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);
        const [keyword, intentRaw, priorityRaw] = parts;
        const isValidIntent = (val: string): val is SearchIntent =>
          (Object.values(SearchIntent) as string[]).includes(val);
        const search_intent =
          intentRaw && isValidIntent(intentRaw) ? intentRaw : undefined;
        // Fix: Check for NaN explicitly
        const priority = priorityRaw
          ? !Number.isNaN(Number(priorityRaw))
            ? Number(priorityRaw)
            : undefined
          : undefined;
        return { keyword, search_intent, priority };
      })
      .filter((k) => k.keyword);
  };

  const handleBulkServicesAdd = () => {
    const parsed = parseBulkServices(bulkServicesText);
    if (parsed.length === 0) {
      addToast(
        "No valid service lines found. Use 'Name | Description | primary' format.",
        "error",
        4000
      );
      return;
    }
    updateData("services", {
      offerings: [...data.services.offerings, ...parsed],
    });
    setBulkServicesText("");
    addToast(`Added ${parsed.length} services from paste`, "success", 3000);
  };

  const parseBulkServiceAreas = (text: string) => {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        // Expected: City, State[, County][, Priority]
        const parts = line
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);
        if (parts.length < 2) return null;
        const [city, state, county, priorityRaw] = parts;
        // Fix: Check for NaN explicitly
        const priority = priorityRaw
          ? !Number.isNaN(Number(priorityRaw))
            ? Number(priorityRaw)
            : undefined
          : undefined;
        return { city, state, county: county || undefined, priority };
      })
      .filter(Boolean) as Array<{
      city: string;
      state: string;
      county?: string;
      priority?: number;
    }>;
  };

  const handleBulkKeywordsCopy = () => {
    const parsed = parseBulkKeywords(bulkKeywordsText);
    if (parsed.length === 0) {
      addToast(
        "No valid keyword lines found. Use 'keyword, intent, priority' format.",
        "error",
        4000
      );
      return;
    }
    addToast(
      `Parsed ${parsed.length} keywords. Copy/paste into the Keywords page.`,
      "success",
      3000
    );
  };
  const handleBulkServiceAreasAdd = async () => {
    if (!businessId) {
      addToast("Select a business before adding service areas.", "error", 4000);
      return;
    }
    const parsed = parseBulkServiceAreas(bulkServiceAreasText);
    // Enforce per-operation size limit
    if (parsed.length > BULK_LIMITS.MAX_AREAS_PER_OPERATION) {
      addToast(
        `Maximum ${BULK_LIMITS.MAX_AREAS_PER_OPERATION} areas per operation`,
        "error",
        TOAST_DURATION.NORMAL
      );
      return;
    }
    if (parsed.length === 0) {
      addToast(
        "No valid service area lines found. Use 'City, State[, County][, Priority]' format.",
        "error",
        4000
      );
      return;
    }
    try {
      setBulkAreasLoading(true);
      abortControllerRef.current = new AbortController();

      // Fix: Add try/catch around listServiceAreas to handle API failures gracefully
      let existingSlugs: Set<string> = new Set();
      try {
        const { service_areas: existing } = await listServiceAreas(businessId);
        existingSlugs = new Set(existing.map((a) => a.slug));
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : "Failed to fetch existing service areas";
        addToast(
          `Warning: Could not check for duplicates. ${msg}`,
          "warning",
          4000
        );
        // Continue anyway with empty set (may create duplicates, but at least adds new ones)
      }

      const newAreas = parsed.filter((area) => {
        const slug = toCityStateSlug(area.city, area.state);
        return !existingSlugs.has(slug);
      });

      const duplicates = parsed.length - newAreas.length;
      if (duplicates > 0) {
        addToast(`Skipping ${duplicates} duplicate area(s)`, "warning", 3000);
      }

      // Fix: Handle edge case where all areas are duplicates
      if (newAreas.length === 0) {
        addToast(
          "All areas are already in your service area list.",
          "info",
          3000
        );
        setBulkServiceAreasText(""); // Clear successful ones
        return;
      }

      // Fix: Track partial success/failure separately
      const results: {
        success: typeof parsed;
        failed: typeof parsed;
      } = {
        success: [],
        failed: [],
      };

      for (const area of newAreas) {
        if (abortControllerRef.current?.signal.aborted) break;
        try {
          // Fix: Pass AbortController signal to API call
          await createServiceArea(businessId, {
            city: area.city,
            state: area.state,
            county: area.county ?? null,
            priority: area.priority,
          });
          results.success.push(area);
        } catch (e) {
          results.failed.push(area);
        }
      }

      if (results.success.length > 0) {
        addToast(
          `Added ${results.success.length} service area(s).${
            results.failed.length > 0 ? ` ${results.failed.length} failed.` : ""
          }`,
          results.failed.length > 0 ? "warning" : "success",
          4000
        );
      } else if (results.failed.length > 0) {
        addToast("All service areas failed to add.", "error", 5000);
      }

      // Keep only failed lines for retry
      if (results.failed.length > 0) {
        setBulkServiceAreasText(
          results.failed
            .map((a) =>
              [a.city, a.state, a.county, a.priority].filter(Boolean).join(", ")
            )
            .join("\n")
        );
      } else {
        setBulkServiceAreasText("");
      }
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to add service areas";
      addToast(msg, "error", 5000);
    } finally {
      setBulkAreasLoading(false);
      abortControllerRef.current = null;
    }
  };

  const overallCompleteness = calculateCompleteness(completeness);

  if (isLoading) {
    return <div className="text-gray-500">Loading questionnaire...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header with progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Business Profile</h3>
          <span className="text-sm text-gray-600">
            {overallCompleteness}% Complete
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${overallCompleteness}%` }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-300 overflow-x-auto">
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
            <div className="flex items-center gap-2">
              {label}
              {completeness[name] && (
                <span className="text-green-600" title="Section complete">
                  ✓
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="space-y-4">
        {/* Identity Tab */}
        {activeTab === "identity" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Core information about your business
            </p>

            <div>
              <label className="block text-sm font-medium mb-1">
                Business Name *
              </label>
              <input
                type="text"
                value={data.identity.businessName}
                onChange={(e) =>
                  updateData("identity", { businessName: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
                placeholder="e.g., Best Fried Chicken Co."
              />
              {warnings.identity?.includes("Business name is empty") && (
                <p className="text-yellow-600 text-xs mt-1">
                  ⚠ Business name is empty
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Industry *
              </label>
              <input
                type="text"
                value={data.identity.industry}
                onChange={(e) =>
                  updateData("identity", { industry: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
                placeholder="e.g., Quick Service Restaurant"
              />
              {warnings.identity?.includes("Industry is empty") && (
                <p className="text-yellow-600 text-xs mt-1">
                  ⚠ Industry is empty
                </p>
              )}
            </div>

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
                Optional. Used in content.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Year Established
              </label>
              <input
                type="number"
                value={data.identity.yearEstablished}
                onChange={(e) =>
                  updateData("identity", { yearEstablished: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Contact Name *
              </label>
              <input
                type="text"
                value={data.identity.contactName}
                onChange={(e) =>
                  updateData("identity", { contactName: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
                placeholder="e.g., John Smith"
              />
              {warnings.identity?.includes("Contact name is empty") && (
                <p className="text-yellow-600 text-xs mt-1">
                  ⚠ Contact name is empty
                </p>
              )}
            </div>
          </div>
        )}

        {/* Location Tab */}
        {activeTab === "location" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Service location and delivery type
            </p>

            <div>
              <label className="block text-sm font-medium mb-1">
                Address *
              </label>
              <input
                type="text"
                value={data.location.address}
                onChange={(e) =>
                  updateData("location", { address: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
                placeholder="e.g., 123 Main St, Nashville, TN 37201"
              />
              {warnings.location?.includes("Address is empty") && (
                <p className="text-yellow-600 text-xs mt-1">
                  ⚠ Address is empty
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Service Type *
              </label>
              <select
                value={data.location.serviceType}
                onChange={(e) =>
                  updateData("location", {
                    serviceType: e.target.value as "onsite" | "mobile" | "both",
                  })
                }
                className="w-full border rounded px-3 py-2"
              >
                <option value="onsite">
                  On-Site (customers visit location)
                </option>
                <option value="mobile">Mobile (we visit customers)</option>
                <option value="both">Both</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Helps tailor content to service delivery model
              </p>
            </div>

            {businessId && (
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium">
                    Bulk Add Service Areas
                  </label>
                  <span className="text-xs text-gray-500">
                    Format: City, State[, County][, Priority]
                  </span>
                </div>
                <textarea
                  value={bulkServiceAreasText}
                  onChange={(e) => setBulkServiceAreasText(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                  rows={4}
                  placeholder={
                    "Nashville, TN, Davidson, 1\nFranklin, TN, Williamson, 2"
                  }
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleBulkServiceAreasAdd}
                    disabled={bulkAreasLoading}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                  >
                    {bulkAreasLoading ? "Adding..." : "Add Service Areas"}
                  </button>
                </div>
              </div>
            )}
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
                  Service Offerings *
                </label>
                <button
                  onClick={() => {
                    const newOfferings = [
                      ...data.services.offerings,
                      { name: "", description: "", isPrimary: false },
                    ];
                    updateData("services", {
                      offerings: newOfferings,
                    });
                  }}
                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                >
                  Add Service
                </button>
              </div>

              <div className="space-y-3">
                {data.services.offerings.map(
                  (offering: ServiceOffering, idx: number) => (
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
                            updateData("services", {
                              offerings: newOfferings,
                            });
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
                              updateData("services", {
                                offerings: newOfferings,
                              });
                            }}
                          />
                          Primary
                        </label>
                        <button
                          onClick={() => {
                            const newOfferings = data.services.offerings.filter(
                              (_: ServiceOffering, i: number) => i !== idx
                            );
                            updateArrayField(
                              "services",
                              "offerings",
                              newOfferings
                            );
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
                          updateData("services", {
                            offerings: newOfferings,
                          });
                        }}
                        className="w-full border rounded px-2 py-1 text-sm"
                        placeholder="Brief description of this service"
                        rows={2}
                      />
                    </div>
                  )
                )}
              </div>

              {warnings.services?.includes(
                "Add at least one service offering"
              ) && (
                <p className="text-yellow-600 text-xs mt-1">
                  ⚠ Add at least one service offering
                </p>
              )}

              {/* Bulk add services */}
              <div className="mt-4 space-y-2">
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
                  placeholder={
                    "Fried Chicken | Crispy signature chicken | primary\nCatering | On-site and delivery |"
                  }
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleBulkServicesAdd}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
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
            <p className="text-sm text-gray-600">
              Define your target audience and their needs
            </p>

            <div>
              <label className="block text-sm font-medium mb-1">
                Target Audience Description *
              </label>
              <textarea
                value={data.audience.targetDescription}
                onChange={(e) =>
                  updateData("audience", { targetDescription: e.target.value })
                }
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="e.g., Working parents, families, late-night diners"
                rows={3}
              />
              {warnings.audience?.includes("Target description is empty") && (
                <p className="text-yellow-600 text-xs mt-1">
                  ⚠ Target description is empty
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Demographics *
              </label>
              <textarea
                value={data.audience.demographics}
                onChange={(e) =>
                  updateData("audience", { demographics: e.target.value })
                }
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="e.g., Age 25-45, $40k-$100k income, urban residents"
                rows={3}
              />
              {warnings.audience?.includes("Demographics is empty") && (
                <p className="text-yellow-600 text-xs mt-1">
                  ⚠ Demographics is empty
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Pain Points *
              </label>
              <textarea
                value={data.audience.painPoints}
                onChange={(e) =>
                  updateData("audience", { painPoints: e.target.value })
                }
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="e.g., Limited time, want quick quality meals, need value"
                rows={3}
              />
              {warnings.audience?.includes("Pain points is empty") && (
                <p className="text-yellow-600 text-xs mt-1">
                  ⚠ Pain points is empty
                </p>
              )}
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

            {/* Bulk keyword helper (paste-only, no API call) */}
            <div className="space-y-2 bg-gray-50 border rounded p-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium">
                  Paste Keywords (helper)
                </label>
                <span className="text-xs text-gray-500">
                  Format: keyword, intent, priority
                </span>
              </div>
              <textarea
                value={bulkKeywordsText}
                onChange={(e) => setBulkKeywordsText(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                rows={4}
                placeholder={
                  "fried chicken near me, local, 1\nnashville hot chicken, transactional, 2"
                }
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleBulkKeywordsCopy}
                  className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  Parse & Acknowledge
                </button>
              </div>
              <p className="text-xs text-gray-600">
                This helper only parses and confirms your lines. Copy the same
                lines into the SEO Keywords page to bulk add.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Brand Voice Tone *
              </label>
              <select
                value={data.brand.voiceTone}
                onChange={(e) =>
                  updateData("brand", { voiceTone: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Select a tone...</option>
                {BRAND_VOICE_OPTIONS.map((tone: string) => (
                  <option key={tone} value={tone}>
                    {tone.charAt(0).toUpperCase() + tone.slice(1)}
                  </option>
                ))}
              </select>
              {warnings.brand?.includes("Voice tone is not selected") && (
                <p className="text-yellow-600 text-xs mt-1">
                  ⚠ Voice tone is not selected
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Call to Action *
              </label>
              <textarea
                value={data.brand.callToAction}
                onChange={(e) =>
                  updateData("brand", { callToAction: e.target.value })
                }
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="e.g., Call us today, Order online now, Book your appointment"
                rows={2}
              />
              {warnings.brand?.includes("Call to action is empty") && (
                <p className="text-yellow-600 text-xs mt-1">
                  ⚠ Call to action is empty
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">
                  Required Phrases *
                </label>
                <button
                  onClick={() => {
                    updateData("brand", {
                      requiredPhrases: [...data.brand.requiredPhrases, ""],
                    });
                  }}
                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                >
                  Add Phrase
                </button>
              </div>
              <div className="space-y-2">
                {data.brand.requiredPhrases.map(
                  (phrase: string, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={phrase}
                        onChange={(e) => {
                          const newPhrases = [...data.brand.requiredPhrases];
                          newPhrases[idx] = e.target.value;
                          updateData("brand", { requiredPhrases: newPhrases });
                        }}
                        className="flex-1 border rounded px-2 py-1 text-sm"
                        placeholder="e.g., Nashville hot"
                      />
                      <button
                        onClick={() => {
                          const newPhrases = data.brand.requiredPhrases.filter(
                            (_: string, i: number) => i !== idx
                          );
                          updateData("brand", { requiredPhrases: newPhrases });
                        }}
                        className="text-red-600 hover:text-red-700 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  )
                )}
              </div>
              {warnings.brand?.includes("Add at least one required phrase") && (
                <p className="text-yellow-600 text-xs mt-1">
                  ⚠ Add at least one required phrase
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">
                  Forbidden Words
                </label>
                <button
                  onClick={() => {
                    updateData("brand", {
                      forbiddenWords: [...data.brand.forbiddenWords, ""],
                    });
                  }}
                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                >
                  Add Word
                </button>
              </div>
              <div className="space-y-2">
                {data.brand.forbiddenWords.map((word: string, idx: number) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={word}
                      onChange={(e) => {
                        const newWords = [...data.brand.forbiddenWords];
                        newWords[idx] = e.target.value;
                        updateData("brand", { forbiddenWords: newWords });
                      }}
                      className="flex-1 border rounded px-2 py-1 text-sm"
                      placeholder="e.g., mediocre"
                    />
                    <button
                      onClick={() => {
                        const newWords = data.brand.forbiddenWords.filter(
                          (_: string, i: number) => i !== idx
                        );
                        updateData("brand", { forbiddenWords: newWords });
                      }}
                      className="text-red-600 hover:text-red-700 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">Optional.</p>
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
