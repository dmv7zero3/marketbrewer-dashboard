import React, { memo } from "react";
import { CompletenessRing } from "./CompletenessRing";

interface ProfileStatusProps {
  completenessScore: number;
  isLoading?: boolean;
}

/**
 * ProfileStatus: Displays profile completion status and readiness indicator
 * Memoized to prevent unnecessary re-renders
 */
export const ProfileStatus = memo<ProfileStatusProps>(
  ({ completenessScore, isLoading = false }) => {
    const isReady = completenessScore >= 40;
    const statusText = isReady
      ? "Your profile is ready for content generation"
      : "Complete more sections to enable generation";

    return (
      <div className="flex flex-col items-center border rounded-lg p-6 bg-white shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Profile Status
        </h2>

        <CompletenessRing score={completenessScore} size="md" />

        <div className="mt-6 text-center space-y-3">
          <p className="text-xs text-gray-600">{statusText}</p>

          {/* Progress indicator */}
          <div className="w-full space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Progress</span>
              <span
                className={`font-medium ${
                  isReady ? "text-green-600" : "text-yellow-600"
                }`}
              >
                {completenessScore}%
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isReady ? "bg-green-500" : "bg-yellow-500"
                }`}
                style={{ width: `${completenessScore}%` }}
                role="progressbar"
                aria-valuenow={completenessScore}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>

          {/* Readiness badge */}
          <div
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
              isReady
                ? "bg-green-50 text-green-700"
                : "bg-yellow-50 text-yellow-700"
            }`}
          >
            <span>{isReady ? "✓" : "○"}</span>
            {isReady ? "Ready" : "In Progress"}
          </div>
        </div>
      </div>
    );
  }
);

ProfileStatus.displayName = "ProfileStatus";
