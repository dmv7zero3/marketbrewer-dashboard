import React, { memo, useMemo, useState } from "react";
import { SOCIAL_PLATFORMS, type SocialPlatform } from "@marketbrewer/shared";

export interface SocialLinkInput {
  platform: SocialPlatform;
  url: string;
}

interface SocialLinksFormProps {
  value: SocialLinkInput[];
  disabled?: boolean;
  onChange: (next: SocialLinkInput[]) => void;
}

export const SocialLinksForm = memo<SocialLinksFormProps>(
  ({ value, disabled = false, onChange }) => {
    const [platform, setPlatform] = useState<SocialPlatform>("facebook");
    const [url, setUrl] = useState<string>("");

    const usedPlatforms = useMemo(
      () => new Set(value.map((x) => x.platform)),
      [value]
    );

    const availablePlatforms = useMemo(
      () => SOCIAL_PLATFORMS.filter((p) => !usedPlatforms.has(p.value)),
      [usedPlatforms]
    );

    const canAdd = platform && url.trim().length > 0;

    const handleAdd = () => {
      if (!canAdd) return;
      if (usedPlatforms.has(platform)) return;

      const next: SocialLinkInput[] = [...value, { platform, url: url.trim() }];
      onChange(next);

      setUrl("");
      if (availablePlatforms.length > 0) {
        setPlatform(availablePlatforms[0].value);
      }
    };

    const handleRemove = (toRemove: SocialPlatform) => {
      onChange(value.filter((x) => x.platform !== toRemove));
    };

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-dark-100 mb-1.5">
              Platform
            </label>
            <select
              disabled={disabled || availablePlatforms.length === 0}
              className="w-full px-3 py-2 border border-dark-600 rounded-md bg-dark-800 focus:outline-none focus:ring-1 focus:ring-metro-orange disabled:bg-dark-800 disabled:text-dark-400"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as SocialPlatform)}
            >
              {availablePlatforms.length === 0 ? (
                <option value={platform}>All platforms added</option>
              ) : (
                availablePlatforms.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-dark-100 mb-1.5">
              URL
            </label>
            <input
              type="url"
              disabled={disabled || availablePlatforms.length === 0}
              className="w-full px-3 py-2 border border-dark-600 rounded-md bg-dark-800 focus:outline-none focus:ring-1 focus:ring-metro-orange disabled:bg-dark-800 disabled:text-dark-400"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="md:col-span-1 flex items-end">
            <button
              type="button"
              disabled={disabled || availablePlatforms.length === 0 || !canAdd}
              className="w-full px-3 py-2 rounded-md bg-gray-900 text-white disabled:bg-dark-600 disabled:text-dark-400"
              onClick={handleAdd}
            >
              Add
            </button>
          </div>
        </div>

        {value.length === 0 ? (
          <p className="text-sm text-dark-400">No social links added yet.</p>
        ) : (
          <div className="space-y-2">
            {value
              .slice()
              .sort((a, b) => a.platform.localeCompare(b.platform))
              .map((link) => {
                const label =
                  SOCIAL_PLATFORMS.find((p) => p.value === link.platform)
                    ?.label ?? link.platform;

                return (
                  <div
                    key={link.platform}
                    className="flex items-center justify-between gap-3 border rounded-md px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-dark-100">
                        {label}
                      </p>
                      <p className="text-sm text-dark-400 truncate">
                        {link.url}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={disabled}
                      className="text-sm text-metro-red hover:text-metro-red-600 disabled:text-dark-500"
                      onClick={() => handleRemove(link.platform)}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    );
  }
);

SocialLinksForm.displayName = "SocialLinksForm";
