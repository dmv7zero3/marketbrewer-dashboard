import React, { useEffect, useState } from "react";
import { DashboardLayout } from "./DashboardLayout";
import { useBusiness } from "../../contexts/BusinessContext";
import { useToast } from "../../contexts/ToastContext";
import {
  getBusiness,
  updateBusiness,
  getQuestionnaire,
  updateQuestionnaire,
} from "../../api/businesses";
import {
  validateBusinessName,
  validateIndustry,
  validateURL,
  validatePhone,
  validateEmail,
} from "../../lib/validation";
import type { Business, Questionnaire } from "@marketbrewer/shared";

export const BusinessProfile: React.FC = () => {
  const { selectedBusiness } = useBusiness();
  const { addToast } = useToast();
  const [business, setBusiness] = useState<Business | null>(null);
  const [questionnaire, setQuestionnaire] = useState<
    (Questionnaire & { data: Record<string, unknown> }) | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [savingBiz, setSavingBiz] = useState(false);
  const [savingQ, setSavingQ] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qText, setQText] = useState<string>("{}");
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string | null>
  >({
    name: null,
    industry: null,
    website: null,
    phone: null,
    email: null,
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!selectedBusiness) return;
      try {
        setLoading(true);
        setError(null);
        const [{ business }, { questionnaire }] = await Promise.all([
          getBusiness(selectedBusiness),
          getQuestionnaire(selectedBusiness),
        ]);
        if (!mounted) return;
        setBusiness(business);
        setQuestionnaire(questionnaire);
        setQText(JSON.stringify(questionnaire.data ?? {}, null, 2));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load profile";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    setBusiness(null);
    setQuestionnaire(null);
    setQText("{}");
    setValidationErrors({
      name: null,
      industry: null,
      website: null,
      phone: null,
      email: null,
    });
    load();
    return () => {
      mounted = false;
    };
  }, [selectedBusiness]);

  const handleBizChange = (field: keyof Business, value: string) => {
    if (!business) return;
    setBusiness({ ...business, [field]: value });
    // Clear validation error for this field as user corrects it
    setValidationErrors((prev) => ({
      ...prev,
      [field]: null,
    }));
  };

  const validateBusinessForm = (): boolean => {
    const errors: Record<string, string | null> = {
      name: validateBusinessName(business?.name ?? ""),
      industry: validateIndustry(business?.industry ?? ""),
      website: validateURL(business?.website ?? ""),
      phone: validatePhone(business?.phone ?? ""),
      email: validateEmail(business?.email ?? ""),
    };

    const hasErrors = Object.values(errors).some((err) => err !== null);
    if (hasErrors) {
      setValidationErrors(errors);
      const errorMessages = Object.values(errors).filter((e) => e !== null);
      addToast(errorMessages.join("; "), "error", 5000);
    }
    return !hasErrors;
  };

  const handleSaveBusiness = async () => {
    if (!selectedBusiness || !business) return;

    if (!validateBusinessForm()) return;

    try {
      setSavingBiz(true);
      setError(null);
      const payload = {
        name: business.name,
        industry: business.industry,
        website: business.website ?? null,
        phone: business.phone ?? null,
        email: business.email ?? null,
      };
      const { business: updated } = await updateBusiness(
        selectedBusiness,
        payload
      );
      setBusiness(updated);
      addToast("Business profile saved successfully", "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save business";
      setError(msg);
      addToast(msg, "error", 5000);
    } finally {
      setSavingBiz(false);
    }
  };

  const handleSaveQuestionnaire = async () => {
    if (!selectedBusiness) return;
    try {
      setSavingQ(true);
      setError(null);
      let dataObj: Record<string, unknown> = {};
      try {
        dataObj = JSON.parse(qText || "{}");
      } catch (parseErr) {
        addToast("Questionnaire JSON is invalid", "error", 5000);
        setSavingQ(false);
        return;
      }
      const { questionnaire: updated } = await updateQuestionnaire(
        selectedBusiness,
        dataObj
      );
      setQuestionnaire(updated);
      setQText(JSON.stringify(updated.data ?? {}, null, 2));
      addToast("Questionnaire saved successfully", "success");
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to save questionnaire";
      setError(msg);
      addToast(msg, "error", 5000);
    } finally {
      setSavingQ(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Business Profile</h1>
        {!selectedBusiness ? (
          <p className="text-gray-600">
            Select a business to manage its profile.
          </p>
        ) : loading ? (
          <p className="text-gray-500">Loading profile...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Business details */}
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">Details</h2>
              <label className="block text-sm font-medium">Name</label>
              <input
                className={`border rounded px-2 py-1 w-full ${
                  validationErrors.name ? "border-red-500" : ""
                }`}
                value={business?.name ?? ""}
                onChange={(e) => handleBizChange("name", e.target.value)}
              />
              {validationErrors.name && (
                <p className="text-red-600 text-xs">{validationErrors.name}</p>
              )}
              <label className="block text-sm font-medium">Industry</label>
              <input
                className={`border rounded px-2 py-1 w-full ${
                  validationErrors.industry ? "border-red-500" : ""
                }`}
                value={business?.industry ?? ""}
                onChange={(e) => handleBizChange("industry", e.target.value)}
              />
              {validationErrors.industry && (
                <p className="text-red-600 text-xs">
                  {validationErrors.industry}
                </p>
              )}
              <label className="block text-sm font-medium">Website</label>
              <input
                className={`border rounded px-2 py-1 w-full ${
                  validationErrors.website ? "border-red-500" : ""
                }`}
                value={business?.website ?? ""}
                onChange={(e) => handleBizChange("website", e.target.value)}
              />
              {validationErrors.website && (
                <p className="text-red-600 text-xs">
                  {validationErrors.website}
                </p>
              )}
              <label className="block text-sm font-medium">Phone</label>
              <input
                className={`border rounded px-2 py-1 w-full ${
                  validationErrors.phone ? "border-red-500" : ""
                }`}
                value={business?.phone ?? ""}
                onChange={(e) => handleBizChange("phone", e.target.value)}
              />
              {validationErrors.phone && (
                <p className="text-red-600 text-xs">{validationErrors.phone}</p>
              )}
              <label className="block text-sm font-medium">Email</label>
              <input
                className={`border rounded px-2 py-1 w-full ${
                  validationErrors.email ? "border-red-500" : ""
                }`}
                value={business?.email ?? ""}
                onChange={(e) => handleBizChange("email", e.target.value)}
              />
              {validationErrors.email && (
                <p className="text-red-600 text-xs">{validationErrors.email}</p>
              )}
              <button
                className="mt-2 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-blue-700"
                onClick={handleSaveBusiness}
                disabled={savingBiz}
              >
                {savingBiz ? "Saving..." : "Save Profile"}
              </button>
            </div>

            {/* Questionnaire */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Questionnaire</h2>
                {questionnaire && (
                  <span className="text-sm text-gray-600">
                    Completeness: {questionnaire.completeness_score}%
                  </span>
                )}
              </div>
              <textarea
                className="border rounded px-2 py-1 w-full min-h-[240px] font-mono text-sm"
                value={qText}
                onChange={(e) => setQText(e.target.value)}
              />
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-blue-700"
                onClick={handleSaveQuestionnaire}
                disabled={savingQ}
              >
                {savingQ ? "Saving..." : "Save Questionnaire"}
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BusinessProfile;
