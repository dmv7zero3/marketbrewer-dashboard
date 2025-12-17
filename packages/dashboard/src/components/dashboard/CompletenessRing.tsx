import React from "react";

interface CompletenessRingProps {
  score: number; // 0-100
  size?: "sm" | "md" | "lg";
}

/**
 * CompletenessRing: Visual progress indicator showing profile completeness
 * Displays percentage with color coding: red (< 40), yellow (40-70), green (70+)
 */
export const CompletenessRing: React.FC<CompletenessRingProps> = ({
  score,
  size = "md",
}) => {
  const circumference = 2 * Math.PI * 45; // radius = 45
  const offset = circumference - (score / 100) * circumference;

  const sizeClasses = {
    sm: "w-20 h-20",
    md: "w-32 h-32",
    lg: "w-48 h-48",
  };

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-3xl",
    lg: "text-5xl",
  };

  const getColor = () => {
    if (score < 40) return "text-red-600";
    if (score < 70) return "text-yellow-600";
    return "text-green-600";
  };

  const getStroke = () => {
    if (score < 40) return "#dc2626"; // red-600
    if (score < 70) return "#ca8a04"; // yellow-600
    return "#16a34a"; // green-600
  };

  const getStatusText = () => {
    if (score < 40) return "Not Ready";
    if (score < 70) return "Getting There";
    return "Ready to Generate";
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative ${sizeClasses[size]}`}
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Profile completeness: ${score}%, ${getStatusText()}`}
      >
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="50%"
            cy="50%"
            r="45"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="4"
          />
          {/* Progress circle */}
          <circle
            cx="50%"
            cy="50%"
            r="45"
            fill="none"
            stroke={getStroke()}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold ${textSizeClasses[size]} ${getColor()}`}>
            {score}%
          </span>
        </div>
      </div>

      {/* Status label */}
      <p className={`mt-3 font-medium text-sm ${getColor()}`}>
        {getStatusText()}
      </p>
    </div>
  );
};
