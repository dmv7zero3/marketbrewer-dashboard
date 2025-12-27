import React, { useState, useMemo } from "react";
import { DashboardLayout } from "./DashboardLayout";
import { useBusiness } from "../../contexts/BusinessContext";
import { useToast } from "../../contexts/ToastContext";
import { createJob } from "../../api/jobs";
import { PagePreview } from "./PagePreview";
import type { PageType, GenerationJob } from "@marketbrewer/shared";
import { Link } from "react-router-dom";

interface PageTypeOption {
  value: PageType;
  title: string;
  description: string;
}

export const PageContentGeneration: React.FC = () => {
  const { selectedBusiness, uiLabels } = useBusiness();
  const { addToast } = useToast();
  const [pageType, setPageType] = useState<PageType>("keyword-service-area");

  // Build page type options with dynamic labels based on industry
  const pageTypeOptions: PageTypeOption[] = useMemo(() => [
    {
      value: "keyword-service-area",
      title: "SEO Keywords × Service Areas",
      description: `Keywords (e.g., "best fried chicken") × nearby cities`,
    },
    {
      value: "keyword-location",
      title: "SEO Keywords × Store Locations",
      description: `Keywords × physical store locations`,
    },
    {
      value: "service-service-area",
      title: `${uiLabels.servicesLabel} × Service Areas`,
      description: `${uiLabels.servicesLabel} (e.g., "Smash Burger") × nearby cities`,
    },
    {
      value: "service-location",
      title: `${uiLabels.servicesLabel} × Store Locations`,
      description: `${uiLabels.servicesLabel} × physical store locations`,
    },
  ], [uiLabels]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [totalCreated, setTotalCreated] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handlePreview = () => {
    setShowPreview(true);
  };

  const handleConfirmGeneration = async () => {
    if (!selectedBusiness) return;
    try {
      setCreating(true);
      setError(null);
      setShowPreview(false);
      const res = await createJob(selectedBusiness, pageType);
      setJob(res.job);
      setTotalCreated(res.total_pages_created);
      addToast(
        `Generation job created successfully (ID: ${res.job.id})`,
        "success"
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create job";
      setError(msg);
      addToast(msg, "error", 5000);
    } finally {
      setCreating(false);
    }
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Page Content Generation</h1>
          <p className="mt-1 text-sm text-dark-400">
            Generate SEO-optimized landing pages for your keywords and service areas
          </p>
        </div>

        {!selectedBusiness ? (
          <div className="bg-metro-yellow-950 border border-yellow-200 rounded-lg p-4">
            <p className="text-metro-yellow">
              Select a business from the sidebar to generate content.
            </p>
          </div>
        ) : (
          <div className="bg-dark-800 rounded-lg shadow p-6 space-y-6">
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
                    disabled={creating}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      pageType === option.value
                        ? "border-metro-orange bg-metro-orange-950/30"
                        : "border-dark-700 bg-dark-900 hover:border-dark-600"
                    }`}
                  >
                    <div className="font-medium text-dark-100">
                      {option.title}
                    </div>
                    <div className="text-sm text-dark-400 mt-1">
                      {option.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                className="bg-dark-800 text-dark-200 px-6 py-2 rounded-lg font-medium hover:bg-dark-700 transition-colors"
                onClick={handlePreview}
                disabled={creating}
              >
                Preview Pages
              </button>
              <button
                className="bg-metro-orange text-dark-950 px-6 py-2 rounded-lg font-medium disabled:opacity-50 hover:bg-metro-orange-600 transition-colors"
                onClick={handlePreview}
                disabled={creating}
              >
                {creating ? "Creating Job..." : "Generate Pages"}
              </button>
            </div>

            {error && (
              <div className="bg-metro-red-950 border border-metro-red-700 rounded-lg p-4">
                <p className="text-metro-red">{error}</p>
              </div>
            )}

            {/* Job Result */}
            {job && (
              <div className="border border-metro-green-700 rounded-lg p-4 bg-metro-green-950">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-metro-green">
                      Job Created Successfully
                    </h3>
                    <p className="text-sm text-metro-green mt-1">
                      Job ID: {job.id}
                    </p>
                    <p className="text-sm text-metro-green">
                      Status: {job.status}
                    </p>
                    {totalCreated !== null && (
                      <p className="text-sm text-metro-green">
                        Pages Queued: {totalCreated.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Link
                    to={`/jobs/${job.business_id}/${job.id}`}
                    className="inline-flex items-center px-4 py-2 bg-metro-green text-dark-950 text-sm font-medium rounded-lg hover:bg-metro-green-600"
                  >
                    View Job Status
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <PagePreview
            pageType={pageType}
            onConfirm={handleConfirmGeneration}
            onCancel={handleCancelPreview}
          />
        </div>
      )}
    </DashboardLayout>
  );
};

export default PageContentGeneration;
