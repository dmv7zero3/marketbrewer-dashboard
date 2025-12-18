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
  deleteLocation,
} from "../../api/locations";

type LocationStatus =
  | "active"
  | "coming-soon"
  | "closed"
  | "temporarily-closed";

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
  // TODO: Add modal implementations for create, update, and bulk import
  // const [showAddModal, setShowAddModal] = useState(false);
  // const [showImportModal, setShowImportModal] = useState(false);
  // const [editingLocation, setEditingLocation] = useState<Location | null>(null);

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
  // const handleAddLocation = async (data: any) => {
  //   if (!selectedBusiness) return;
  //   try {
  //     await createLocation(selectedBusiness, data);
  //     addToast("Location added successfully", "success");
  //     loadLocations();
  //     loadStats();
  //     setShowAddModal(false);
  //   } catch (error) {
  //     addToast("Failed to add location", "error");
  //   }
  // };

  // TODO: Implement handler for updating existing locations via modal
  // const handleUpdateLocation = async (locationId: string, data: any) => {
  //   if (!selectedBusiness) return;
  //   try {
  //     await updateLocation(selectedBusiness, locationId, data);
  //     addToast("Location updated successfully", "success");
  //     loadLocations();
  //     setEditingLocation(null);
  //   } catch (error) {
  //     addToast("Failed to update location", "error");
  //   }
  // };

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
              <div className="text-sm text-gray-600">Coming Soon</div>
              <div className="text-2xl font-bold text-blue-600">
                {stats.comingSoon}
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
              <option value="coming-soon">Coming Soon</option>
              <option value="temporarily-closed">Temporarily Closed</option>
              <option value="closed">Closed</option>
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
              disabled
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-400 cursor-not-allowed"
              title="Coming soon"
            >
              Bulk Import
            </button>
            <button
              disabled
              className="px-4 py-2 bg-gray-400 text-white rounded-lg text-sm cursor-not-allowed"
              title="Coming soon"
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
              disabled
              className="text-gray-400 cursor-not-allowed font-medium"
              title="Coming soon"
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
                      onEdit={() => {
                        // TODO: Implement edit modal
                      }}
                      onDelete={() => handleDeleteLocation(location.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
    "coming-soon": "bg-blue-100 text-blue-800",
    "temporarily-closed": "bg-yellow-100 text-yellow-800",
    closed: "bg-gray-100 text-gray-800",
  };

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
            {location.status.replace("-", " ")}
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
