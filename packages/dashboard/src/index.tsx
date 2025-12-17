import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { JobCreate } from "./pages/JobCreate";
import { JobStatus } from "./pages/JobStatus";
import { JobsList } from "./pages/JobsList";
import { Navbar } from "./components/ui/Navbar";
import { Footer } from "./components/ui/Footer";
import "./styles/index.css";

const App: React.FC = () => (
  <BrowserRouter>
    <Navbar />
    <Routes>
      <Route path="/" element={<JobCreate />} />
      <Route path="/jobs/:businessId/:jobId" element={<JobStatus />} />
      <Route path="/jobs" element={<JobsList />} />
      <Route path="/jobs/:businessId" element={<JobsList />} />
    </Routes>
    <Footer />
  </BrowserRouter>
);

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
