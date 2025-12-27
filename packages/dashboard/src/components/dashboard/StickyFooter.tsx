import React from "react";

interface StickyFooterProps {
  hasChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
  saveLabel?: string;
  cancelLabel?: string;
}

/**
 * StickyFooter: Fixed bottom footer with unified save/cancel controls
 * Shows save status and provides persistent action buttons
 */
export const StickyFooter: React.FC<StickyFooterProps> = ({
  hasChanges,
  isSaving,
  onSave,
  onCancel,
  saveLabel = "Save All Changes",
  cancelLabel = "Discard Changes",
}) => {
  return (
    <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-dark-800 border-t border-dark-700 shadow-lg z-40">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          {isSaving ? (
            <>
              <div className="w-2 h-2 bg-metro-orange rounded-full animate-pulse" />
              <span className="text-sm text-dark-400">Saving...</span>
            </>
          ) : hasChanges ? (
            <>
              <div className="w-2 h-2 bg-yellow-600 rounded-full" />
              <span className="text-sm text-yellow-700 font-medium">
                <span aria-hidden="true">●</span>
                <span className="ml-1">Unsaved changes</span>
              </span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-green-600 rounded-full" />
              <span className="text-sm text-metro-green-600 font-medium">
                <span aria-hidden="true">✓</span>
                <span className="ml-1">All changes saved</span>
              </span>
            </>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={!hasChanges || isSaving}
            className="px-4 py-2 border border-dark-600 rounded-lg font-medium text-dark-200 hover:bg-dark-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onSave}
            disabled={!hasChanges || isSaving}
            className="px-4 py-2 bg-metro-orange text-white rounded-lg font-medium hover:bg-metro-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            type="button"
          >
            {isSaving ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-6-8c0 3.31 2.69 6 6 6s6-2.69 6-6-2.69-6-6-6-6 2.69-6 6z"
                  />
                </svg>
                Saving...
              </>
            ) : (
              saveLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
