import React, { useState, useEffect, useCallback } from "react";
import {
  BusinessHoursForm,
  type BusinessHoursInput,
} from "./BusinessHoursForm";
import {
  getBusinessHours,
  updateBusinessHours,
} from "../../../api/business-profile";
import { useToast } from "../../../contexts/ToastContext";
import type { DayOfWeek } from "@marketbrewer/shared";

// Helper to capitalize day name (e.g., "monday" -> "Monday")
const capitalizeDayOfWeek = (day: string): DayOfWeek => {
  return (day.charAt(0).toUpperCase() + day.slice(1).toLowerCase()) as DayOfWeek;
};

// Helper to lowercase day name for API (e.g., "Monday" -> "monday")
const lowercaseDayOfWeek = (day: string): string => {
  return day.toLowerCase();
};

interface BusinessHoursTabProps {
  businessId: string;
  isLoading: boolean;
  isSaving: boolean;
}

export const LocationsAndHoursTab: React.FC<BusinessHoursTabProps> = ({
  businessId,
  isLoading,
  isSaving,
}) => {
  const { addToast } = useToast();
  const [hours, setHours] = useState<BusinessHoursInput[]>([]);
  const [originalHours, setOriginalHours] = useState<BusinessHoursInput[]>([]);
  const [loadingHours, setLoadingHours] = useState(false);
  const [savingHours, setSavingHours] = useState(false);

  // Load hours from API
  const loadHours = useCallback(async () => {
    if (!businessId) return;
    try {
      setLoadingHours(true);
      const response = await getBusinessHours(businessId);
      // Map API response (lowercase days) to form format (capitalized days)
      const mapped: BusinessHoursInput[] = response.hours.map((h) => ({
        day_of_week: capitalizeDayOfWeek(h.day_of_week),
        opens: h.opens ?? null,
        closes: h.closes ?? null,
        is_closed: Boolean(h.is_closed),
      }));
      setHours(mapped);
      setOriginalHours(mapped);
    } catch (error) {
      console.error("Failed to load business hours:", error);
      addToast("Failed to load business hours", "error");
    } finally {
      setLoadingHours(false);
    }
  }, [businessId, addToast]);

  useEffect(() => {
    loadHours();
  }, [loadHours]);

  // Save hours to API
  const handleSaveHours = async () => {
    if (!businessId) return;
    try {
      setSavingHours(true);
      // Convert capitalized days back to lowercase for API
      const apiHours = hours.map((h) => ({
        day_of_week: lowercaseDayOfWeek(h.day_of_week) as DayOfWeek,
        opens: h.opens,
        closes: h.closes,
        is_closed: h.is_closed,
      }));
      await updateBusinessHours(businessId, apiHours);
      setOriginalHours(hours);
      addToast("Business hours saved", "success");
    } catch (error) {
      console.error("Failed to save business hours:", error);
      addToast("Failed to save business hours", "error");
    } finally {
      setSavingHours(false);
    }
  };

  // Check if hours have changed
  const hoursChanged = JSON.stringify(hours) !== JSON.stringify(originalHours);

  return (
    <div className="space-y-8">
      {/* Business Hours Section */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Business Hours
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Set your general operating hours for each day of the week. Helps
          customers know when you're available.
        </p>
        {loadingHours ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <BusinessHoursForm
              value={hours}
              disabled={isSaving || savingHours}
              onChange={setHours}
            />
            {hoursChanged && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleSaveHours}
                  disabled={savingHours}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingHours ? "Saving..." : "Save Hours"}
                </button>
                <button
                  onClick={() => setHours(originalHours)}
                  disabled={savingHours}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default LocationsAndHoursTab;
