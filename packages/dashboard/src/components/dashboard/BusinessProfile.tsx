import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  BusinessProfileLayout,
  type ProfileSection,
} from "./profile-v1/BusinessProfileLayout";
import { EssentialsTab } from "./profile-v1/EssentialsTab";
import { LocationsAndHoursTab } from "./profile-v1/LocationsAndHoursTab";
import { SocialLinksTab } from "./profile-v1/SocialLinksTab";
import { ServicesTab } from "./profile-v1/ServicesTab";
import { ContentProfileTab } from "./profile-v1/ContentProfileTab";
import { ValidationSummary } from "./ValidationSummary";
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
  validateCity,
  validateState,
} from "../../lib/validation";
import type {
  Business,
  QuestionnaireDataStructure,
} from "@marketbrewer/shared";
import { createEmptyQuestionnaire } from "@marketbrewer/shared";

export const BusinessProfile: React.FC = () => {
  const { selectedBusiness } = useBusiness();
  const { addToast } = useToast();

  // Navigation state
  const [activeSection, setActiveSection] =
    useState<ProfileSection>("essentials");

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
    industry_type: null,
    website: null,
    phone: null,
    email: null,
    gbp_url: null,
    primary_city: null,
    primary_state: null,
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
      industry_type: null,
      website: null,
      phone: null,
      email: null,
      gbp_url: null,
      primary_city: null,
      primary_state: null,
    });

    load();
    return () => {
      mounted = false;
    };
  }, [selectedBusiness]);

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
      const industryValue = business?.industry_type ?? business?.industry ?? "";

      const errors: Record<string, string | null> = {
        name: validateBusinessName(business?.name ?? ""),
        industry_type: validateIndustry(industryValue),
        industry: null, // legacy field kept for compatibility; surface errors via industry_type
        website: validateURL(business?.website ?? ""),
        phone: validatePhone(business?.phone ?? ""),
        email: validateEmail(business?.email ?? ""),
        gbp_url: validateURL(business?.gbp_url ?? ""),
        primary_city: business?.primary_city
          ? validateCity(business.primary_city)
          : null,
        primary_state: business?.primary_state
          ? validateState(business.primary_state)
          : null,
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
              industry: business.industry ?? business.industry_type ?? "",
              industry_type: business.industry_type ?? business.industry,
              website: business.website ?? null,
              phone: business.phone ?? null,
              email: business.email ?? null,
              gbp_url: business.gbp_url ?? null,
              primary_city: business.primary_city ?? null,
              primary_state: business.primary_state ?? null,
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
      industry_type: null,
      website: null,
      phone: null,
      email: null,
      gbp_url: null,
      primary_city: null,
      primary_state: null,
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
    <>
      <BusinessProfileLayout
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        completenessScore={completenessScore}
      >
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
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-10 bg-gray-200 rounded animate-pulse"
                />
              ))}
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

            {/* Render active section */}
            {activeSection === "essentials" && (
              <EssentialsTab
                business={business}
                validationErrors={validationErrors}
                onChange={setBusiness}
                disabled={isSavingAny}
              />
            )}

            {activeSection === "hours" && selectedBusiness && (
              <LocationsAndHoursTab
                businessId={selectedBusiness}
                isLoading={loading}
                isSaving={isSavingAny}
              />
            )}

            {activeSection === "social" && (
              <SocialLinksTab isSaving={isSavingAny} />
            )}

            {activeSection === "services" && (
              <ServicesTab
                data={questionnaireData}
                onDataChange={handleQuestionnaireDataChange}
                isSaving={savingQ}
                isLoading={loading}
              />
            )}

            {activeSection === "content" && (
              <ContentProfileTab
                data={questionnaireData}
                onDataChange={handleQuestionnaireDataChange}
                onSave={handleSaveQuestionnaire}
                onCancel={handleCancelQuestionnaire}
                isSaving={savingQ}
                isLoading={loading}
                hasUnsavedChanges={questionnaireDirty}
                businessId={selectedBusiness ?? undefined}
              />
            )}
          </>
        )}
      </BusinessProfileLayout>

      {/* Sticky Footer with Unified Save Controls */}
      {selectedBusiness && !loading && (
        <StickyFooter
          hasChanges={hasAnyUnsavedChanges}
          isSaving={isSavingAny}
          onSave={handleSaveAll}
          onCancel={handleCancelAll}
        />
      )}
    </>
  );
};

export default BusinessProfile;
