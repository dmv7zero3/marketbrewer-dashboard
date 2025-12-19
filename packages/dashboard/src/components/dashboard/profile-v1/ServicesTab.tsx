import React, { useState } from "react";
import type {
  QuestionnaireDataStructure,
  ServiceOffering,
} from "@marketbrewer/shared";
import { useToast } from "../../../contexts/ToastContext";

interface ServicesTabProps {
  data: QuestionnaireDataStructure;
  onDataChange: (data: QuestionnaireDataStructure) => void;
  isSaving: boolean;
  isLoading: boolean;
}

/**
 * ServicesTab: Dedicated top-level section for service offerings
 * Extracted from ContentProfile/QuestionnaireForm to be its own menu item
 */
export const ServicesTab: React.FC<ServicesTabProps> = ({
  data,
  onDataChange,
  isSaving,
  isLoading,
}) => {
  const { addToast } = useToast();
  const [bulkServicesText, setBulkServicesText] = useState<string>("");

  const updateServices = (offerings: ServiceOffering[]) => {
    const newData: QuestionnaireDataStructure = {
      ...data,
      services: {
        ...data.services,
        offerings,
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

  const handleBulkServicesAdd = () => {
    const parsed = parseBulkServices(bulkServicesText);
    if (parsed.length === 0) {
      addToast(
        "No valid service lines found. Use 'Name | Description | primary' format.",
        "warning"
      );
      return;
    }
    updateServices([...data.services.offerings, ...parsed]);
    setBulkServicesText("");
    addToast(`Added ${parsed.length} service${parsed.length > 1 ? "s" : ""}`, "success");
  };

  const handleAddService = () => {
    const newOfferings: ServiceOffering[] = [
      ...data.services.offerings,
      { name: "", description: "", isPrimary: false },
    ];
    updateServices(newOfferings);
  };

  const handleUpdateService = (
    idx: number,
    field: keyof ServiceOffering,
    value: string | boolean
  ) => {
    const newOfferings = [...data.services.offerings];
    newOfferings[idx] = { ...newOfferings[idx], [field]: value };
    updateServices(newOfferings);
  };

  const handleRemoveService = (idx: number) => {
    const newOfferings = data.services.offerings.filter((_, i) => i !== idx);
    updateServices(newOfferings);
  };

  const disabled = isSaving;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading services...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Services</h3>
        <p className="text-sm text-gray-600">
          Define your service offerings and product descriptions for AI-generated
          content.
        </p>
      </div>

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

        {data.services.offerings.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-500 text-sm">
              No services added yet. Click "Add Service" to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.services.offerings.map((offering, idx) => (
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
                        handleUpdateService(idx, "isPrimary", e.target.checked)
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
                    handleUpdateService(idx, "description", e.target.value)
                  }
                  disabled={disabled}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                  placeholder="Brief description of this service"
                  rows={2}
                />
              </div>
            ))}
          </div>
        )}

        {data.services.offerings.length === 0 && (
          <p className="text-yellow-600 text-xs flex items-center gap-1">
            <span>⚠</span> Add at least one service offering for better content
            generation.
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
          Enter one service per line. Use pipe (|) to separate name, description,
          and primary flag.
        </p>
      </div>
    </div>
  );
};

export default ServicesTab;
