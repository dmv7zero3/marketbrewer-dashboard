import React, { memo } from "react";
import type { Business } from "@marketbrewer/shared";
import { IndustrySelector } from "./profile-v1/IndustrySelector";

interface BusinessDetailsFormProps {
  business: Business | null;
  validationErrors: Record<string, string | null>;
  disabled?: boolean;
  onChange: (business: Business) => void;
}

/**
 * BusinessDetailsForm: Reusable core business details form
 * Handles: Name, Industry, Website, Phone, Email
 * Memoized to prevent unnecessary re-renders
 */
export const BusinessDetailsForm = memo<BusinessDetailsFormProps>(
  ({ business, validationErrors, disabled = false, onChange }) => {
    if (!business) return null;

    const updateField = (field: keyof Business, value: string) => {
      onChange({ ...business, [field]: value });
    };

    // Core business identity fields only
    // gbp_url, primary_city, primary_state removed (now in EssentialsTab GBP section)
    const fields = [
      {
        key: "name",
        label: "Business Name",
        required: true,
        placeholder: "Your business name",
        value: business.name ?? "",
        type: "text",
      },
      {
        key: "website",
        label: "Website",
        required: false,
        placeholder: "https://example.com",
        value: business.website ?? "",
        type: "url",
      },
      {
        key: "phone",
        label: "Phone",
        required: false,
        placeholder: "(555) 123-4567",
        value: business.phone ?? "",
        type: "tel",
      },
      {
        key: "email",
        label: "Email",
        required: false,
        placeholder: "contact@example.com",
        value: business.email ?? "",
        type: "email",
      },
    ] as const;

    return (
      <div className="space-y-4">
        <IndustrySelector
          value={business.industry_type ?? business.industry ?? ""}
          disabled={disabled}
          error={validationErrors.industry_type || validationErrors.industry}
          onChange={(val) =>
            onChange({
              ...business,
              industry_type: val,
              industry: val || business.industry,
            })
          }
        />

        {fields.map((field) => {
          const error = validationErrors[field.key];
          const hasError = !!error;

          return (
            <div key={field.key}>
              <label className="block text-sm font-medium text-dark-100 mb-1.5">
                {field.label}
                {field.required ? (
                  <span className="text-metro-red ml-0.5">*</span>
                ) : (
                  <span className="ml-2 text-xs font-normal text-dark-500">
                    optional
                  </span>
                )}
              </label>
              <input
                type={field.type}
                disabled={disabled}
                className={`w-full px-3 py-2 border rounded-md transition-colors ${
                  hasError
                    ? "border-metro-red bg-metro-red-950 focus:ring-red-500"
                    : "border-dark-600 bg-dark-800 focus:ring-metro-orange"
                } focus:outline-none focus:ring-1 disabled:bg-dark-800 disabled:text-dark-400 disabled:cursor-not-allowed`}
                value={field.value}
                onChange={(e) =>
                  updateField(field.key as keyof Business, e.target.value)
                }
                placeholder={field.placeholder}
                aria-invalid={hasError}
                aria-describedby={hasError ? `${field.key}-error` : undefined}
              />
              {hasError && (
                <p
                  id={`${field.key}-error`}
                  className="text-metro-red text-xs mt-1.5 flex items-center gap-1"
                >
                  <span className="inline-block">⚠</span>
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  }
);

BusinessDetailsForm.displayName = "BusinessDetailsForm";
