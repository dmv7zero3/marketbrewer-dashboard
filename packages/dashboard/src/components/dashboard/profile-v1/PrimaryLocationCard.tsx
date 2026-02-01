import React, { memo } from "react";
import type { Business } from "@marketbrewer/shared";

interface PrimaryLocationCardProps {
  business: Business;
  validationErrors: Record<string, string | null>;
  disabled: boolean;
  onChange: (business: Business) => void;
}

/**
 * PrimaryLocationCard: Modular component for primary city/state inputs
 * Used for local SEO targeting. Separate from Google Business Profile.
 */
export const PrimaryLocationCard = memo<PrimaryLocationCardProps>(
  ({ business, validationErrors, disabled, onChange }) => {
    return (
      <div className="bg-dark-900 border border-dark-700 rounded-lg p-5">
        <h4 className="text-sm font-medium text-dark-100 mb-4 flex items-center gap-2">
          <svg
            className="w-4 h-4 text-dark-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Primary Location
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* City */}
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-1.5">
              City
            </label>
            <input
              type="text"
              value={business.primary_city || ""}
              onChange={(e) =>
                onChange({ ...business, primary_city: e.target.value })
              }
              disabled={disabled}
              className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-metro-orange focus:border-metro-orange transition-colors ${
                validationErrors.primary_city
                  ? "border-metro-red focus:ring-red-500 focus:border-metro-red"
                  : "border-dark-600"
              } ${
                disabled
                  ? "bg-dark-800 text-dark-400 cursor-not-allowed"
                  : ""
              }`}
              placeholder="e.g., Alexandria"
              aria-invalid={!!validationErrors.primary_city}
              aria-describedby={
                validationErrors.primary_city
                  ? "primary-city-error"
                  : undefined
              }
            />
            {validationErrors.primary_city && (
              <p
                id="primary-city-error"
                className="text-metro-red text-xs mt-1"
                role="alert"
              >
                {validationErrors.primary_city}
              </p>
            )}
          </div>

          {/* State */}
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-1.5">
              State
            </label>
            <input
              type="text"
              value={business.primary_state || ""}
              onChange={(e) =>
                onChange({
                  ...business,
                  primary_state: e.target.value.toUpperCase(),
                })
              }
              disabled={disabled}
              maxLength={2}
              className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-metro-orange focus:border-metro-orange transition-colors ${
                validationErrors.primary_state
                  ? "border-metro-red focus:ring-red-500 focus:border-metro-red"
                  : "border-dark-600"
              } ${
                disabled
                  ? "bg-dark-800 text-dark-400 cursor-not-allowed"
                  : ""
              }`}
              placeholder="e.g., TN"
              aria-invalid={!!validationErrors.primary_state}
              aria-describedby={
                validationErrors.primary_state
                  ? "primary-state-error"
                  : undefined
              }
            />
            {validationErrors.primary_state && (
              <p
                id="primary-state-error"
                className="text-metro-red text-xs mt-1"
                role="alert"
              >
                {validationErrors.primary_state}
              </p>
            )}
          </div>
        </div>

        <p className="text-xs text-dark-400 mt-3">
          Used for local SEO targeting. For multi-location businesses, manage
          additional locations in the{" "}
          <a
            href="/dashboard/locations"
            className="text-metro-orange hover:text-metro-orange-600 underline"
          >
            Locations
          </a>{" "}
          section.
        </p>
      </div>
    );
  }
);

PrimaryLocationCard.displayName = "PrimaryLocationCard";

export default PrimaryLocationCard;
