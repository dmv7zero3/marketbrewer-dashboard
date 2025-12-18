import React from "react";
import { Business } from "@marketbrewer/shared";
import { BusinessDetailsForm } from "../BusinessDetailsForm";

interface EssentialsTabProps {
  business: Business | null;
  validationErrors: Record<string, string | null>;
  onChange: (business: Business) => void;
  disabled: boolean;
}

export const EssentialsTab: React.FC<EssentialsTabProps> = ({
  business,
  validationErrors,
  onChange,
  disabled,
}) => {
  if (!business) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Business Details Section */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Business Details
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Core information about your business including name, industry, and
          contact details.
        </p>
        <BusinessDetailsForm
          business={business}
          validationErrors={validationErrors}
          onChange={onChange}
          disabled={disabled}
        />
      </section>

      {/* Google Business Profile Section */}
      <section className="border-t pt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Google Business Profile
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Link to your Google Business Profile to enhance local SEO visibility.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            GBP URL
          </label>
          <input
            type="url"
            value={business.gbp_url || ""}
            onChange={(e) => onChange({ ...business, gbp_url: e.target.value })}
            disabled={disabled}
            className="w-full border rounded-lg px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500"
            placeholder="https://www.google.com/maps/place/..."
          />
          {validationErrors.gbp_url && (
            <p className="text-red-600 text-xs mt-1">
              {validationErrors.gbp_url}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Your Google Business Profile URL for verification and local SEO
            benefits.
          </p>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Primary City
          </label>
          <input
            type="text"
            value={business.primary_city || ""}
            onChange={(e) =>
              onChange({ ...business, primary_city: e.target.value })
            }
            disabled={disabled}
            className="w-full border rounded-lg px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500"
            placeholder="e.g., Nashville"
          />
          {validationErrors.primary_city && (
            <p className="text-red-600 text-xs mt-1">
              {validationErrors.primary_city}
            </p>
          )}
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Primary State
          </label>
          <input
            type="text"
            value={business.primary_state || ""}
            onChange={(e) =>
              onChange({ ...business, primary_state: e.target.value })
            }
            disabled={disabled}
            className="w-full border rounded-lg px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500"
            placeholder="e.g., TN"
          />
          {validationErrors.primary_state && (
            <p className="text-red-600 text-xs mt-1">
              {validationErrors.primary_state}
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default EssentialsTab;
