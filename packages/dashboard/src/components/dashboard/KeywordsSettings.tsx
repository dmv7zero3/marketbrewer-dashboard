import React from "react";

interface KeywordsSettingsProps {
  enabledLanguages: string[];
  onEnabledLanguagesChange: (languages: string[]) => void;
  isSaving?: boolean;
}

/**
 * KeywordsSettings: Settings tab for the Keywords dashboard
 * Controls which languages are enabled for keyword/content generation.
 *
 * Architecture note: Settings are per-business, stored in questionnaire.seoSettings.
 * Parent component (KeywordsManagement) handles loading/saving via questionnaire API.
 */
export const KeywordsSettings: React.FC<KeywordsSettingsProps> = ({
  enabledLanguages,
  onEnabledLanguagesChange,
  isSaving = false,
}) => {
  const isSpanishEnabled = enabledLanguages.includes("es");

  const handleSpanishToggle = (checked: boolean) => {
    if (checked) {
      // Add Spanish if not already present
      if (!enabledLanguages.includes("es")) {
        onEnabledLanguagesChange([...enabledLanguages, "es"]);
      }
    } else {
      // Remove Spanish
      onEnabledLanguagesChange(enabledLanguages.filter((lang) => lang !== "es"));
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-dark-100 mb-2">
          Content Languages
        </h2>
        <p className="text-sm text-dark-400">
          Configure which languages are enabled for SEO content generation for this business.
        </p>
      </div>

      {/* English (always enabled) */}
      <div className="bg-dark-800 border border-dark-700 rounded-lg p-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={true}
            disabled={true}
            className="mt-1 w-5 h-5 text-metro-orange rounded focus:ring-metro-orange border-dark-600 cursor-not-allowed"
          />
          <div>
            <span className="text-sm font-medium text-dark-100 block">
              English (EN)
            </span>
            <span className="text-sm text-dark-400 block mt-1">
              Primary language (always enabled)
            </span>
          </div>
        </label>
      </div>

      {/* Spanish toggle */}
      <div className="bg-dark-800 border border-dark-700 rounded-lg p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isSpanishEnabled}
            onChange={(e) => handleSpanishToggle(e.target.checked)}
            disabled={isSaving}
            className="mt-1 w-5 h-5 text-metro-orange rounded focus:ring-metro-orange border-dark-600 disabled:opacity-50"
          />
          <div>
            <span className="text-sm font-medium text-dark-100 block">
              Spanish (ES)
            </span>
            <span className="text-sm text-dark-400 block mt-1">
              Enable bilingual keyword pairs and Spanish content generation
            </span>
          </div>
        </label>
      </div>

      {/* Info section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">
          About Language Settings
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            • When Spanish is enabled, you can create bilingual keyword pairs (EN + ES)
          </li>
          <li>
            • The Keywords dashboard will show paired keywords side-by-side
          </li>
          <li>
            • Content generation will produce pages in both languages
          </li>
          <li>
            • This setting is saved per-business
          </li>
        </ul>
      </div>

      {/* Future languages note */}
      <div className="text-xs text-dark-400 italic">
        Additional languages will be available in future versions.
      </div>
    </div>
  );
};

/**
 * Helper to check if Spanish is enabled from enabledLanguages array
 */
export const isSpanishEnabled = (enabledLanguages: string[]): boolean => {
  return enabledLanguages.includes("es");
};

/**
 * Default enabled languages for new businesses
 */
export const DEFAULT_ENABLED_LANGUAGES = ["en"];

export default KeywordsSettings;
