import React, { createContext, useContext, useMemo, useState } from "react";

const STORAGE_KEY = "dashboard-locale";

const MESSAGES = {
  en: {
    "nav.dashboard": "Dashboard",
    "nav.businessProfile": "Business Profile",
    "nav.storeLocations": "Store Locations",
    "nav.serviceAreas": "Service Areas",
    "nav.prompts": "Prompts",
    "nav.generateContent": "Generate Content",
    "nav.jobs": "Jobs",
    "nav.roadmap": "Roadmap",
    "nav.aws": "AWS Infrastructure",
    "nav.webhooks": "Webhooks",
    "nav.dataStorage": "Data Storage",
    "nav.businessLabel": "Business",
    "nav.selectBusiness": "Select a business",
    "nav.addBusiness": "+ Add Business",
    "auth.signOut": "Sign out",
    "auth.language": "Language",
  },
  es: {
    "nav.dashboard": "Panel",
    "nav.businessProfile": "Perfil de negocio",
    "nav.storeLocations": "Ubicaciones",
    "nav.serviceAreas": "Areas de servicio",
    "nav.prompts": "Prompts",
    "nav.generateContent": "Generar contenido",
    "nav.jobs": "Trabajos",
    "nav.roadmap": "Hoja de ruta",
    "nav.aws": "Infraestructura AWS",
    "nav.webhooks": "Webhooks",
    "nav.dataStorage": "Almacen de datos",
    "nav.businessLabel": "Negocio",
    "nav.selectBusiness": "Selecciona un negocio",
    "nav.addBusiness": "+ Agregar negocio",
    "auth.signOut": "Cerrar sesion",
    "auth.language": "Idioma",
  },
} as const;

type Locale = keyof typeof MESSAGES;
type MessageKey = keyof typeof MESSAGES.en;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

/** Provides locale state and translation helper for the dashboard. */
export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") {
      return "en";
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "es" ? "es" : "en";
  });

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, nextLocale);
    }
  };

  const value = useMemo<I18nContextValue>(() => {
    const dictionary = MESSAGES[locale] || MESSAGES.en;
    return {
      locale,
      setLocale,
      t: (key) => dictionary[key] || MESSAGES.en[key] || key,
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

/**
 * Access the i18n context.
 * Must be used within {@link I18nProvider}.
 */
export const useI18n = (): I18nContextValue => {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
};
