import React, { useEffect, useState } from "react";
import { DashboardLayout } from "./DashboardLayout";
import { useBusiness } from "../../contexts/BusinessContext";
import { useToast } from "../../contexts/ToastContext";
import {
  listServiceAreas,
  createServiceArea,
  deleteServiceArea,
  updateServiceArea,
} from "../../api/service-areas";
import { validateCity, validateState } from "../../lib/validation";
import { toCityStateSlug } from "@marketbrewer/shared";
import type { ServiceArea } from "@marketbrewer/shared";

type TabName = "manage" | "bulk-add" | "instructions";

const TABS: { name: TabName; label: string }[] = [
  { name: "manage", label: "Manage" },
  { name: "bulk-add", label: "Bulk Add" },
  { name: "instructions", label: "Instructions" },
];

export const ServiceAreas: React.FC = () => {
  const { selectedBusiness } = useBusiness();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabName>("manage");
  const [areas, setAreas] = useState<ServiceArea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [inputErrors, setInputErrors] = useState<{
    city: string | null;
    state: string | null;
  }>({ city: null, state: null });
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!selectedBusiness) return;
      try {
        setLoading(true);
        setError(null);
        const { service_areas } = await listServiceAreas(selectedBusiness);
        if (!mounted) return;
        setAreas(service_areas);
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Failed to load service areas";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    setAreas([]);
    load();
    return () => {
      mounted = false;
    };
  }, [selectedBusiness]);

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

    // Check for duplicates using the same slug generation as the backend
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

  const handleDelete = async (id: string) => {
    if (!selectedBusiness || deletingIds.has(id)) return;
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await deleteServiceArea(selectedBusiness, id);
      setAreas((prev) => prev.filter((a) => a.id !== id));
      addToast("Service area deleted successfully", "success");
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to delete service area";
      addToast(msg, "error", 5000);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleUpdatePriority = async (id: string, priority: number) => {
    if (!selectedBusiness || updatingIds.has(id)) return;
    setUpdatingIds((prev) => new Set(prev).add(id));
    try {
      const { service_area } = await updateServiceArea(selectedBusiness, id, {
        priority,
      });
      setAreas((prev) => prev.map((a) => (a.id === id ? service_area : a)));
      addToast("Service area priority updated", "success");
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to update service area";
      addToast(msg, "error", 5000);
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
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

  const handleBulkAdd = async () => {
    if (!selectedBusiness) {
      addToast("Select a business before adding service areas.", "error", 4000);
      return;
    }
    const parsed = parseBulkServiceAreas(bulkText);
    if (parsed.length > 100) {
      addToast("Maximum 100 areas per operation", "error", 5000);
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
      setBulkLoading(true);

      let existingSlugs: Set<string> = new Set();
      try {
        const { service_areas: existing } = await listServiceAreas(
          selectedBusiness
        );
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
      }

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

      for (const area of newAreas) {
        try {
          await createServiceArea(selectedBusiness, {
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
        // Reload areas to refresh the list
        const { service_areas } = await listServiceAreas(selectedBusiness);
        setAreas(service_areas);
      } else if (results.failed.length > 0) {
        addToast("All service areas failed to add.", "error", 5000);
      }

      // Keep only failed lines for retry
      if (results.failed.length > 0) {
        setBulkText(
          results.failed
            .map((a) =>
              [a.city, a.state, a.county, a.priority].filter(Boolean).join(", ")
            )
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

  const renderManageTab = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          className={`border rounded px-2 py-1 flex-1 ${
            inputErrors.city ? "border-red-500" : ""
          }`}
          placeholder="City"
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            setInputErrors((prev) => ({ ...prev, city: null }));
          }}
        />
        <input
          className={`border rounded px-2 py-1 w-20 ${
            inputErrors.state ? "border-red-500" : ""
          }`}
          placeholder="State"
          value={state}
          onChange={(e) => {
            setState(e.target.value.toUpperCase());
            setInputErrors((prev) => ({ ...prev, state: null }));
          }}
        />
        <button
          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
          onClick={handleAdd}
          disabled={loading}
        >
          Add
        </button>
      </div>
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
      {error && <p className="text-red-600">{error}</p>}
      {loading ? (
        <p className="text-gray-500">Loading service areas...</p>
      ) : (
        <ul className="space-y-2">
          {areas.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between border rounded p-2 bg-white"
            >
              <div>
                <p className="text-gray-800">
                  {a.city}, {a.state}
                </p>
                <p className="text-gray-600 text-sm">Slug: {a.slug}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="text-red-600 hover:text-red-800 disabled:opacity-50"
                  onClick={() => handleDelete(a.id)}
                  disabled={deletingIds.has(a.id)}
                >
                  {deletingIds.has(a.id) ? "Deleting..." : "Delete"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const renderBulkAddTab = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Paste service areas (one per line)
        </label>
        <p className="text-sm text-gray-600">
          Format: City, State[, County][, Priority]
        </p>
        <textarea
          className="border rounded p-2 w-full font-mono text-sm"
          rows={12}
          placeholder="Arlington, VA&#10;Richmond, VA, Henrico, 100&#10;Charleston, SC"
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          disabled={bulkLoading}
        />
      </div>
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        onClick={handleBulkAdd}
        disabled={bulkLoading || !bulkText.trim()}
      >
        {bulkLoading ? "Adding..." : "Add Service Areas"}
      </button>
      <div className="text-sm text-gray-600 space-y-1">
        <p>• Invalid or duplicate lines are skipped</p>
        <p>• Duplicates detected by slug (city-state)</p>
        <p>• Maximum 100 areas per operation</p>
      </div>
    </div>
  );

  const renderInstructionsTab = () => (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">What data exists</h2>
        <ul className="pl-6 text-gray-800 list-disc">
          <li>
            <span className="font-medium">City</span> — required, plain string
            (e.g., "Arlington")
          </li>
          <li>
            <span className="font-medium">State</span> — required, 2-letter
            uppercase code (e.g., "VA")
          </li>
          <li>
            <span className="font-medium">County</span> — optional, string or
            null
          </li>
          <li>
            <span className="font-medium">Priority</span> — integer; higher
            values surface first in content generation
          </li>
          <li>
            <span className="font-medium">Slug</span> — derived from `city` +
            `state` using `toCityStateSlug()`; used for de-duplication
          </li>
          <li>
            <span className="font-medium">Timestamps</span> — `created_at`
            stored by the API
          </li>
        </ul>
        <p className="text-sm text-gray-600">
          Type source: `ServiceArea` in shared types.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Recommended data</h2>
        <ul className="pl-6 text-gray-800 list-disc">
          <li>
            Maintain 20–100 service areas per business depending on coverage
            goals.
          </li>
          <li>
            Normalize `state` to uppercase; avoid mixed-case city duplicates
            (e.g., "Arlington" vs "ARLINGTON").
          </li>
          <li>
            Use `priority` to influence scheduling and content generation order
            (e.g., 100 for core hubs, 10 for peripheral areas).
          </li>
          <li>Keep `county` only where relevant for local keywords.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Bulk paste format</h2>
        <p className="text-gray-700">Use one of the following line formats:</p>
        <div className="p-3 text-sm border rounded bg-gray-50">
          <p>City, State</p>
          <p>City, State, County</p>
          <p>City, State, County, Priority</p>
        </div>
        <ul className="pl-6 text-gray-800 list-disc">
          <li>
            Invalid or duplicate lines are skipped with an info/warning toast.
          </li>
          <li>Duplicates are detected by slug (`city-state`).</li>
          <li>Max per operation: 100 lines (configurable).</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Validation rules</h2>
        <ul className="pl-6 text-gray-800 list-disc">
          <li>`city` must be non-empty and pass basic validation.</li>
          <li>`state` must be a valid 2-letter code.</li>
          <li>
            `priority` must be a number if provided; non-numeric values are
            ignored.
          </li>
          <li>
            Duplicate slugs are rejected to prevent multiple entries for the
            same locale.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Current data snapshot</h2>
        {selectedBusiness ? (
          loading ? (
            <p className="text-gray-600">Loading service areas…</p>
          ) : (
            <div className="text-gray-800">
              <p>
                <span className="font-medium">Business ID:</span>{" "}
                {selectedBusiness}
              </p>
              <p>
                <span className="font-medium">Service areas:</span>{" "}
                {areas.length}
              </p>
            </div>
          )
        ) : (
          <p className="text-gray-600">
            Select a business to view counts and details.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Usage notes</h2>
        <ul className="pl-6 text-gray-800 list-disc">
          <li>
            Service areas drive location pages and keyword-location pair
            generation.
          </li>
          <li>
            Priorities help schedule generation jobs and order content in UIs.
          </li>
          <li>
            Use the Bulk Add tab for quick imports; manage fine-tuning in the
            Manage tab.
          </li>
        </ul>
      </section>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Service Areas</h1>
        {!selectedBusiness ? (
          <p className="text-gray-600">
            Select a business to manage service areas.
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
