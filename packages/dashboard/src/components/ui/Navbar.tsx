import React from "react";
import { Link, useLocation } from "react-router-dom";

export const Navbar: React.FC = () => {
  const { pathname } = useLocation();
  const active = (path: string) =>
    pathname.startsWith(path) ? "text-blue-600" : "text-gray-700";

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container flex items-center justify-between py-3">
        <Link to="/" className="text-xl font-bold text-gray-900">
          MarketBrewer Dashboard
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/" className={`${active("/")} hover:text-blue-700`}>
            Create Job
          </Link>
          <Link to="/jobs" className={`${active("/jobs")} hover:text-blue-700`}>
            Jobs
          </Link>
          <Link
            to="/dashboard"
            className={`${active("/dashboard")} hover:text-blue-700`}
          >
            Dashboard
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
