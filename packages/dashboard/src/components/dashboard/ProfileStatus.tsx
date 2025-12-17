import React, { memo } from "react";
import { CompletenessRing } from "./CompletenessRing";

interface ProfileStatusProps {
  completenessScore: number;
}

/**
 * ProfileStatus: Displays profile completion status and readiness indicator
 * Memoized to prevent unnecessary re-renders
 */
export const ProfileStatus = memo<ProfileStatusProps>(
  ({ completenessScore }) => {
    const isReady = completenessScore >= 40;
    const statusText = isReady
      ? "Your profile is ready for content generation"
      : "Complete more sections to enable generation";

    return (
      <div className="flex flex-col items-center p-6 bg-white border rounded-lg shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-gray-900">
          Profile Status
        </h2>

        <CompletenessRing score={completenessScore} size="md" />

        <div className="mt-6 space-y-3 text-center">
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
            <div className="w-full h-2 overflow-hidden bg-gray-200 rounded-full">
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
