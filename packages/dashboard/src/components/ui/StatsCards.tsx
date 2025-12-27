import React from "react";
import { Skeleton } from "./Skeleton";

interface StatItem {
  label: string;
  value: number | string;
  color?: "blue" | "green" | "yellow" | "red" | "gray" | "orange";
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
    blue: "text-metro-blue",
    green: "text-metro-green",
    yellow: "text-metro-yellow",
    red: "text-metro-red",
    gray: "text-dark-400",
    orange: "text-metro-orange",
  };

  const bgColorClasses = {
    blue: "bg-metro-blue-950/50 border-metro-blue-900/50",
    green: "bg-metro-green-950/50 border-metro-green-900/50",
    yellow: "bg-metro-yellow-950/50 border-metro-yellow-900/50",
    red: "bg-metro-red-950/50 border-metro-red-900/50",
    gray: "bg-dark-800 border-dark-700",
    orange: "bg-metro-orange-950/50 border-metro-orange-900/50",
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
            className={`${bgColorClasses[color]} border rounded-lg p-4`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-dark-400">{stat.label}</p>
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
