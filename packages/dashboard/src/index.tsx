import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { JobCreate } from "./pages/JobCreate";
import { JobStatus } from "./pages/JobStatus";
import { JobsList } from "./pages/JobsList";
import { Navbar } from "./components/ui/Navbar";
import { Footer } from "./components/ui/Footer";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { BusinessProvider } from "./contexts/BusinessContext";
import { ToastProvider } from "./contexts/ToastContext";
import {
  BusinessProfile,
  PromptsManagement,
  KeywordsManagement,
  ServiceAreas,
  PageContentGeneration,
  LocationsManagement,
  Sidebar,
} from "./components/dashboard";
import "./styles/index.css";

/**
 * Wrapper for job pages to include sidebar and business context
 */
const JobsLayoutWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="min-h-screen bg-gray-50">
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  </div>
);

const App: React.FC = () => (
  <ErrorBoundary>
    <ToastProvider>
      <BusinessProvider>
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            {/* Jobs with sidebar for business selection */}
            <Route
              path="/jobs/new"
              element={
                <JobsLayoutWrapper>
                  <JobCreate />
                </JobsLayoutWrapper>
              }
            />
            <Route path="/jobs/:businessId/:jobId" element={<JobStatus />} />
            <Route
              path="/jobs"
              element={
                <JobsLayoutWrapper>
                  <JobsList />
                </JobsLayoutWrapper>
              }
            />
            <Route
              path="/jobs/:businessId"
              element={
                <JobsLayoutWrapper>
                  <JobsList />
                </JobsLayoutWrapper>
              }
            />
            {/* Dashboard routes */}
            <Route
              path="/dashboard"
              element={<Navigate to="/jobs" replace />}
            />
            <Route
              path="/dashboard/business-profile"
              element={<BusinessProfile />}
            />
            <Route path="/dashboard/prompts" element={<PromptsManagement />} />
            <Route
              path="/dashboard/keywords"
              element={<KeywordsManagement />}
            />
            <Route path="/dashboard/service-areas" element={<ServiceAreas />} />
            <Route
              path="/dashboard/locations"
              element={<LocationsManagement />}
            />
            <Route
              path="/dashboard/page-content-generation"
              element={<PageContentGeneration />}
            />
            <Route path="*" element={<Navigate to="/jobs" replace />} />
          </Routes>
          <Footer />
        </BrowserRouter>
      </BusinessProvider>
    </ToastProvider>
  </ErrorBoundary>
);

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
