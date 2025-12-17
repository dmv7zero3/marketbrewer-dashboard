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

export const ServiceAreas: React.FC = () => {
  const { selectedBusiness } = useBusiness();
  const { addToast } = useToast();
  const [areas, setAreas] = useState<ServiceArea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
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

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Service Areas</h1>
        {!selectedBusiness ? (
          <p className="text-gray-600">
            Select a business to manage service areas.
          </p>
        ) : (
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
        )}
      </div>
    </DashboardLayout>
  );
};

export default ServiceAreas;
