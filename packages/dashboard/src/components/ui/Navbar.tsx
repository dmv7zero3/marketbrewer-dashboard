import React from "react";
import { Link, useLocation } from "react-router-dom";

export const Navbar: React.FC = () => {
  const { pathname } = useLocation();
  const isDashboard =
    pathname.startsWith("/dashboard") || pathname.startsWith("/jobs");

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container flex items-center justify-between py-3">
        <Link to="/dashboard" className="text-xl font-bold text-gray-900">
          MarketBrewer Dashboard
        </Link>
        <Link
          to="/dashboard"
          className={`hover:text-blue-700 ${
            isDashboard ? "text-blue-600" : "text-gray-700"
          }`}
        >
          Dashboard
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
