/**
 * Job Creation Page
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../contexts/BusinessContext";
import { createJob, getQuestionnaire } from "../api";
import type { PageType } from "@marketbrewer/shared";

export const JobCreate: React.FC = () => {
  const navigate = useNavigate();
  const { selectedBusiness, setSelectedBusiness, businesses } = useBusiness();
  const [pageType, setPageType] = useState<PageType>("keyword-location");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completenessScore, setCompletenessScore] = useState<number | null>(
    null
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
      setError("Please select a business");
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

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create Generation Job</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Selection */}
        <div>
          <label
            htmlFor="business"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Select Business
          </label>
          <select
            id="business"
            value={selectedBusiness || ""}
            onChange={(e) => setSelectedBusiness(e.target.value || null)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            <option value="">-- Select a business --</option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name} ({business.industry})
              </option>
            ))}
          </select>
        </div>

        {/* Completeness Score */}
        {selectedBusiness && completenessScore !== null && (
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                Questionnaire Completeness
              </span>
              <span
                className={`text-sm font-bold ${
                  completenessScore >= 40 ? "text-green-600" : "text-red-600"
                }`}
              >
                {completenessScore}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  completenessScore >= 40 ? "bg-green-500" : "bg-red-500"
                }`}
                style={{ width: `${completenessScore}%` }}
              />
            </div>
            {completenessScore < 40 && (
              <p className="text-sm text-red-600 mt-2">
                Minimum 40% required to generate pages
              </p>
            )}
          </div>
        )}

        {/* Page Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Page Type
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="pageType"
                value="keyword-location"
                checked={pageType === "keyword-location"}
                onChange={(e) => setPageType(e.target.value as PageType)}
                className="mr-2"
                disabled={loading}
              />
              <span>Keyword + Location</span>
              <span className="text-gray-500 text-sm ml-2">
                (e.g., /halal-chicken/sterling-va)
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="pageType"
                value="service-location"
                checked={pageType === "service-location"}
                onChange={(e) => setPageType(e.target.value as PageType)}
                className="mr-2"
                disabled={loading}
              />
              <span>Service + Location</span>
              <span className="text-gray-500 text-sm ml-2">
                (e.g., /sterling-va)
              </span>
            </label>
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
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Creating Job..." : "Create Generation Job"}
        </button>
      </form>
    </div>
  );
};

export default JobCreate;
