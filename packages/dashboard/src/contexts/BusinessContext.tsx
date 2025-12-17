import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getBusinesses } from "../api/businesses";
import type { Business } from "@marketbrewer/shared";

interface BusinessContextValue {
  businesses: Business[];
  selectedBusiness: string | null;
  setSelectedBusiness: (id: string | null) => void;
  loading: boolean;
  error: string | null;
}

const BusinessContext = createContext<BusinessContextValue | undefined>(
  undefined
);

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const saved = localStorage.getItem("selectedBusiness");
        const { businesses } = await getBusinesses();
        if (!mounted) return;
        setBusinesses(businesses);
        // Restore selection if valid
        const initial =
          businesses.find((b) => b.id === saved)?.id ||
          businesses[0]?.id ||
          null;
        setSelectedBusiness(initial ?? null);
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Failed to load businesses";
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setSelection = (id: string | null) => {
    setSelectedBusiness(id);
    if (id) {
      localStorage.setItem("selectedBusiness", id);
    } else {
      localStorage.removeItem("selectedBusiness");
    }
  };

  const value = useMemo<BusinessContextValue>(
    () => ({
      businesses,
      selectedBusiness,
      setSelectedBusiness: setSelection,
      loading,
      error,
    }),
    [businesses, selectedBusiness, loading, error]
  );

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = (): BusinessContextValue => {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness must be used within BusinessProvider");
  return ctx;
};
