import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { JobCreate } from "./pages/JobCreate";
import { JobStatus } from "./pages/JobStatus";
import { JobsList } from "./pages/JobsList";
import { CodingAssist } from "./pages/CodingAssist";
import { Navbar } from "./components/ui/Navbar";
import { Footer } from "./components/ui/Footer";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { BusinessProvider } from "./contexts/BusinessContext";
import { ToastProvider } from "./contexts/ToastContext";
import { AuthProvider } from "./contexts/AuthContext";
import { I18nProvider } from "./contexts/I18nContext";
import { GoogleAuthGate } from "./components/auth/GoogleAuthGate";
import {
  BusinessProfile,
  PromptsManagement,
  KeywordsManagement,
  ServicesManagement,
  ServiceAreas,
  PageContentGeneration,
  LocationsManagement,
  Roadmap,
  AwsInfrastructure,
  WebhooksManagement,
  DataStorageOverview,
} from "./components/dashboard";
import "./styles/index.css";

const App: React.FC = () => (
  <ErrorBoundary>
    <AuthProvider>
      <GoogleAuthGate>
        <I18nProvider>
          <ToastProvider>
            <BusinessProvider>
              <BrowserRouter>
                <Navbar />
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  {/* Jobs routes - pages use DashboardLayout internally */}
                  <Route path="/jobs/new" element={<JobCreate />} />
                  <Route path="/jobs/:businessId/:jobId" element={<JobStatus />} />
                  <Route path="/jobs" element={<JobsList />} />
                  <Route path="/jobs/:businessId" element={<JobsList />} />
                  <Route path="/coding" element={<CodingAssist />} />
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
                  <Route
                    path="/dashboard/services"
                    element={<ServicesManagement />}
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
                  <Route path="/dashboard/webhooks" element={<WebhooksManagement />} />
                  <Route
                    path="/dashboard/data-storage"
                    element={<DataStorageOverview />}
                  />
                  <Route path="/dashboard/roadmap" element={<Roadmap />} />
                  <Route
                    path="/dashboard/aws-infrastructure"
                    element={<AwsInfrastructure />}
                  />
                  <Route path="*" element={<Navigate to="/jobs" replace />} />
                </Routes>
                <Footer />
              </BrowserRouter>
            </BusinessProvider>
          </ToastProvider>
        </I18nProvider>
      </GoogleAuthGate>
    </AuthProvider>
  </ErrorBoundary>
);

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
