import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { Dashboard } from "./pages/Dashboard";
import { Billing } from "./pages/Billing";
import { SeoStatus } from "./pages/SeoStatus";
import { Account } from "./pages/Account";
import "./styles/index.css";

const App: React.FC = () => (
  <BrowserRouter>
    <div className="min-h-screen bg-dark-950 text-slate-100">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <Routes>
          <Route path="/" element={<Navigate to="/portal" replace />} />
          <Route path="/portal" element={<Dashboard />} />
          <Route path="/portal/billing" element={<Billing />} />
          <Route path="/portal/seo" element={<SeoStatus />} />
          <Route path="/portal/account" element={<Account />} />
          <Route path="*" element={<Navigate to="/portal" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  </BrowserRouter>
);

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
