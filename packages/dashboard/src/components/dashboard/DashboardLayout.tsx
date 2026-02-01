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

import React, { useState } from "react";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const showHeader = Boolean(title || actions);

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="flex">
        {sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <div
          className={`fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200 md:static md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar onNavigate={() => setSidebarOpen(false)} />
        </div>
        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto w-full max-w-[1800px]">
          <ErrorBoundary fallback={<DashboardErrorFallback />}>
            {showHeader ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    className="md:hidden inline-flex items-center justify-center rounded-lg border border-dark-700 bg-dark-900 px-2.5 py-1.5 text-sm text-dark-100"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="Open navigation"
                  >
                    Menu
                  </button>
                  {title && (
                    <h1 className="text-xl font-bold text-dark-100 sm:text-2xl">
                      {title}
                    </h1>
                  )}
                </div>
                {actions && <div className="flex items-center gap-3">{actions}</div>}
              </div>
            ) : (
              <div className="md:hidden mb-4">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-lg border border-dark-700 bg-dark-900 px-2.5 py-1.5 text-sm text-dark-100"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open navigation"
                >
                  Menu
                </button>
              </div>
            )}
            {children}
          </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
