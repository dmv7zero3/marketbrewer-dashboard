import React, { useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useBusiness } from "../../contexts/BusinessContext";
import { useI18n } from "../../contexts/I18nContext";
import { AddBusinessModal } from "./AddBusinessModal";

type MenuItem = {
  title: string;
  path: string;
  children?: Array<{ title: string; path: string }>;
};

type SidebarProps = {
  onNavigate?: () => void;
};

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
  const { businesses, selectedBusiness, setSelectedBusiness, loading, uiLabels } =
    useBusiness();
  const { t } = useI18n();

  // Build menu items with dynamic labels based on industry
  const menuItems: MenuItem[] = useMemo(() => [
    { title: t("nav.businessProfile"), path: "/dashboard/business-profile" },
    { title: t("nav.storeLocations"), path: "/dashboard/locations" },
    { title: uiLabels.keywordsLabel, path: "/dashboard/keywords" },
    { title: uiLabels.servicesLabel, path: "/dashboard/services" },
    { title: t("nav.serviceAreas"), path: "/dashboard/service-areas" },
    { title: t("nav.prompts"), path: "/dashboard/prompts" },
    { title: t("nav.generateContent"), path: "/dashboard/page-content-generation" },
    { title: t("nav.jobs"), path: "/jobs" },
    { title: t("nav.webhooks"), path: "/dashboard/webhooks" },
    { title: t("nav.dataStorage"), path: "/dashboard/data-storage" },
    { title: t("nav.roadmap"), path: "/dashboard/roadmap" },
    { title: t("nav.aws"), path: "/dashboard/aws-infrastructure" },
  ], [t, uiLabels]);
  const { pathname } = useLocation();
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <aside className="w-64 border-r border-dark-700 bg-dark-900 h-full md:h-[calc(100vh-68px)] md:sticky md:top-[68px]">
      <div className="p-4 space-y-3 border-b border-dark-700">
        <label
          htmlFor="business-selector"
          className="block text-sm font-semibold text-dark-300"
        >
          {t("nav.businessLabel")}
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
            onNavigate?.();
          }}
          disabled={loading}
        >
          <option value="">{t("nav.selectBusiness")}</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
          <option value="__ADD__">{t("nav.addBusiness")}</option>
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
                onClick={() => onNavigate?.()}
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
                        onClick={() => onNavigate?.()}
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
