import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
const JobCreate = React.lazy(() =>
  import("./pages/JobCreate").then((m) => ({ default: m.JobCreate }))
);
const JobStatus = React.lazy(() =>
  import("./pages/JobStatus").then((m) => ({ default: m.JobStatus }))
);
const JobsList = React.lazy(() =>
  import("./pages/JobsList").then((m) => ({ default: m.JobsList }))
);
const CodingAssist = React.lazy(() =>
  import("./pages/CodingAssist").then((m) => ({ default: m.CodingAssist }))
);
import { Navbar } from "./components/ui/Navbar";
import { Footer } from "./components/ui/Footer";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { BusinessProvider } from "./contexts/BusinessContext";
import { ToastProvider } from "./contexts/ToastContext";
import { AuthProvider } from "./contexts/AuthContext";
import { I18nProvider } from "./contexts/I18nContext";
import { GoogleAuthGate } from "./components/auth/GoogleAuthGate";
const BusinessProfile = React.lazy(() =>
  import("./components/dashboard/BusinessProfile").then((m) => ({ default: m.BusinessProfile }))
);
const PromptsManagement = React.lazy(() =>
  import("./components/dashboard/PromptsManagement").then((m) => ({ default: m.PromptsManagement }))
);
const KeywordsManagement = React.lazy(() =>
  import("./components/dashboard/KeywordsManagement").then((m) => ({ default: m.KeywordsManagement }))
);
const ServicesManagement = React.lazy(() =>
  import("./components/dashboard/ServicesManagement").then((m) => ({ default: m.ServicesManagement }))
);
const ServiceAreas = React.lazy(() =>
  import("./components/dashboard/ServiceAreas").then((m) => ({ default: m.ServiceAreas }))
);
const PageContentGeneration = React.lazy(() =>
  import("./components/dashboard/PageContentGeneration").then((m) => ({ default: m.PageContentGeneration }))
);
const LocationsManagement = React.lazy(() =>
  import("./components/dashboard/LocationsManagement").then((m) => ({ default: m.LocationsManagement }))
);
const Roadmap = React.lazy(() =>
  import("./components/dashboard/Roadmap").then((m) => ({ default: m.Roadmap }))
);
const AwsInfrastructure = React.lazy(() =>
  import("./components/dashboard/AwsInfrastructure").then((m) => ({ default: m.AwsInfrastructure }))
);
const WebhooksManagement = React.lazy(() =>
  import("./components/dashboard/WebhooksManagement").then((m) => ({ default: m.WebhooksManagement }))
);
const DataStorageOverview = React.lazy(() =>
  import("./components/dashboard/DataStorageOverview").then((m) => ({ default: m.DataStorageOverview }))
);
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
                <Suspense fallback={<div className="px-6 py-10 text-dark-300">Loading...</div>}>
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
                </Suspense>
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
