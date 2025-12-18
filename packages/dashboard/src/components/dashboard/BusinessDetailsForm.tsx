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

    const fields = [
      {
        key: "name",
        label: "Business Name",
        required: true,
        placeholder: "Your business name",
        value: business.name ?? "",
      },
      {
        key: "gbp_url",
        label: "Google Business Profile URL",
        required: false,
        placeholder: "https://business.google.com/...",
        value: business.gbp_url ?? "",
      },
      {
        key: "website",
        label: "Website",
        required: false,
        placeholder: "https://example.com",
        value: business.website ?? "",
      },
      {
        key: "phone",
        label: "Phone",
        required: false,
        placeholder: "(555) 123-4567",
        value: business.phone ?? "",
      },
      {
        key: "email",
        label: "Email",
        required: false,
        placeholder: "contact@example.com",
        value: business.email ?? "",
      },
      {
        key: "primary_city",
        label: "Primary City",
        required: false,
        placeholder: "Arlington",
        value: business.primary_city ?? "",
      },
      {
        key: "primary_state",
        label: "Primary State",
        required: false,
        placeholder: "VA",
        value: business.primary_state ?? "",
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
              <label className="block text-sm font-medium text-gray-900 mb-1.5">
                {field.label}
                {field.required ? (
                  <span className="text-red-600 ml-0.5">*</span>
                ) : (
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    optional
                  </span>
                )}
              </label>
              <input
                type={field.key === "email" ? "email" : "text"}
                disabled={disabled}
                className={`w-full px-3 py-2 border rounded-md transition-colors ${
                  hasError
                    ? "border-red-500 bg-red-50 focus:ring-red-500"
                    : "border-gray-300 bg-white focus:ring-blue-500"
                } focus:outline-none focus:ring-1 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed`}
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
                  className="text-red-600 text-xs mt-1.5 flex items-center gap-1"
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
