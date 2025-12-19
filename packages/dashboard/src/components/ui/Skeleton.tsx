import React from "react";

interface SkeletonProps {
  variant?: "text" | "card" | "list" | "table" | "stats";
  rows?: number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = "text",
  rows = 3,
  className = "",
}) => {
  if (variant === "stats") {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 space-y-2 border border-gray-200 rounded-lg bg-gray-50"
          >
            <div className="w-1/2 h-4 bg-gray-200 rounded animate-pulse" />
            <div className="w-3/4 h-8 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg"
          >
            <div className="flex-1 space-y-2">
              <div className="w-1/3 h-4 bg-gray-200 rounded animate-pulse" />
              <div className="w-1/2 h-3 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="w-20 h-8 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={`bg-white border border-gray-200 rounded-lg p-6 space-y-4 ${className}`}
      >
        <div className="w-1/3 h-6 bg-gray-200 rounded animate-pulse" />
        <div className="space-y-2">
          <div className="w-full h-4 bg-gray-200 rounded animate-pulse" />
          <div className="w-5/6 h-4 bg-gray-200 rounded animate-pulse" />
          <div className="w-4/6 h-4 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="flex-1 h-10 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  // Default: text lines
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-200 rounded animate-pulse"
          style={{ width: `${Math.random() * 30 + 70}%` }}
        />
      ))}
    </div>
  );
};
