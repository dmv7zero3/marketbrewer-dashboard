import React, { useEffect, useState, useMemo } from "react";
import { DashboardLayout } from "./DashboardLayout";
import { useBusiness } from "../../contexts/BusinessContext";
import { useToast } from "../../contexts/ToastContext";
import {
  listServiceAreas,
  createServiceArea,
  deleteServiceArea,
} from "../../api/service-areas";
import { validateCity, validateState } from "../../lib/validation";
import { toCityStateSlug } from "@marketbrewer/shared";
import type { ServiceArea } from "@marketbrewer/shared";
import { EmptyState, EmptyStateIcons, StatsCards } from "../ui";
import { useConfirmDialog } from "../../hooks";
import { ConfirmDialog } from "../ui/ConfirmDialog";

type TabName = "manage" | "bulk-add" | "instructions";

const TABS: { name: TabName; label: string }[] = [
  { name: "manage", label: "Manage" },
  { name: "bulk-add", label: "Bulk Add" },
  { name: "instructions", label: "Instructions" },
];

export const ServiceAreas: React.FC = () => {
  const { selectedBusiness } = useBusiness();
  const { addToast } = useToast();
  const { confirm, dialogProps } = useConfirmDialog();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabName>("manage");

  // Data state
  const [areas, setAreas] = useState<ServiceArea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add form state
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [inputErrors, setInputErrors] = useState<{
    city: string | null;
    state: string | null;
  }>({ city: null, state: null });

  // Bulk add state
  const [bulkText, setBulkText] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  // Delete state
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Computed stats
  const stats = useMemo(() => {
    const uniqueStates = new Set(areas.map((a) => a.state));

    return [
      {
        label: "Total Areas",
        value: areas.length,
        color: "blue" as const,
      },
      {
        label: "States Covered",
        value: uniqueStates.size,
        color: "green" as const,
      },
    ];
  }, [areas]);

  // Parsed bulk areas for preview
  const parsedBulkAreas = useMemo(() => {
    return parseBulkServiceAreas(bulkText);
  }, [bulkText]);

  // Load service areas when business changes
  useEffect(() => {
    if (!selectedBusiness) {
      setAreas([]);
      setError(null);
      return;
    }

    const controller = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const { service_areas } = await listServiceAreas(selectedBusiness, {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setAreas(service_areas);
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          if (
            e instanceof Error &&
            e.name !== "CanceledError" &&
            e.name !== "AbortError"
          ) {
            setError(e.message);
            addToast("Failed to load service areas", "error");
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
  }, [selectedBusiness, addToast]);

  // Parse bulk text into service areas
  function parseBulkServiceAreas(text: string) {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        // Expected: City, State[, County]
        const parts = line
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);
        if (parts.length < 2) return null;
        const [city, state, county] = parts;
        return { city, state: state.toUpperCase(), county: county || undefined };
      })
      .filter(Boolean) as Array<{
      city: string;
      state: string;
      county?: string;
    }>;
  }

  // Add single service area
  const handleAdd = async () => {
    if (!selectedBusiness || !city.trim() || !state.trim()) return;

    const cityError = validateCity(city);
    const stateError = validateState(state);

    if (cityError || stateError) {
      setInputErrors({ city: cityError, state: stateError });
      const errors = [];
      if (cityError) errors.push(cityError);
      if (stateError) errors.push(stateError);
      addToast(errors.join("; "), "error", 5000);
      return;
    }

    // Check for duplicates
    const newSlug = toCityStateSlug(city.trim(), state.trim().toUpperCase());
    const exists = areas.some((a) => a.slug === newSlug);
    if (exists) {
      addToast("This service area already exists", "error", 5000);
      return;
    }

    try {
      setInputErrors({ city: null, state: null });
      const { service_area } = await createServiceArea(selectedBusiness, {
        city: city.trim(),
        state: state.trim().toUpperCase(),
        county: null,
      });
      setAreas((prev) => [service_area, ...prev]);
      setCity("");
      setState("");
      addToast("Service area added successfully", "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to add service area";
      addToast(msg, "error", 5000);
    }
  };

  // Delete with confirmation
  const handleDelete = async (area: ServiceArea) => {
    if (!selectedBusiness || deletingIds.has(area.id)) return;

    const confirmed = await confirm({
      title: "Delete Service Area",
      message: `Are you sure you want to delete "${area.city}, ${area.state}"? This cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "danger",
    });

    if (!confirmed) return;

    setDeletingIds((prev) => new Set(prev).add(area.id));
    try {
      await deleteServiceArea(selectedBusiness, area.id);
      setAreas((prev) => prev.filter((a) => a.id !== area.id));
      addToast("Service area deleted successfully", "success");
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to delete service area";
      addToast(msg, "error", 5000);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(area.id);
        return next;
      });
    }
  };

  // Bulk add with preview
  const handleBulkAdd = async () => {
    if (!selectedBusiness) {
      addToast("Select a business before adding service areas.", "error", 4000);
      return;
    }

    const parsed = parsedBulkAreas;

    if (parsed.length === 0) {
      addToast(
        "No valid service area lines found. Use 'City, State[, County]' format.",
        "error",
        4000
      );
      return;
    }

    if (parsed.length > 100) {
      addToast("Maximum 100 areas per operation", "error", 5000);
      return;
    }

    try {
      setBulkLoading(true);

      // Check for duplicates
      const existingSlugs = new Set(areas.map((a) => a.slug));
      const newAreas = parsed.filter((area) => {
        const slug = toCityStateSlug(area.city, area.state);
        return !existingSlugs.has(slug);
      });

      const duplicates = parsed.length - newAreas.length;
      if (duplicates > 0) {
        addToast(`Skipping ${duplicates} duplicate area(s)`, "warning", 3000);
      }

      if (newAreas.length === 0) {
        addToast(
          "All areas are already in your service area list.",
          "info",
          3000
        );
        setBulkText("");
        return;
      }

      const results: {
        success: typeof parsed;
        failed: typeof parsed;
      } = {
        success: [],
        failed: [],
      };

      for (let i = 0; i < newAreas.length; i++) {
        const area = newAreas[i];
        try {
          await createServiceArea(selectedBusiness, {
            city: area.city,
            state: area.state,
            county: area.county ?? null,
          });
          results.success.push(area);

          // Progress update every 5 areas
          if ((i + 1) % 5 === 0 || i === newAreas.length - 1) {
            addToast(
              `Adding areas: ${i + 1} of ${newAreas.length}...`,
              "info",
              1000
            );
          }
        } catch (e) {
          results.failed.push(area);
        }
      }

      if (results.success.length > 0) {
        addToast(
          `Added ${results.success.length} service area(s)${
            results.failed.length > 0 ? ` | ${results.failed.length} failed` : ""
          }`,
          results.failed.length > 0 ? "warning" : "success",
          4000
        );
        // Reload areas
        const { service_areas } = await listServiceAreas(selectedBusiness);
        setAreas(service_areas);
      } else if (results.failed.length > 0) {
        addToast("All service areas failed to add.", "error", 5000);
      }

      // Keep only failed lines for retry
      if (results.failed.length > 0) {
        setBulkText(
          results.failed
            .map((a) => [a.city, a.state, a.county].filter(Boolean).join(", "))
            .join("\n")
        );
      } else {
        setBulkText("");
      }
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to add service areas";
      addToast(msg, "error", 5000);
    } finally {
      setBulkLoading(false);
    }
  };

  // Render Manage Tab
  const renderManageTab = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <StatsCards stats={stats} loading={loading} />

      {/* Add Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">
          Add New Service Area
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              className={`border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                inputErrors.city ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="e.g., Arlington"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setInputErrors((prev) => ({ ...prev, city: null }));
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <input
              className={`border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                inputErrors.state ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="e.g., VA"
              value={state}
              onChange={(e) => {
                setState(e.target.value.toUpperCase());
                setInputErrors((prev) => ({ ...prev, state: null }));
              }}
              maxLength={2}
            />
          </div>
        </div>

        <button
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          onClick={handleAdd}
          disabled={loading || !city.trim() || !state.trim()}
        >
          Add Service Area
        </button>

        {(inputErrors.city || inputErrors.state) && (
          <div className="space-y-1">
            {inputErrors.city && (
              <p className="text-red-600 text-sm">{inputErrors.city}</p>
            )}
            {inputErrors.state && (
              <p className="text-red-600 text-sm">{inputErrors.state}</p>
            )}
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Service Areas List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading service areas...</span>
        </div>
      ) : areas.length === 0 ? (
        <EmptyState
          icon={EmptyStateIcons.serviceAreas}
          title="No service areas yet"
          description="Add the cities and towns where you want to target SEO content."
          action={{
            label: "Add your first service area",
            onClick: () => {
              document
                .querySelector<HTMLInputElement>('input[placeholder*="Arlington"]')
                ?.focus();
            },
          }}
        />
      ) : (
        <div className="space-y-2">
          {areas.map((area) => {
            const isDeleting = deletingIds.has(area.id);

            return (
              <div
                key={area.id}
                className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:shadow-sm transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 font-medium">
                    {area.city}
                    {area.county && (
                      <span className="text-gray-500 font-normal">
                        {" "}
                        ({area.county})
                      </span>
                    )}
                    , {area.state}
                  </p>
                  <p className="text-xs text-gray-500 font-mono truncate">
                    /{area.slug}
                  </p>
                </div>

                {/* Delete button */}
                <button
                  className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handleDelete(area)}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
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
    const hasContent = parsedBulkAreas.length > 0;

    return (
      <div className="space-y-4">
        {/* Format instructions */}
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">
          <p className="font-medium text-gray-700 mb-1">
            Paste service areas (one per line)
          </p>
          <p>
            Format:{" "}
            <code className="bg-gray-200 px-1 rounded">
              City, State[, County]
            </code>
          </p>
        </div>

        {/* Textarea */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Paste service areas
            {parsedBulkAreas.length > 0 && (
              <span className="ml-2 text-xs text-green-600">
                ({parsedBulkAreas.length} area
                {parsedBulkAreas.length !== 1 ? "s" : ""} detected)
              </span>
            )}
          </label>
          <textarea
            className="border rounded p-2 w-full font-mono text-sm h-64 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={`Washington, DC
Arlington, VA, Arlington
Silver Spring, MD, Montgomery
Rockville, MD, Montgomery
College Park, MD`}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            disabled={bulkLoading}
          />
        </div>

        {/* Preview */}
        {parsedBulkAreas.length > 0 && parsedBulkAreas.length <= 15 && (
          <div className="text-sm">
            <p className="font-medium text-gray-700 mb-2">Preview:</p>
            <div className="bg-gray-50 border rounded p-2 space-y-1 max-h-40 overflow-y-auto">
              {parsedBulkAreas.map((area, i) => (
                <div key={i} className="flex gap-2 text-xs font-mono">
                  <span className="text-blue-600">
                    {area.city}, {area.state}
                  </span>
                  {area.county && (
                    <span className="text-gray-500">({area.county})</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success indicator */}
        {parsedBulkAreas.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded text-green-700">
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
              {parsedBulkAreas.length} service area
              {parsedBulkAreas.length !== 1 ? "s" : ""} ready to add
            </span>
          </div>
        )}

        {/* Add button */}
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          onClick={handleBulkAdd}
          disabled={bulkLoading || !hasContent}
        >
          {bulkLoading
            ? "Adding..."
            : `Add ${parsedBulkAreas.length} Service Area${
                parsedBulkAreas.length !== 1 ? "s" : ""
              }`}
        </button>

        {/* Help text */}
        <div className="text-sm text-gray-600 space-y-1 border-t pt-4">
          <p className="font-medium text-gray-700">Notes:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Duplicate areas are automatically skipped</li>
            <li>State codes are auto-capitalized (va becomes VA)</li>
            <li>Maximum 100 areas per operation</li>
            <li>Failed entries remain in the textarea for retry</li>
          </ul>
        </div>
      </div>
    );
  };

  // Render Instructions Tab
  const renderInstructionsTab = () => (
    <div className="space-y-8 max-w-4xl">
      {/* Overview */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">Overview</h2>
        <p className="text-sm text-gray-700">
          Service areas define the geographic locations where your business
          operates. Each service area generates location-specific SEO pages
          combined with your keywords (e.g., "criminal defense lawyer Arlington
          VA").
        </p>
      </section>

      {/* Data Structure */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">Data Structure</h2>
        <div className="bg-gray-50 border rounded-lg p-4">
          <ul className="space-y-2 text-sm text-gray-700">
            <li>
              <span className="font-medium text-gray-900">City</span> — Required.
              The city or town name (e.g., "Arlington")
            </li>
            <li>
              <span className="font-medium text-gray-900">State</span> — Required.
              2-letter uppercase code (e.g., "VA")
            </li>
            <li>
              <span className="font-medium text-gray-900">County</span> —
              Optional. Useful for disambiguation (e.g., "Fairfax County")
            </li>
            <li>
              <span className="font-medium text-gray-900">Slug</span> —
              Auto-generated from city + state (e.g., "arlington-va")
            </li>
          </ul>
        </div>
      </section>

      {/* Bulk Format */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">Bulk Add Format</h2>
        <div className="bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-xs overflow-x-auto">
          <p>Washington, DC</p>
          <p>Arlington, VA, Arlington</p>
          <p>Silver Spring, MD, Montgomery</p>
          <p>Rockville, MD, Montgomery</p>
        </div>
        <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
          <li>One area per line</li>
          <li>Format: City, State[, County]</li>
          <li>Duplicates detected by slug (city-state)</li>
        </ul>
      </section>

      {/* Best Practices */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">Best Practices</h2>
        <ul className="text-sm text-gray-700 space-y-2">
          <li>
            <strong>Start with core markets.</strong> Add 20-50 primary service
            areas for your main coverage zone.
          </li>
          <li>
            <strong>Include county when relevant.</strong> For large metro areas
            with multiple cities of the same name, adding county helps
            disambiguation.
          </li>
          <li>
            <strong>Keep consistent formatting.</strong> Use consistent city name
            spelling across all entries.
          </li>
        </ul>
      </section>

      {/* Current Stats */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">Current Stats</h2>
        {selectedBusiness ? (
          loading ? (
            <p className="text-gray-600 text-sm">Loading...</p>
          ) : (
            <div className="bg-gray-50 border rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {areas.length}
                  </p>
                  <p className="text-xs text-gray-600">Total Areas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {new Set(areas.map((a) => a.state)).size}
                  </p>
                  <p className="text-xs text-gray-600">States</p>
                </div>
              </div>
            </div>
          )
        ) : (
          <p className="text-gray-600 text-sm">
            Select a business to view stats.
          </p>
        )}
      </section>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="mb-2 text-2xl font-bold">Service Areas</h1>
          <p className="text-gray-600">
            Define the geographic locations where you offer services.
          </p>
        </div>

        {!selectedBusiness ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 text-gray-300 mx-auto mb-4">
              {EmptyStateIcons.serviceAreas}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No business selected
            </h3>
            <p className="text-gray-600">
              Select a business from the sidebar to manage service areas.
            </p>
          </div>
        ) : (
          <>
            {/* Tabs */}
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

            {/* Tab Content */}
            <div className="pt-2">
              {activeTab === "manage" && renderManageTab()}
              {activeTab === "bulk-add" && renderBulkAddTab()}
              {activeTab === "instructions" && renderInstructionsTab()}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ServiceAreas;
