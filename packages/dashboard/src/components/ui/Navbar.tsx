import React from "react";
import { Link, useLocation } from "react-router-dom";

export const Navbar: React.FC = () => {
  const { pathname } = useLocation();
  const isDashboard =
    pathname.startsWith("/dashboard") || pathname.startsWith("/jobs");

  return (
    <>
      {/* Metro stripe at the very top */}
      <div className="metro-stripe" />
      <nav className="bg-dark-900 border-b border-dark-700">
        <div className="container flex items-center justify-between py-3">
          <Link to="/dashboard" className="text-xl font-bold text-dark-50 flex items-center gap-1">
            <span className="text-dark-50">Market</span>
            <span className="text-metro-orange">Brewer</span>
            <span className="text-dark-400 font-normal ml-2 text-sm">SEO Platform</span>
          </Link>
          <Link
            to="/dashboard"
            className={`transition-colors duration-200 ${
              isDashboard
                ? "text-metro-orange"
                : "text-dark-300 hover:text-metro-orange"
            }`}
          >
            Dashboard
          </Link>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
