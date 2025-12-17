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
    <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          {isSaving ? (
            <>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
              <span className="text-sm text-gray-600">Saving...</span>
            </>
          ) : hasChanges ? (
            <>
              <div className="w-2 h-2 bg-yellow-600 rounded-full" />
              <span className="text-sm text-yellow-700 font-medium">
                ● Unsaved changes
              </span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-green-600 rounded-full" />
              <span className="text-sm text-green-700 font-medium">
                ✓ All changes saved
              </span>
            </>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={!hasChanges || isSaving}
            className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onSave}
            disabled={!hasChanges || isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            type="button"
          >
            {isSaving ? "Saving..." : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
