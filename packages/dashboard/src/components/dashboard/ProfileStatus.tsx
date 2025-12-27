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
      <div className="flex flex-col items-center p-6 bg-dark-800 border rounded-lg shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-dark-100">
          Profile Status
        </h2>

        <CompletenessRing score={completenessScore} size="md" />

        <div className="mt-6 space-y-3 text-center">
          <p className="text-xs text-dark-400">{statusText}</p>

          {/* Progress indicator */}
          <div className="w-full space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-dark-400">Progress</span>
              <span
                className={`font-medium ${
                  isReady ? "text-metro-green" : "text-metro-yellow"
                }`}
              >
                {completenessScore}%
              </span>
            </div>
            <div className="w-full h-2 overflow-hidden bg-dark-700 rounded-full">
              <div
                className={`h-full rounded-full transition-all ${
                  isReady ? "bg-metro-green-9500" : "bg-metro-yellow-9500"
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
                ? "bg-metro-green-950 text-metro-green-600"
                : "bg-metro-yellow-950 text-yellow-700"
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
