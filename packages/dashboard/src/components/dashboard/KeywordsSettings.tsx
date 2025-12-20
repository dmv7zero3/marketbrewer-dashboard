import React from "react";

const STORAGE_KEY = "keywords.createBilingualDefault";

interface KeywordsSettingsProps {
  createBilingualDefault: boolean;
  onCreateBilingualDefaultChange: (value: boolean) => void;
}

/**
 * KeywordsSettings: Settings tab for the Keywords dashboard
 * Controls default behavior for keyword creation (bilingual pair mode)
 *
 * Architecture note: Co-located with KeywordsManagement since settings are
 * keyword-specific. Uses localStorage for persistence (per-browser setting).
 */
export const KeywordsSettings: React.FC<KeywordsSettingsProps> = ({
  createBilingualDefault,
  onCreateBilingualDefaultChange,
}) => {
  const handleToggle = (checked: boolean) => {
    // Persist to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
    // Update parent state
    onCreateBilingualDefaultChange(checked);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Keyword Creation Defaults
        </h2>
        <p className="text-sm text-gray-600">
          Configure default behavior when adding new keywords.
        </p>
      </div>

      {/* Bilingual Default Setting */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={createBilingualDefault}
            onChange={(e) => handleToggle(e.target.checked)}
            className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
          />
          <div>
            <span className="text-sm font-medium text-gray-900 block">
              Create bilingual pair (EN + ES)
            </span>
            <span className="text-sm text-gray-600 block mt-1">
              Recommended: Creates both languages at once
            </span>
          </div>
        </label>
      </div>

      {/* Info section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">
          About this setting
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            • When enabled, the "Add New Keywords" form in the Manage tab will
            default to bilingual mode
          </li>
          <li>
            • You can still toggle the mode manually when adding individual
            keywords
          </li>
          <li>• This setting is saved in your browser and persists across sessions</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * Utility to load the bilingual default setting from localStorage
 */
export const loadBilingualDefault = (): boolean => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      return JSON.parse(stored) as boolean;
    }
  } catch {
    // If parsing fails, return default
  }
  return true; // Default to bilingual mode enabled
};

export default KeywordsSettings;
