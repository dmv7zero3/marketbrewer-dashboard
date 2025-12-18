/**
 * Locations Management Dashboard Component
 *
 * Manages multiple physical business locations with:
 * - List view with status filters
 * - Add/Edit forms with smart defaults
 * - Bulk import capability
 * - Map integration
 * - Auto-creation of service areas
 */

import React, { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "./DashboardLayout";
import { useBusiness } from "../../contexts/BusinessContext";
import { useToast } from "../../contexts/ToastContext";
import type { Location, LocationStats } from "@marketbrewer/shared";
import {
  getLocations,
  getLocationStats,
  createLocation,
  updateLocation,
  deleteLocation,
  bulkImportLocations,
} from "../../api/locations";
import { LocationFormModal, LocationFormData } from "./LocationFormModal";
import { BulkImportModal } from "./BulkImportModal";

type LocationStatus = "active" | "upcoming";

/**
 * Parse CSV or JSON import data into location objects
 */
function parseImportData(text: string): LocationFormData[] {
  const trimmed = text.trim();

  // Try parsing as JSON first
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      throw new Error("Invalid JSON format");
    }
  }

  // Parse as CSV
  const lines = trimmed.split("\n").filter((line) => line.trim());
  if (lines.length < 2) {
    throw new Error("CSV must have header row and at least one data row");
  }

  const headers = lines[0].split(",").map((h) => h.trim());
  const locations: LocationFormData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const location: any = {};

    headers.forEach((header, index) => {
      const value = values[index];
      if (value) {
        // Convert boolean-like strings
        if (header === "is_headquarters") {
          location[header] = value.toLowerCase() === "true" || value === "1";
        } else if (header === "priority") {
          location[header] = parseInt(value) || 0;
        } else {
          location[header] = value;
        }
      }
    });

    if (location.name && location.city && location.state) {
      locations.push(location as LocationFormData);
    }
  }

  if (locations.length === 0) {
    throw new Error("No valid locations found in CSV");
  }

  return locations;
}

