import React from "react";

interface ValidationError {
  field: string;
  message: string;
  section?: string;
}

interface ValidationSummaryProps {
  errors: ValidationError[];
  onErrorClick?: (field: string) => void;
}

/**
 * ValidationSummary: Displays all validation errors in a single, scannable location
 * Allows users to click on an error to jump to that field
 */
export const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  errors,
  onErrorClick,
}) => {
  if (errors.length === 0) return null;

  return (
    <div className="p-4 mb-6 border border-red-200 rounded-lg bg-metro-red-950">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <svg
            className="w-5 h-5 text-metro-red"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="mb-2 font-medium text-red-800">
            Please fix {errors.length} issue{errors.length > 1 ? "s" : ""}{" "}
            before saving:
          </h4>
          <ul className="space-y-1">
            {errors.map((err, i) => (
              <li key={i}>
                <button
                  onClick={() => onErrorClick?.(err.field)}
                  className="text-sm text-left text-metro-red-600 hover:underline"
                  type="button"
                >
                  {err.section && (
                    <span className="font-medium">{err.section}:</span>
                  )}{" "}
                  {err.message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
