import React, { memo } from "react";
import type { Business } from "@marketbrewer/shared";

interface GoogleBusinessProfileCardProps {
  business: Business;
  validationErrors: Record<string, string | null>;
  disabled: boolean;
  onChange: (business: Business) => void;
}

/**
 * GoogleBusinessProfileCard: Modular component for GBP URL input
 * Used for verification and local SEO benefits. Separate from Primary Location.
 */
export const GoogleBusinessProfileCard = memo<GoogleBusinessProfileCardProps>(
  ({ business, validationErrors, disabled, onChange }) => {
    return (
      <div className="bg-dark-800 border border-dark-700 rounded-lg p-5">
        <h4 className="text-sm font-medium text-dark-100 mb-4 flex items-center gap-2">
          {/* Google "G" Icon */}
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Google Business Profile
        </h4>

        <div>
          <label className="block text-sm font-medium text-dark-200 mb-1.5">
            GBP URL
          </label>
          <input
            type="url"
            value={business.gbp_url || ""}
            onChange={(e) =>
              onChange({ ...business, gbp_url: e.target.value })
            }
            disabled={disabled}
            className={`w-full border rounded-lg px-3 py-2 text-dark-100 focus:ring-2 focus:ring-metro-orange focus:border-metro-orange transition-colors ${
              validationErrors.gbp_url
                ? "border-metro-red focus:ring-red-500 focus:border-metro-red"
                : "border-dark-600"
            } ${
              disabled
                ? "bg-dark-900 text-dark-400 cursor-not-allowed"
                : "bg-dark-900"
            }`}
            placeholder="https://www.google.com/maps/place/..."
            aria-invalid={!!validationErrors.gbp_url}
            aria-describedby={
              validationErrors.gbp_url ? "gbp-url-error" : "gbp-url-hint"
            }
          />
          {validationErrors.gbp_url && (
            <p
              id="gbp-url-error"
              className="text-metro-red text-xs mt-1"
              role="alert"
            >
              {validationErrors.gbp_url}
            </p>
          )}
          <p id="gbp-url-hint" className="text-xs text-metro-orange-600 mt-2">
            Used for verification and local SEO benefits.
          </p>
        </div>

        {/* GBP Status Indicator */}
        <div className="mt-4 pt-4 border-t border-dark-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-dark-500"></span>
              <span className="text-dark-300">GBP not verified</span>
            </div>
            {business.gbp_url && (
              <a
                href={business.gbp_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-metro-orange hover:text-metro-orange-600 underline"
              >
                View Profile ↗
              </a>
            )}
          </div>
          <p className="text-xs text-metro-orange mt-1">
            Future: Auto-verify GBP ownership via Google API
          </p>
        </div>
      </div>
    );
  }
);

GoogleBusinessProfileCard.displayName = "GoogleBusinessProfileCard";

export default GoogleBusinessProfileCard;
