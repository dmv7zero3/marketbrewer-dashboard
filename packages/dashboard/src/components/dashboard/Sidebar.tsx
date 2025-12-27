import React, { useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useBusiness } from "../../contexts/BusinessContext";
import { AddBusinessModal } from "./AddBusinessModal";

type MenuItem = {
  title: string;
  path: string;
  children?: Array<{ title: string; path: string }>;
};

export const Sidebar: React.FC = () => {
  const { businesses, selectedBusiness, setSelectedBusiness, loading, uiLabels } =
    useBusiness();

  // Build menu items with dynamic labels based on industry
  const menuItems: MenuItem[] = useMemo(() => [
    { title: "Business Profile", path: "/dashboard/business-profile" },
    { title: "Store Locations", path: "/dashboard/locations" },
    { title: uiLabels.keywordsLabel, path: "/dashboard/keywords" },
    { title: uiLabels.servicesLabel, path: "/dashboard/services" },
    { title: "Service Areas", path: "/dashboard/service-areas" },
    { title: "Prompts", path: "/dashboard/prompts" },
    { title: "Generate Content", path: "/dashboard/page-content-generation" },
    { title: "Jobs", path: "/jobs" },
  ], [uiLabels]);
  const { pathname } = useLocation();
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <aside className="w-64 border-r border-dark-700 bg-dark-900 h-[calc(100vh-68px)] sticky top-[68px]">
      <div className="p-4 space-y-3 border-b border-dark-700">
        <label
          htmlFor="business-selector"
          className="block text-sm font-semibold text-dark-300"
        >
          Business
        </label>
        <select
          id="business-selector"
          aria-label="Select business"
          className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-dark-100
                     focus:outline-none focus:border-metro-orange focus:ring-1 focus:ring-metro-orange
                     transition-colors duration-200"
          value={selectedBusiness ?? ""}
          onChange={(e) => {
            if (e.target.value === "__ADD__") {
              setShowAddModal(true);
              return;
            }
            setSelectedBusiness(e.target.value || null);
          }}
          disabled={loading}
        >
          <option value="">Select a business</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
          <option value="__ADD__">+ Add Business</option>
        </select>
      </div>

      <nav className="p-2 space-y-1" aria-label="Dashboard navigation">
        {menuItems.map((item) => {
          const active =
            pathname === item.path || pathname.startsWith(item.path + "/");
          return (
            <div key={item.path}>
              <Link
                to={item.path}
                className={`block px-3 py-2 rounded-lg transition-all duration-200 ${
                  active
                    ? "bg-metro-orange/10 text-metro-orange border-l-2 border-metro-orange"
                    : "text-dark-300 hover:bg-dark-800 hover:text-dark-100"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {item.title}
              </Link>
              {/* Submenu support reserved for Phase 2 */}
              {active && item.children && (
                <div
                  className="ml-4 mt-1 space-y-1"
                  aria-label={`${item.title} submenu`}
                >
                  {item.children.map((child) => {
                    const childActive = pathname === child.path;
                    return (
                      <Link
                        key={child.path}
                        to={child.path}
                        className={`block px-3 py-2 rounded-lg transition-all duration-200 ${
                          childActive
                            ? "bg-metro-orange/5 text-metro-orange"
                            : "text-dark-400 hover:bg-dark-800 hover:text-dark-200"
                        }`}
                        aria-current={childActive ? "page" : undefined}
                      >
                        {child.title}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <AddBusinessModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </aside>
  );
};

export default Sidebar;
