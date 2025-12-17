import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useBusiness } from "../contexts/BusinessContext";
import { getJobs } from "../api/jobs";
import type { GenerationJob } from "@marketbrewer/shared";

export const JobsList: React.FC = () => {
  const { businessId: routeBusinessId } = useParams<{ businessId: string }>();
  const { selectedBusiness, setSelectedBusiness } = useBusiness();
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState<boolean>(true);
  const POLL_INTERVAL_MS = 5000;

  // Sync context with route params
  useEffect(() => {
    if (routeBusinessId && routeBusinessId !== selectedBusiness) {
      setSelectedBusiness(routeBusinessId);
    }
  }, [routeBusinessId, selectedBusiness, setSelectedBusiness]);

  // Load jobs for selected business
  useEffect(() => {
    const load = async () => {
      if (!selectedBusiness) {
        setLoading(false);
        return;
      }
      try {
        const jobsResp = await getJobs(selectedBusiness);
        setJobs(jobsResp.jobs);
        setError(null);
      } catch (e) {
        console.error(e);
        setError("Failed to load jobs");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedBusiness]);

  // Auto-refresh polling
  useEffect(() => {
    if (!polling || !selectedBusiness) return;
    const interval = setInterval(async () => {
      try {
        const jobsResp = await getJobs(selectedBusiness);
        setJobs(jobsResp.jobs);
      } catch (e) {
        console.error(e);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [polling, selectedBusiness]);

  const statusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600";
      case "failed":
        return "text-red-600";
      case "processing":
        return "text-blue-600";
      case "pending":
        return "text-yellow-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="container">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Jobs</h1>
        <Link to="/jobs/new" className="text-blue-600 hover:underline">
          Create Job
        </Link>
      </div>
      <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
        <span>
          {polling ? (
            <>Auto-refreshing every {POLL_INTERVAL_MS / 1000}s</>
          ) : (
            <>Auto-refresh paused</>
          )}
        </span>
        <button
          type="button"
          onClick={() => setPolling((p) => !p)}
          className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
        >
          {polling ? "Pause" : "Resume"}
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      ) : !selectedBusiness ? (
        <div className="text-gray-600">Select a business to view jobs.</div>
      ) : jobs.length === 0 ? (
        <div className="text-gray-600">No jobs found for this business.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job ID
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Page Type
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Pages
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td className="px-4 py-2 font-mono">{j.id.slice(0, 8)}...</td>
                  <td className="px-4 py-2">{j.page_type}</td>
                  <td className="px-4 py-2">{j.total_pages}</td>
                  <td className={`px-4 py-2 ${statusColor(j.status)}`}>
                    {j.status}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      to={`/jobs/${selectedBusiness}/${j.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default JobsList;