export const LocationsManagement: React.FC = () => {
  const { selectedBusiness } = useBusiness();
  const { addToast } = useToast();

  const [locations, setLocations] = useState<Location[]>([]);
  const [stats, setStats] = useState<LocationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<LocationStatus | "all">(
    "all"
  );
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  useEffect(() => {
    if (selectedBusiness) {
      loadLocations();
      loadStats();
    }
  }, [selectedBusiness]);

  const loadLocations = async () => {
    if (!selectedBusiness) return;
    try {
      setLoading(true);
      const { locations: data } = await getLocations(selectedBusiness);
      setLocations(data);
    } catch (error) {
      addToast("Failed to load locations", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!selectedBusiness) return;
    try {
      const { stats: data } = await getLocationStats(selectedBusiness);
      setStats(data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  // TODO: Implement handler for adding new locations via modal
  const handleAddLocation = async (data: LocationFormData) => {
    if (!selectedBusiness) return;
    try {
      await createLocation(selectedBusiness, data);
      addToast("Location added successfully", "success");
      loadLocations();
      loadStats();
      setShowAddModal(false);
    } catch (error) {
      addToast("Failed to add location", "error");
      throw error;
    }
  };

  const handleUpdateLocation = async (data: LocationFormData) => {
    if (!selectedBusiness || !editingLocation) return;
    try {
      // Clean up the data: remove empty strings and undefined values for optional fields
      const cleanedData: Partial<LocationFormData> = {};

      Object.entries(data).forEach(([key, value]) => {
        // Always include required fields and non-empty values
        if (
          key === "name" ||
          key === "city" ||
          key === "state" ||
          key === "country" ||
          key === "status"
        ) {
          // Required fields - always include
          cleanedData[key as keyof LocationFormData] = value as any;
        } else if (typeof value === "boolean" || typeof value === "number") {
          // Booleans and numbers - always include (even if 0 or false)
          cleanedData[key as keyof LocationFormData] = value as any;
        } else if (value !== "" && value !== undefined && value !== null) {
          // Optional string fields - only include if not empty
          cleanedData[key as keyof LocationFormData] = value as any;
        }
      });

      console.log("[handleUpdateLocation] Original data:", data);
      console.log("[handleUpdateLocation] Cleaned data:", cleanedData);

      await updateLocation(selectedBusiness, editingLocation.id, cleanedData);
      addToast("Location updated successfully", "success");
      loadLocations();
      loadStats();
      setEditingLocation(null);
    } catch (error) {
      addToast("Failed to update location", "error");
      throw error;
    }
  };

  const handleBulkImport = async (data: {
    text: string;
    autoCreateServiceAreas: boolean;
  }) => {
    if (!selectedBusiness) return;
    try {
      // Parse CSV or JSON
      const locations = parseImportData(data.text);

      const result = await bulkImportLocations(selectedBusiness, {
        locations,
        auto_create_service_areas: data.autoCreateServiceAreas,
      });

      if (result.failed > 0) {
        addToast(
          `Imported ${result.created} locations, ${result.failed} failed`,
          "warning"
        );
      } else {
        addToast(
          `Successfully imported ${result.created} locations`,
          "success"
        );
      }

      loadLocations();
      loadStats();
      setShowImportModal(false);
    } catch (error) {
      addToast("Failed to import locations", "error");
      throw error;
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!selectedBusiness) return;
    if (!confirm("Are you sure you want to delete this location?")) return;

    try {
      await deleteLocation(selectedBusiness, locationId);
      addToast("Location deleted successfully", "success");
      loadLocations();
      loadStats();
    } catch (error) {
      addToast("Failed to delete location", "error");
    }
  };

  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      if (statusFilter !== "all" && loc.status !== statusFilter) return false;
      if (stateFilter !== "all" && loc.state !== stateFilter) return false;
      return true;
    });
  }, [locations, statusFilter, stateFilter]);

  const groupedLocations = useMemo(() => {
    const groups: Record<string, Location[]> = {};
    filteredLocations.forEach((loc) => {
      const key = `${loc.state}, ${loc.country}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(loc);
    });
    return groups;
  }, [filteredLocations]);

  const uniqueStates = useMemo(() => {
    return Array.from(new Set(locations.map((l) => l.state))).sort();
  }, [locations]);

  if (!selectedBusiness) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No business selected
          </h3>
          <p className="text-gray-600">
            Please select a business from the dropdown to manage locations.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold mb-2">Locations</h1>
          <p className="text-gray-600">
            Manage physical business locations and their details.
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600">Total Locations</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600">Active</div>
              <div className="text-2xl font-bold text-green-600">
                {stats.active}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600">Upcoming</div>
              <div className="text-2xl font-bold text-blue-600">
                {stats.upcoming}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600">States/Regions</div>
              <div className="text-2xl font-bold">
                {Object.keys(stats.byState).length}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="upcoming">Upcoming</option>
            </select>

            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All States</option>
              {uniqueStates.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>

            <div className="text-sm text-gray-600">
              {filteredLocations.length} location
              {filteredLocations.length !== 1 ? "s" : ""}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              Bulk Import
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              Add Location
            </button>
          </div>
        </div>

        {/* Locations List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-600">Loading locations...</div>
          </div>
        ) : Object.keys(groupedLocations).length === 0 ? (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
            <div className="text-gray-600 mb-4">No locations found</div>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Add your first location
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedLocations).map(([region, locs]) => (
              <div
                key={region}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden"
              >
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="font-semibold">{region}</h3>
                  <p className="text-sm text-gray-600">
                    {locs.length} location{locs.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="divide-y divide-gray-200">
                  {locs.map((location) => (
                    <LocationRow
                      key={location.id}
                      location={location}
                      onEdit={() => setEditingLocation(location)}
                      onDelete={() => handleDeleteLocation(location.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <LocationFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddLocation}
        mode="create"
      />

      <LocationFormModal
        isOpen={!!editingLocation}
        onClose={() => setEditingLocation(null)}
        onSubmit={handleUpdateLocation}
        location={editingLocation}
        mode="edit"
      />

      <BulkImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleBulkImport}
      />
    </DashboardLayout>
  );
};

interface LocationRowProps {
  location: Location;
  onEdit: () => void;
  onDelete: () => void;
}

const LocationRow: React.FC<LocationRowProps> = ({
  location,
  onEdit,
  onDelete,
}) => {
  const statusColors = {
    active: "bg-green-100 text-green-800",
    upcoming: "bg-blue-100 text-blue-800",
  } as const;

  return (
    <div className="px-4 py-4 hover:bg-gray-50 flex items-center justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1">
          <h4 className="font-medium">
            {location.display_name || location.name}
          </h4>
          {location.is_headquarters && (
            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-md font-medium">
              HQ
            </span>
          )}
          <span
            className={`px-2 py-1 text-xs rounded-md font-medium ${
              statusColors[location.status]
            }`}
          >
            {location.status === "upcoming" ? "Coming Soon" : "Active"}
          </span>
        </div>
        <div className="text-sm text-gray-600 space-y-1">
          {location.full_address && <div>{location.full_address}</div>}
          {location.phone && <div>{location.phone}</div>}
          {location.email && <div>{location.email}</div>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {location.google_maps_url && (
          <a
            href={location.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700"
          >
            Map
          </a>
        )}
        {location.order_link && (
          <a
            href={location.order_link}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700"
          >
            Order
          </a>
        )}
        <button
          onClick={onEdit}
          className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-1 text-sm text-red-600 hover:text-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  );
};
