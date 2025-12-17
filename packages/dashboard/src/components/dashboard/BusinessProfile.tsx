import React, { useEffect, useState, useMemo, useRef } from "react";
import { DashboardLayout } from "./DashboardLayout";
import { QuestionnaireForm } from "./QuestionnaireForm";
import { ValidationSummary } from "./ValidationSummary";
import { CompletenessRing } from "./CompletenessRing";
import { StickyFooter } from "./StickyFooter";
import { useBusiness } from "../../contexts/BusinessContext";
import { useToast } from "../../contexts/ToastContext";
import { safeDeepMerge } from "../../lib/safe-deep-merge";
import { deepEqual } from "../../lib/deep-equal";
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
  QuestionnaireDataStructure,
} from "@marketbrewer/shared";
import { createEmptyQuestionnaire } from "@marketbrewer/shared";

export const BusinessProfile: React.FC = () => {
  const { selectedBusiness } = useBusiness();
  const { addToast } = useToast();

  // Business form state
  const [business, setBusiness] = useState<Business | null>(null);
  const [originalBusiness, setOriginalBusiness] = useState<Business | null>(
    null
  );
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
  const [questionnaireDirty, setQuestionnaireDirty] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [savingBiz, setSavingBiz] = useState(false);
  const [savingQ, setSavingQ] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completenessScore, setCompletenessScore] = useState<number>(0);
  const [bulkAreasLoading, setBulkAreasLoading] = useState(false);

  // Refs for DOM manipulation
  const validationSummaryRef = useRef<HTMLDivElement>(null);
  const saveTargetRef = useRef<string | null>(null);

  // Compute unified dirty state
  const businessDirty = useMemo(() => {
    return business && originalBusiness
      ? !deepEqual(business, originalBusiness)
      : false;
  }, [business, originalBusiness]);

  const hasAnyUnsavedChanges = useMemo(
    () => businessDirty || questionnaireDirty,
    [businessDirty, questionnaireDirty]
  );

  const isSavingAny = useMemo(() => savingBiz || savingQ, [savingBiz, savingQ]);

  // Global unsaved changes warning on page exit
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasAnyUnsavedChanges || bulkAreasLoading) {
        e.preventDefault();
        e.returnValue =
          hasAnyUnsavedChanges && bulkAreasLoading
            ? "You have unsaved changes and a bulk operation in progress."
            : hasAnyUnsavedChanges
            ? "You have unsaved changes."
            : "A bulk operation is in progress.";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasAnyUnsavedChanges, bulkAreasLoading]);

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
        setOriginalBusiness(business);

        // Parse questionnaire data with fallback to empty structure and safe deep merge
        let parsedData: QuestionnaireDataStructure = createEmptyQuestionnaire();
        try {
          const rawData = questionnaire.data as unknown;
          if (rawData && typeof rawData === "object") {
            // Use safe deep merge to prevent null/undefined issues
            parsedData = safeDeepMerge(
              parsedData,
              rawData as Partial<QuestionnaireDataStructure>
            );
          }
        } catch (e) {
          console.error("Failed to parse questionnaire data:", e);
        }

        setQuestionnaireData(parsedData);
        setOriginalQuestionnaireData(parsedData);
        setQuestionnaireDirty(false);
        setCompletenessScore(questionnaire.completeness_score ?? 0);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load profile";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    // Reset state when business changes
    setBusiness(null);
    setOriginalBusiness(null);
    setQuestionnaireData(createEmptyQuestionnaire());
    setOriginalQuestionnaireData(createEmptyQuestionnaire());
    setQuestionnaireDirty(false);
    setCompletenessScore(0);
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

  // note: business field changes and validation are handled inline in inputs below

  const handleSaveQuestionnaire = async () => {
    if (!selectedBusiness) return;
    try {
      setSavingQ(true);
      setError(null);
      const response = await updateQuestionnaire(
        selectedBusiness,
        questionnaireData
      );
      setOriginalQuestionnaireData(questionnaireData);
      setQuestionnaireDirty(false);
      setCompletenessScore(response.questionnaire.completeness_score ?? 0);
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
    const hasChanges = !deepEqual(newData, originalQuestionnaireData);
    setQuestionnaireDirty(hasChanges);
  };

  const handleCancelQuestionnaire = () => {
    setQuestionnaireData(originalQuestionnaireData);
    setQuestionnaireDirty(false);
  };

  // Handle save all (business + questionnaire)
  const handleSaveAll = async () => {
    const allErrors: Array<{
      field: string;
      message: string;
      section: string;
    }> = [];

    // Validate business form
    if (businessDirty) {
      const errors: Record<string, string | null> = {
        name: validateBusinessName(business?.name ?? ""),
        industry: validateIndustry(business?.industry ?? ""),
        website: validateURL(business?.website ?? ""),
        phone: validatePhone(business?.phone ?? ""),
        email: validateEmail(business?.email ?? ""),
      };

      Object.entries(errors).forEach(([field, msg]) => {
        if (msg) {
          allErrors.push({
            field,
            message: msg,
            section: "Core Details",
          });
        }
      });

      if (Object.values(errors).some((err) => err !== null)) {
        setValidationErrors(errors);
      }
    }

    if (allErrors.length > 0) {
      // Show validation summary and scroll to it
      validationSummaryRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }

    // Track current save target to prevent stale saves
    const currentTarget = selectedBusiness;
    saveTargetRef.current = currentTarget;

    // Save both if validation passes
    try {
      const promises = [];

      if (businessDirty) {
        promises.push(
          (async () => {
            if (!selectedBusiness || !business) return;
            setSavingBiz(true);
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

            // Guard: Check if this save is still for current business
            if (saveTargetRef.current !== currentTarget) {
              setSavingBiz(false);
              return; // Stale save, discard
            }

            setBusiness(updated);
            setOriginalBusiness(updated);
            setSavingBiz(false);
          })()
        );
      }

      if (questionnaireDirty) {
        promises.push(
          (async () => {
            // Guard: Check if this save is still for current business
            if (saveTargetRef.current !== currentTarget) return;
            await handleSaveQuestionnaire();
          })()
        );
      }

      if (promises.length > 0) {
        // Use allSettled to handle partial failures gracefully
        const results = await Promise.allSettled(promises);

        const fulfilled = results.filter(
          (r): r is PromiseFulfilledResult<void> => r.status === "fulfilled"
        );
        const rejected = results.filter(
          (r): r is PromiseRejectedResult => r.status === "rejected"
        );

        // Only update state if this is still the current save
        if (saveTargetRef.current !== currentTarget) {
          return; // Stale save, discard
        }

        if (rejected.length === 0) {
          // All saves succeeded
          addToast("All changes saved successfully", "success");
        } else if (fulfilled.length > 0) {
          // Partial failure - some saves succeeded, some failed
          const failureDetails = rejected
            .map((r) =>
              r.reason instanceof Error ? r.reason.message : "Unknown error"
            )
            .join("; ");
          addToast(
            `Partially saved: ${fulfilled.length}/${results.length} sections saved. Errors: ${failureDetails}`,
            "warning",
            7000
          );
        } else {
          // All saves failed
          addToast("Failed to save changes. Please retry.", "error", 5000);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save changes";
      setError(msg);
      addToast(msg, "error", 5000);
    }
  };

  const handleCancelAll = () => {
    setBusiness(originalBusiness);
    setQuestionnaireData(originalQuestionnaireData);
    setQuestionnaireDirty(false);
    setValidationErrors({
      name: null,
      industry: null,
      website: null,
      phone: null,
      email: null,
    });
    // Note: QuestionnaireForm warnings are cleared internally when hasUnsavedChanges = false
  };

  // Collect all validation errors for summary
  const validationErrorsList = useMemo(() => {
    const errors: Array<{ field: string; message: string; section: string }> =
      [];

    if (businessDirty) {
      Object.entries(validationErrors).forEach(([field, msg]) => {
        if (msg) {
          errors.push({
            field,
            message: msg,
            section: "Core Details",
          });
        }
      });
    }

    return errors;
  }, [businessDirty, validationErrors]);

  return (
    <DashboardLayout>
      <div className="pb-24 space-y-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Business Profile</h1>
          <p className="text-gray-600">
            Manage your business information and profile details for content
            generation.
          </p>
        </div>

        {!selectedBusiness ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 text-gray-300 mx-auto mb-4">
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                className="w-full h-full"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5.5m0 0H9m0 0H3.5m0 0H1m5.5 0a2.121 2.121 0 00-3-3m3 3a2.121 2.121 0 01-3-3m3 3v3.5M3.5 21h5.5m0 0v3.5"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No business selected
            </h3>
            <p className="text-gray-600">
              Select a business from the sidebar to manage its profile.
            </p>
          </div>
        ) : loading ? (
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-10 bg-gray-200 rounded animate-pulse"
                  />
                ))}
              </div>
              <div className="lg:col-span-2 space-y-3">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-10 bg-gray-200 rounded w-24 animate-pulse"
                    />
                  ))}
                </div>
                <div className="h-64 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded p-4 text-red-600">
            {error}
          </div>
        ) : (
          <>
            {/* Validation Summary */}
            <div ref={validationSummaryRef}>
              {validationErrorsList.length > 0 && (
                <ValidationSummary errors={validationErrorsList} />
              )}
            </div>

            {/* Main Grid: Business Details + Questionnaire + Completeness */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Completeness Dashboard */}
              <div className="lg:col-span-1 flex flex-col items-center border rounded-lg p-6 bg-white shadow-sm">
                <h2 className="text-lg font-semibold mb-6">Profile Status</h2>
                <CompletenessRing score={completenessScore} size="md" />
                <div className="mt-6 text-center">
                  <p className="text-xs text-gray-600 mb-2">
                    {completenessScore < 40
                      ? "Complete more sections to enable generation"
                      : "Your profile is ready for content generation"}
                  </p>
                </div>
              </div>

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
                          business
                            ? { ...business, name: e.target.value }
                            : null
                        )
                      }
                      onBlur={() => {
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
                      Phone{" "}
                      <span className="text-gray-400 font-normal">
                        optional
                      </span>
                    </label>
                    <input
                      className={`border rounded px-3 py-2 w-full ${
                        validationErrors.phone ? "border-red-500" : ""
                      }`}
                      value={business?.phone ?? ""}
                      onChange={(e) =>
                        setBusiness(
                          business
                            ? { ...business, phone: e.target.value }
                            : null
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
                      Email{" "}
                      <span className="text-gray-400 font-normal">
                        optional
                      </span>
                    </label>
                    <input
                      className={`border rounded px-3 py-2 w-full ${
                        validationErrors.email ? "border-red-500" : ""
                      }`}
                      value={business?.email ?? ""}
                      onChange={(e) =>
                        setBusiness(
                          business
                            ? { ...business, email: e.target.value }
                            : null
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
                  hasUnsavedChanges={questionnaireDirty}
                  businessId={selectedBusiness ?? undefined}
                  onBulkOperationChange={setBulkAreasLoading}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Sticky Footer with Unified Save Controls */}
      {selectedBusiness && !loading && (
        <StickyFooter
          hasChanges={hasAnyUnsavedChanges}
          isSaving={isSavingAny}
          onSave={handleSaveAll}
          onCancel={handleCancelAll}
        />
      )}
    </DashboardLayout>
  );
};

export default BusinessProfile;
