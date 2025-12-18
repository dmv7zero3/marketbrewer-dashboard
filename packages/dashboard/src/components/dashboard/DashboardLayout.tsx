/**
 * Dashboard Layout Component
 *
 * Provides consistent layout structure for dashboard pages with sidebar.
 *
 * IMPORTANT: This component does NOT include BusinessProvider.
 * The BusinessProvider is wrapped at the App root level in index.tsx.
 * Nesting providers would cause context isolation bugs where the sidebar
 * dropdown updates one context while child components read from another.
 *
 * @see packages/dashboard/src/index.tsx for provider hierarchy
 */

import React from "react";
import { Sidebar } from "./Sidebar";

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
