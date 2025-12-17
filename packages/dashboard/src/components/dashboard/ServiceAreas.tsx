import React, { useEffect, useState } from "react";
import { DashboardLayout } from "./DashboardLayout";
import { useBusiness } from "../../contexts/BusinessContext";
import {
  listServiceAreas,
  createServiceArea,
  deleteServiceArea,
  updateServiceArea,
} from "../../api/service-areas";
import type { ServiceArea } from "@marketbrewer/shared";

export const ServiceAreas: React.FC = () => {
  const { selectedBusiness } = useBusiness();
  const [areas, setAreas] = useState<ServiceArea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

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
        const msg = e instanceof Error ? e.message : "Failed to load service areas";
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
    try {
      const { service_area } = await createServiceArea(selectedBusiness, {
        city: city.trim(),
        state: state.trim(),
      });
      setAreas((prev) => [service_area, ...prev]);
      setCity("");
      setState("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add service area");
    }
  };

  const handleDelete = async (id: string) => {
    if (!selectedBusiness) return;
    try {
      await deleteServiceArea(selectedBusiness, id);
      setAreas((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete service area");
    }
  };

  const handleUpdatePriority = async (id: string, priority: number) => {
    if (!selectedBusiness) return;
    try {
      const { service_area } = await updateServiceArea(selectedBusiness, id, { priority });
      setAreas((prev) => prev.map((a) => (a.id === id ? service_area : a)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update service area");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Service Areas</h1>
        {!selectedBusiness ? (
          <p className="text-gray-600">Select a business to manage service areas.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                className="border rounded px-2 py-1"
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <input
                className="border rounded px-2 py-1 w-24"
                placeholder="State"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
              <button
                className="bg-blue-600 text-white px-3 py-1 rounded"
                onClick={handleAdd}
                disabled={loading}
              >
                Add
              </button>
            </div>
            {error && <p className="text-red-600">{error}</p>}
            {loading ? (
              <p className="text-gray-500">Loading service areas...</p>
            ) : (
              <ul className="space-y-2">
                {areas.map((a) => (
                  <li key={a.id} className="flex items-center justify-between border rounded p-2 bg-white">
                    <div>
                      <p className="text-gray-800">{a.city}, {a.state}</p>
                      <p className="text-gray-600 text-sm">Slug: {a.slug}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="border rounded px-2 py-1 w-20"
                        value={a.priority}
                        onChange={(e) => handleUpdatePriority(a.id, parseInt(e.target.value || "0", 10))}
                      />
                      <button
                        className="text-red-600"
                        onClick={() => handleDelete(a.id)}
                      >
                        Delete
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
