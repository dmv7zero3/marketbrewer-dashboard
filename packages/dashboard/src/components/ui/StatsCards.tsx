import React from "react";
import { Skeleton } from "./Skeleton";

interface StatItem {
  label: string;
  value: number | string;
  color?: "blue" | "green" | "yellow" | "red" | "gray";
  icon?: React.ReactNode;
}

interface StatsCardsProps {
  stats: StatItem[];
  loading?: boolean;
  columns?: 2 | 3 | 4;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  stats,
  loading = false,
  columns = 4,
}) => {
  if (loading) {
    return <Skeleton variant="stats" />;
  }

  const colorClasses = {
    blue: "text-blue-600",
    green: "text-green-600",
    yellow: "text-yellow-600",
    red: "text-red-600",
    gray: "text-gray-600",
  };

  const bgColorClasses = {
    blue: "bg-blue-50",
    green: "bg-green-50",
    yellow: "bg-yellow-50",
    red: "bg-red-50",
    gray: "bg-gray-50",
  };

  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4`}>
      {stats.map((stat, index) => {
        const color = stat.color || "gray";
        return (
          <div
            key={index}
            className={`${bgColorClasses[color]} border border-gray-200 rounded-lg p-4`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">{stat.label}</p>
              {stat.icon && (
                <div className={colorClasses[color]}>{stat.icon}</div>
              )}
            </div>
            <p className={`text-2xl font-bold ${colorClasses[color]}`}>
              {stat.value}
            </p>
          </div>
        );
      })}
    </div>
  );
};
