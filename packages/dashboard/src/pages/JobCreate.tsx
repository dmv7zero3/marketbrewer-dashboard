/**
 * Job Creation Page - Uses sidebar-selected business
 */

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "../components/dashboard/DashboardLayout";
import { useBusiness } from "../contexts/BusinessContext";
import { createJob, getQuestionnaire } from "../api";
import type { PageType } from "@marketbrewer/shared";

interface PageTypeOption {
  value: PageType;
  title: string;
  description: string;
}

export const JobCreate: React.FC = () => {
  const navigate = useNavigate();
  const { selectedBusiness, uiLabels } = useBusiness();
  const [pageType, setPageType] = useState<PageType>("keyword-service-area");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completenessScore, setCompletenessScore] = useState<number | null>(null);

  // Build page type options with dynamic labels based on industry
  const pageTypeOptions: PageTypeOption[] = useMemo(
    () => [
      {
        value: "keyword-service-area",
        title: "SEO Keywords × Service Areas",
        description: `Keywords (e.g., "best fried chicken") × nearby cities`,
      },
      {
        value: "keyword-location",
        title: "SEO Keywords × Store Locations",
        description: `Keywords × physical store locations (active + coming soon)`,
      },
      {
        value: "service-service-area",
        title: `${uiLabels.servicesLabel} × Service Areas`,
        description: `${uiLabels.servicesLabel} (e.g., "Smash Burger") × nearby cities`,
      },
      {
        value: "service-location",
        title: `${uiLabels.servicesLabel} × Store Locations`,
        description: `${uiLabels.servicesLabel} × physical store locations (active + coming soon)`,
      },
    ],
    [uiLabels]
  );

  // Load questionnaire when business changes
  useEffect(() => {
    const loadQuestionnaire = async (): Promise<void> => {
      if (!selectedBusiness) {
        setCompletenessScore(null);
        return;
      }

      try {
        const response = await getQuestionnaire(selectedBusiness);
        setCompletenessScore(response.questionnaire.completeness_score);
      } catch (err) {
        setCompletenessScore(0);
        console.error(err);
      }
    };

    loadQuestionnaire();
  }, [selectedBusiness]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!selectedBusiness) {
      setError("Please select a business from the sidebar");
      return;
    }

    if (completenessScore !== null && completenessScore < 40) {
      setError(
        "Questionnaire must be at least 40% complete before generating pages"
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await createJob(selectedBusiness, pageType);
      navigate(`/jobs/${selectedBusiness}/${response.job.id}`);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create job";
      setError(errorMessage);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // No business selected - show prompt
  if (!selectedBusiness) {
    return (
      <DashboardLayout title="Create Generation Job">
        <div className="bg-dark-800 rounded-lg p-8 text-center">
          <div className="text-dark-400 mb-2">No business selected</div>
          <div className="text-dark-500 text-sm">
            Select a business from the sidebar to create a generation job.
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Create Generation Job">
      <div className="max-w-3xl">
        {error && (
          <div className="bg-metro-red-950 border border-metro-red-700 text-metro-red px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Completeness Score */}
          {completenessScore !== null && (
            <div className="bg-dark-800 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-dark-200">
                  Questionnaire Completeness
                </span>
                <span
                  className={`text-sm font-bold ${
                    completenessScore >= 40 ? "text-metro-green" : "text-metro-red"
                  }`}
                >
                  {completenessScore}%
                </span>
              </div>
              <div className="w-full bg-dark-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    completenessScore >= 40 ? "bg-metro-green" : "bg-metro-red"
                  }`}
                  style={{ width: `${completenessScore}%` }}
                />
              </div>
              {completenessScore < 40 && (
                <p className="text-sm text-metro-red mt-2">
                  Minimum 40% required to generate content
                </p>
              )}
            </div>
          )}

          {/* Page Type Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-dark-200">
              Page Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pageTypeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPageType(option.value)}
                  disabled={loading}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    pageType === option.value
                      ? "border-metro-orange bg-metro-orange-950/30"
                      : "border-dark-700 bg-dark-900 hover:border-dark-600"
                  }`}
                >
                  <div className="font-medium text-dark-100">{option.title}</div>
                  <div className="text-sm text-dark-400 mt-1">
                    {option.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={
              loading ||
              !selectedBusiness ||
              (completenessScore !== null && completenessScore < 40)
            }
            className="w-full bg-metro-orange text-dark-950 py-3 px-4 rounded-lg font-medium hover:bg-metro-orange-600 disabled:bg-dark-600 disabled:text-dark-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Creating Job..." : "Create Generation Job"}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default JobCreate;
