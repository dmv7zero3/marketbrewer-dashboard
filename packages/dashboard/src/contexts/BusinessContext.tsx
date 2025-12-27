import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  useState,
} from "react";
import { createBusiness, getBusinesses } from "../api/businesses";
import type { Business } from "@marketbrewer/shared";
import { getIndustryUILabels, type IndustryUILabels } from "@marketbrewer/shared";

interface BusinessContextValue {
  businesses: Business[];
  selectedBusiness: string | null;
  selectedBusinessData: Business | null;
  uiLabels: IndustryUILabels;
  setSelectedBusiness: (id: string | null) => void;
  loading: boolean;
  error: string | null;
  addBusiness: (data: {
    name: string;
    industry: string;
    website?: string;
    phone?: string;
    email?: string;
  }) => Promise<Business>;
  refreshBusinesses: () => Promise<void>;
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
        // Restore selection if valid; clear localStorage if saved business no longer exists
        const initial =
          businesses.find((b) => b.id === saved)?.id ||
          businesses[0]?.id ||
          null;
        // Clean up stale localStorage entry if saved business was deleted
        if (!initial || !businesses.find((b) => b.id === saved)) {
          localStorage.removeItem("selectedBusiness");
        }
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

  const addBusiness = useCallback(
    async (data: {
      name: string;
      industry: string;
      website?: string;
      phone?: string;
      email?: string;
    }): Promise<Business> => {
      const { business } = await createBusiness(data);
      setBusinesses((prev) => [...prev, business]);
      return business;
    },
    []
  );

  const refreshBusinesses = useCallback(async (): Promise<void> => {
    try {
      const { businesses } = await getBusinesses();
      setBusinesses(businesses);
    } catch (e) {
      console.error("Failed to refresh businesses", e);
    }
  }, []);

  // Compute selected business data and UI labels
  const selectedBusinessData = useMemo(
    () => businesses.find((b) => b.id === selectedBusiness) ?? null,
    [businesses, selectedBusiness]
  );

  const uiLabels = useMemo(
    () => getIndustryUILabels(selectedBusinessData?.industry_type),
    [selectedBusinessData]
  );

  const value = useMemo<BusinessContextValue>(
    () => ({
      businesses,
      selectedBusiness,
      selectedBusinessData,
      uiLabels,
      setSelectedBusiness: setSelection,
      loading,
      error,
      addBusiness,
      refreshBusinesses,
    }),
    [
      businesses,
      selectedBusiness,
      selectedBusinessData,
      uiLabels,
      loading,
      error,
      addBusiness,
      refreshBusinesses,
    ]
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
