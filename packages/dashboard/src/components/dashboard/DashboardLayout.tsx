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
 * Error boundaries wrap the main content area to prevent dashboard crashes
 * from runtime errors in child components.
 *
 * @see packages/dashboard/src/index.tsx for provider hierarchy
 */

import React from "react";
import { Sidebar } from "./Sidebar";
import { ErrorBoundary, DashboardErrorFallback } from "../common/ErrorBoundary";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
  actions,
}) => {
  return (
    <div className="min-h-screen bg-dark-950">
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <ErrorBoundary fallback={<DashboardErrorFallback />}>
            {(title || actions) && (
              <div className="flex items-center justify-between mb-6">
                {title && (
                  <h1 className="text-2xl font-bold text-dark-100">{title}</h1>
                )}
                {actions && <div className="flex items-center gap-3">{actions}</div>}
              </div>
            )}
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
