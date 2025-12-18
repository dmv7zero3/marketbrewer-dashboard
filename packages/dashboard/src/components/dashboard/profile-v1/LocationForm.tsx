import React, { memo, useMemo, useState } from "react";
import type { LocationType } from "@marketbrewer/shared";

export interface LocationInput {
  id?: string;
  location_type: LocationType;
  is_primary: boolean;
  street_address: string | null;
  city: string;
  state: string;
  postal_code: string | null;
  country: string;
}

interface LocationFormProps {
  value: LocationInput[];
  disabled?: boolean;
  onChange: (next: LocationInput[]) => void;
}

const emptyLocation: LocationInput = {
  location_type: "physical",
  is_primary: false,
  street_address: "",
  city: "",
  state: "",
  postal_code: "",
  country: "US",
};

export const LocationForm = memo<LocationFormProps>(
  ({ value, disabled = false, onChange }) => {
    const [draft, setDraft] = useState<LocationInput>(emptyLocation);

    const primaryCount = useMemo(
      () => value.filter((v) => v.is_primary).length,
      [value]
    );

    const hasPrimary = primaryCount > 0;

    const handleAdd = () => {
      if (!draft.city.trim() || !draft.state.trim()) return;

      const next: LocationInput[] = [
        ...value,
        {
          ...draft,
          is_primary: hasPrimary ? draft.is_primary : true,
          street_address: draft.street_address?.trim() || null,
          city: draft.city.trim(),
          state: draft.state.trim(),
          postal_code: draft.postal_code?.trim() || null,
          country: draft.country.trim() || "US",
        },
      ];

      onChange(next);
      setDraft(emptyLocation);
    };

    const handleRemove = (id: string | undefined) => {
      const next = value.filter((loc) => loc.id !== id);
      onChange(next);
    };

    const setPrimary = (locId: string) => {
      const next = value.map((loc) => ({
        ...loc,
        is_primary: loc.id === locId,
      }));
      onChange(next);
    };

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              City
            </label>
            <input
              type="text"
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              value={draft.city}
              onChange={(e) => setDraft({ ...draft, city: e.target.value })}
              placeholder="e.g., Arlington"
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              State
            </label>
            <input
              type="text"
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              value={draft.state}
              onChange={(e) => setDraft({ ...draft, state: e.target.value })}
              placeholder="VA"
              maxLength={2}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              Street Address
            </label>
            <input
              type="text"
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              value={draft.street_address ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, street_address: e.target.value })
              }
              placeholder="123 Main St"
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              Postal Code
            </label>
            <input
              type="text"
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              value={draft.postal_code ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, postal_code: e.target.value })
              }
              placeholder="22201"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-900">
            <input
              type="checkbox"
              disabled={disabled}
              checked={draft.is_primary || !hasPrimary}
              onChange={(e) =>
                setDraft({ ...draft, is_primary: e.target.checked })
              }
            />
            Primary location
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-900">
            <input
              type="checkbox"
              disabled={disabled}
              checked={draft.location_type === "service_area"}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  location_type: e.target.checked ? "service_area" : "physical",
                })
              }
            />
            Service area business
          </label>
          <button
            type="button"
            disabled={disabled || !draft.city.trim() || !draft.state.trim()}
            className="ml-auto px-3 py-2 rounded-md bg-gray-900 text-white disabled:bg-gray-300 disabled:text-gray-600"
            onClick={handleAdd}
          >
            Add location
          </button>
        </div>

        {value.length === 0 ? (
          <p className="text-sm text-gray-500">No locations added yet.</p>
        ) : (
          <div className="space-y-3">
            {value.map((loc) => (
              <div
                key={loc.id ?? `${loc.city}-${loc.state}-${loc.postal_code}`}
                className="flex items-center gap-3 border rounded-md px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {loc.city}, {loc.state}
                  </p>
                  <p className="text-xs text-gray-600">
                    {loc.street_address || "No street address"}
                  </p>
                  <p className="text-xs text-gray-600">
                    {loc.location_type === "service_area"
                      ? "Service area"
                      : "Physical"}
                    {loc.is_primary ? " • Primary" : ""}
                  </p>
                </div>

                <div className="ml-auto flex items-center gap-3 text-sm">
                  {!loc.is_primary && (
                    <button
                      type="button"
                      disabled={disabled}
                      className="text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                      onClick={() => setPrimary(loc.id ?? "")}
                    >
                      Make primary
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={disabled}
                    className="text-red-600 hover:text-red-700 disabled:text-gray-400"
                    onClick={() => handleRemove(loc.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

LocationForm.displayName = "LocationForm";
