import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useBusiness } from "../../contexts/BusinessContext";
import { AddBusinessModal } from "./AddBusinessModal";

type MenuItem = {
  title: string;
  path: string;
  children?: Array<{ title: string; path: string }>;
};

const menuItems: MenuItem[] = [
  { title: "Overview", path: "/dashboard" },
  { title: "Jobs", path: "/jobs" },
  { title: "Business Profile", path: "/dashboard/business-profile" },
  { title: "Prompts", path: "/dashboard/prompts" },
  { title: "SEO Keywords", path: "/dashboard/keywords" },
  { title: "Service Areas", path: "/dashboard/service-areas" },

  { title: "Generate Content", path: "/dashboard/page-content-generation" },
];

export const Sidebar: React.FC = () => {
  const { businesses, selectedBusiness, setSelectedBusiness, loading } =
    useBusiness();
  const { pathname } = useLocation();
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <aside className="w-64 border-r bg-white h-[calc(100vh-64px)] sticky top-16">
      <div className="p-4 space-y-3 border-b">
        <label
          htmlFor="business-selector"
          className="block text-sm font-semibold"
        >
          Business
        </label>
        <select
          id="business-selector"
          aria-label="Select business"
          className="w-full border rounded px-2 py-1"
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
          <option value="__ADD__">➕ Add Business</option>
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
                className={`block px-3 py-2 rounded ${
                  active
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
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
                        className={`block px-3 py-2 rounded ${
                          childActive
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-700 hover:bg-gray-50"
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
