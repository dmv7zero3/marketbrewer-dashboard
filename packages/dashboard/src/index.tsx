import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { JobCreate } from "./pages/JobCreate";
import { JobStatus } from "./pages/JobStatus";
import { JobsList } from "./pages/JobsList";
import { Navbar } from "./components/ui/Navbar";
import { Footer } from "./components/ui/Footer";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { BusinessProvider } from "./contexts/BusinessContext";
import { ToastProvider } from "./contexts/ToastContext";
import {
  Dashboard,
  BusinessProfile,
  WebsiteManagement,
  PromptsManagement,
  KeywordsManagement,
  ServiceAreas,
  ServiceAreasInstructions,
  URLGeneration,
  PageContentGeneration,
  LocalSEOPhotos,
  Billing,
} from "./components/dashboard";
import "./styles/index.css";

const App: React.FC = () => (
  <ErrorBoundary>
    <ToastProvider>
      <BusinessProvider>
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<JobCreate />} />
            <Route path="/jobs/:businessId/:jobId" element={<JobStatus />} />
            <Route path="/jobs" element={<JobsList />} />
            <Route path="/jobs/:businessId" element={<JobsList />} />
            {/* Dashboard routes */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route
              path="/dashboard/business-profile"
              element={<BusinessProfile />}
            />
            <Route path="/dashboard/websites" element={<WebsiteManagement />} />
            <Route path="/dashboard/prompts" element={<PromptsManagement />} />
            <Route
              path="/dashboard/keywords"
              element={<KeywordsManagement />}
            />
            <Route path="/dashboard/service-areas" element={<ServiceAreas />} />
            <Route
              path="/dashboard/service-areas/instructions"
              element={<ServiceAreasInstructions />}
            />
            <Route
              path="/dashboard/url-generation"
              element={<URLGeneration />}
            />
            <Route
              path="/dashboard/page-content-generation"
              element={<PageContentGeneration />}
            />
            <Route
              path="/dashboard/local-seo-photos"
              element={<LocalSEOPhotos />}
            />
            <Route path="/dashboard/billing" element={<Billing />} />
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
