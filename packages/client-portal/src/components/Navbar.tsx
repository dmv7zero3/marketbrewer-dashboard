import React from "react";
import { NavLink } from "react-router-dom";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition ${
    isActive ? "bg-dark-800 text-white" : "text-slate-300 hover:text-white"
  }`;

export const Navbar: React.FC = () => (
  <header className="border-b border-dark-800 bg-dark-900">
    <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
      <div>
        <div className="text-lg font-semibold">MarketBrewer Client Portal</div>
        <div className="text-xs text-slate-400">SEO + Billing + Reporting</div>
      </div>
      <nav className="flex gap-2">
        <NavLink to="/portal" className={linkClass} end>
          Overview
        </NavLink>
        <NavLink to="/portal/seo" className={linkClass}>
          SEO Status
        </NavLink>
        <NavLink to="/portal/billing" className={linkClass}>
          Billing
        </NavLink>
        <NavLink to="/portal/account" className={linkClass}>
          Account
        </NavLink>
      </nav>
    </div>
  </header>
);
