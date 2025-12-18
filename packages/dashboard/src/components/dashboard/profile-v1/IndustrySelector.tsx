import React, { memo, useMemo } from "react";
import {
  INDUSTRY_CATEGORIES,
  INDUSTRY_TYPES,
  type IndustryCategory,
  type IndustryType,
} from "@marketbrewer/shared";

interface IndustrySelectorProps {
  value: string;
  disabled?: boolean;
  error?: string | null;
  onChange: (value: string) => void;
}

export const IndustrySelector = memo<IndustrySelectorProps>(
  ({ value, disabled = false, error, onChange }) => {
    const grouped = useMemo(() => {
      const byCategory: Record<IndustryCategory, IndustryType[]> =
        INDUSTRY_CATEGORIES.reduce((acc, category) => {
          acc[category] = [];
          return acc;
        }, {} as Record<IndustryCategory, IndustryType[]>);

      for (const t of INDUSTRY_TYPES) {
        byCategory[t.category] = [...byCategory[t.category], t];
      }

      return byCategory;
    }, []);

    const hasError = !!error;

    return (
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-1.5">
          Industry <span className="text-red-600 ml-0.5">*</span>
        </label>
        <select
          disabled={disabled}
          className={`w-full px-3 py-2 border rounded-md transition-colors ${
            hasError
              ? "border-red-500 bg-red-50 focus:ring-red-500"
              : "border-gray-300 bg-white focus:ring-blue-500"
          } focus:outline-none focus:ring-1 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={hasError}
          aria-describedby={hasError ? "industry_type-error" : undefined}
        >
          <option value="">Select an industry…</option>
          {INDUSTRY_CATEGORIES.map((category) => (
            <optgroup key={category} label={category}>
              {grouped[category].map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {hasError && (
          <p
            id="industry_type-error"
            className="text-red-600 text-xs mt-1.5 flex items-center gap-1"
          >
            <span className="inline-block">⚠</span>
            {error}
          </p>
        )}
      </div>
    );
  }
);

IndustrySelector.displayName = "IndustrySelector";
