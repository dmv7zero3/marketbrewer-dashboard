import React, { useState } from "react";
import { DashboardLayout } from "./DashboardLayout";
import { useBusiness } from "../../contexts/BusinessContext";
import { useToast } from "../../contexts/ToastContext";
import { createJob } from "../../api/jobs";
import type { PageType, GenerationJob } from "@marketbrewer/shared";
import { Link } from "react-router-dom";

export const PageContentGeneration: React.FC = () => {
  const { selectedBusiness } = useBusiness();
  const { addToast } = useToast();
  const [pageType, setPageType] = useState<PageType>("keyword-location");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [totalCreated, setTotalCreated] = useState<number | null>(null);

  const handleCreate = async () => {
    if (!selectedBusiness) return;
    try {
      setCreating(true);
      setError(null);
      const res = await createJob(selectedBusiness, pageType);
      setJob(res.job);
      setTotalCreated(res.total_pages_created);
      addToast(`Generation job created successfully (ID: ${res.job.id})`, "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create job";
      setError(msg);
      addToast(msg, "error", 5000);
    } finally {
      setCreating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Page Content Generation</h1>
        {!selectedBusiness ? (
          <p className="text-gray-600">
            Select a business to generate content.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Page Type</label>
              <select
                className="border rounded px-2 py-1"
                value={pageType}
                onChange={(e) => setPageType(e.target.value as PageType)}
                disabled={creating}
              >
                <option value="keyword-location">Keyword × Location</option>
                <option value="service-location">Service Location Only</option>
              </select>
            </div>

            <button
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-blue-700"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? "Creating Job..." : "Create Generation Job"}
            </button>

            {error && <p className="text-red-600">{error}</p>}

            {job && (
              <div className="mt-4 border rounded p-4 bg-white">
                <p className="text-gray-700">Job ID: {job.id}</p>
                <p className="text-gray-700">Status: {job.status}</p>
                {totalCreated !== null && (
                  <p className="text-gray-700">Pages Created: {totalCreated}</p>
                )}
                <div className="mt-2">
                  <Link
                    to={`/jobs/${job.business_id}/${job.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    View Job Status
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PageContentGeneration;
