import React, { useEffect, useState } from "react";
import { DashboardLayout } from "./DashboardLayout";
import { QuestionnaireForm } from "./QuestionnaireForm";
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
import type {
  Business,
  Questionnaire,
  QuestionnaireDataStructure,
} from "@marketbrewer/shared";
import { createEmptyQuestionnaire } from "@marketbrewer/shared";

export const BusinessProfile: React.FC = () => {
  const { selectedBusiness } = useBusiness();
  const { addToast } = useToast();

  // Business form state
  const [business, setBusiness] = useState<Business | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string | null>
  >({
    name: null,
    industry: null,
    website: null,
    phone: null,
    email: null,
  });

  // Questionnaire form state
  const [questionnaireData, setQuestionnaireData] =
    useState<QuestionnaireDataStructure>(createEmptyQuestionnaire());
  const [originalQuestionnaireData, setOriginalQuestionnaireData] =
    useState<QuestionnaireDataStructure>(createEmptyQuestionnaire());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [savingBiz, setSavingBiz] = useState(false);
  const [savingQ, setSavingQ] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

        // Parse questionnaire data with fallback to empty structure
        let parsedData: QuestionnaireDataStructure = createEmptyQuestionnaire();
        try {
          const rawData = questionnaire.data as unknown;
          if (rawData && typeof rawData === "object") {
            parsedData = rawData as QuestionnaireDataStructure;
          }
        } catch (e) {
          console.error("Failed to parse questionnaire data:", e);
        }

        setQuestionnaireData(parsedData);
        setOriginalQuestionnaireData(parsedData);
        setHasUnsavedChanges(false);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load profile";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    // Reset state when business changes
    setBusiness(null);
    setQuestionnaireData(createEmptyQuestionnaire());
    setOriginalQuestionnaireData(createEmptyQuestionnaire());
    setHasUnsavedChanges(false);
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
      await updateQuestionnaire(selectedBusiness, questionnaireData);
      setOriginalQuestionnaireData(questionnaireData);
      setHasUnsavedChanges(false);
      addToast("Profile saved successfully", "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save profile";
      setError(msg);
      addToast(msg, "error", 5000);
    } finally {
      setSavingQ(false);
    }
  };

  const handleQuestionnaireDataChange = (
    newData: QuestionnaireDataStructure
  ) => {
    setQuestionnaireData(newData);
    // Check if data differs from original
    const hasChanges =
      JSON.stringify(newData) !== JSON.stringify(originalQuestionnaireData);
    setHasUnsavedChanges(hasChanges);
  };

  const handleCancelQuestionnaire = () => {
    setQuestionnaireData(originalQuestionnaireData);
    setHasUnsavedChanges(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Business Profile</h1>
          <p className="text-gray-600">
            Manage your business information and profile details for content
            generation.
          </p>
        </div>

        {!selectedBusiness ? (
          <p className="text-gray-600 bg-blue-50 border border-blue-200 rounded p-4">
            Select a business from the sidebar to manage its profile.
          </p>
        ) : loading ? (
          <p className="text-gray-500">Loading profile...</p>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded p-4 text-red-600">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Business Details Section */}
            <div className="lg:col-span-1 border rounded-lg p-6 bg-white shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Core Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Business Name *
                  </label>
                  <input
                    className={`border rounded px-3 py-2 w-full ${
                      validationErrors.name ? "border-red-500" : ""
                    }`}
                    value={business?.name ?? ""}
                    onChange={(e) =>
                      setBusiness(
                        business ? { ...business, name: e.target.value } : null
                      )
                    }
                    onBlur={() => {
                      // Clear validation error as user corrects it
                      setValidationErrors((prev) => ({
                        ...prev,
                        name: null,
                      }));
                    }}
                    placeholder="Your business name"
                  />
                  {validationErrors.name && (
                    <p className="text-red-600 text-xs mt-1">
                      {validationErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Industry *
                  </label>
                  <input
                    className={`border rounded px-3 py-2 w-full ${
                      validationErrors.industry ? "border-red-500" : ""
                    }`}
                    value={business?.industry ?? ""}
                    onChange={(e) =>
                      setBusiness(
                        business
                          ? { ...business, industry: e.target.value }
                          : null
                      )
                    }
                    placeholder="e.g., Restaurant, Plumbing"
                  />
                  {validationErrors.industry && (
                    <p className="text-red-600 text-xs mt-1">
                      {validationErrors.industry}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Website
                  </label>
                  <input
                    className={`border rounded px-3 py-2 w-full ${
                      validationErrors.website ? "border-red-500" : ""
                    }`}
                    value={business?.website ?? ""}
                    onChange={(e) =>
                      setBusiness(
                        business
                          ? { ...business, website: e.target.value }
                          : null
                      )
                    }
                    placeholder="https://example.com"
                  />
                  {validationErrors.website && (
                    <p className="text-red-600 text-xs mt-1">
                      {validationErrors.website}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Phone
                  </label>
                  <input
                    className={`border rounded px-3 py-2 w-full ${
                      validationErrors.phone ? "border-red-500" : ""
                    }`}
                    value={business?.phone ?? ""}
                    onChange={(e) =>
                      setBusiness(
                        business ? { ...business, phone: e.target.value } : null
                      )
                    }
                    placeholder="(555) 123-4567"
                  />
                  {validationErrors.phone && (
                    <p className="text-red-600 text-xs mt-1">
                      {validationErrors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Email
                  </label>
                  <input
                    className={`border rounded px-3 py-2 w-full ${
                      validationErrors.email ? "border-red-500" : ""
                    }`}
                    value={business?.email ?? ""}
                    onChange={(e) =>
                      setBusiness(
                        business ? { ...business, email: e.target.value } : null
                      )
                    }
                    placeholder="contact@example.com"
                  />
                  {validationErrors.email && (
                    <p className="text-red-600 text-xs mt-1">
                      {validationErrors.email}
                    </p>
                  )}
                </div>

                <button
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
                  onClick={handleSaveBusiness}
                  disabled={savingBiz}
                >
                  {savingBiz ? "Saving..." : "Save Details"}
                </button>
              </div>
            </div>

            {/* Questionnaire Section */}
            <div className="lg:col-span-2 border rounded-lg p-6 bg-white shadow-sm">
              <QuestionnaireForm
                data={questionnaireData}
                onDataChange={handleQuestionnaireDataChange}
                onSave={handleSaveQuestionnaire}
                onCancel={handleCancelQuestionnaire}
                isSaving={savingQ}
                isLoading={loading}
                hasUnsavedChanges={hasUnsavedChanges}
              />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BusinessProfile;
