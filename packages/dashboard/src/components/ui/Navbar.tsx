import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useI18n } from "../../contexts/I18nContext";

export const Navbar: React.FC = () => {
  const { pathname } = useLocation();
  const isDashboard =
    pathname.startsWith("/dashboard") || pathname.startsWith("/jobs");
  const { user, signOut } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

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
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className={`transition-colors duration-200 ${
                isDashboard
                  ? "text-metro-orange"
                  : "text-dark-300 hover:text-metro-orange"
              }`}
            >
              {t("nav.dashboard")}
            </Link>
            <Link
              to="/coding"
              className={`transition-colors duration-200 ${
                pathname.startsWith("/coding")
                  ? "text-metro-orange"
                  : "text-dark-300 hover:text-metro-orange"
              }`}
            >
              Coding Agents
            </Link>
            <div className="flex items-center gap-2 text-xs text-dark-400">
              <span>{t("auth.language")}</span>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as "en" | "es")}
                className="bg-dark-800 border border-dark-600 rounded px-2 py-1 text-dark-200 focus:outline-none focus:border-metro-orange"
                aria-label="Select language"
              >
                <option value="en">EN</option>
                <option value="es">ES</option>
              </select>
            </div>
            {googleClientId && user ? (
              <div className="flex items-center gap-3 text-xs text-dark-300">
                <span>{user.email}</span>
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    window.google?.accounts?.id?.disableAutoSelect?.();
                  }}
                  className="rounded-full border border-dark-600 px-3 py-1 text-dark-200 hover:border-metro-orange hover:text-metro-orange transition-colors"
                >
                  {t("auth.signOut")}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
