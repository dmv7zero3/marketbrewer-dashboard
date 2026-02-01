/**
 * Jobs List Page - Uses sidebar-selected business
 */

import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "../components/dashboard/DashboardLayout";
import { useBusiness } from "../contexts/BusinessContext";
import { getJobs } from "../api/jobs";
import { getApiBaseUrl, getAuthToken } from "../api/client";
import { GeneratedPageViewer } from "../components/dashboard";
import type { GenerationJob } from "@marketbrewer/shared";

export const JobsList: React.FC = () => {
  const { selectedBusiness } = useBusiness();
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState<boolean>(true);
  const [liveMode, setLiveMode] = useState<"sse" | "poll">("poll");
  const [sseDisabled, setSseDisabled] = useState(false);
  const [viewerJobId, setViewerJobId] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const POLL_INTERVAL_MS = 5000;

  // Load jobs for selected business
  useEffect(() => {
    const load = async () => {
      if (!selectedBusiness) {
        setJobs([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
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

  // Live updates via SSE (local server)
  useEffect(() => {
    if (!selectedBusiness || sseDisabled) return;
    if (typeof window === "undefined" || !("EventSource" in window)) return;
    const token = getAuthToken();
    if (!token) return;

    const url = `${getApiBaseUrl()}/api/stream/businesses/${selectedBusiness}/jobs?token=${encodeURIComponent(
      token
    )}`;
    const source = new EventSource(url);
    sourceRef.current = source;

    const handleUpdate = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as { jobs?: GenerationJob[] };
        if (payload.jobs) {
          setJobs(payload.jobs);
          setError(null);
          setLoading(false);
          setLiveMode("sse");
          setPolling(false);
        }
      } catch (err) {
        console.error("Failed to parse live jobs update", err);
      }
    };

    const handleError = () => {
      setLiveMode("poll");
      setPolling(true);
      setSseDisabled(true);
      source.close();
    };

    source.addEventListener("jobs.update", handleUpdate as EventListener);
    source.addEventListener("error", handleError as EventListener);

    return () => {
      source.removeEventListener("jobs.update", handleUpdate as EventListener);
      source.removeEventListener("error", handleError as EventListener);
      source.close();
    };
  }, [selectedBusiness, sseDisabled]);

  // Auto-refresh polling
  useEffect(() => {
    if (!polling || !selectedBusiness || liveMode === "sse") return;
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
        return "text-metro-green";
      case "failed":
        return "text-metro-red";
      case "processing":
        return "text-metro-blue";
      case "pending":
        return "text-metro-yellow";
      default:
        return "text-dark-400";
    }
  };

  const formatPageType = (pageType: string) => {
    const labels: Record<string, string> = {
      "keyword-service-area": "Keywords × Service Areas",
      "keyword-location": "Keywords × Locations",
      "service-service-area": "Services × Service Areas",
      "service-location": "Services × Locations",
      "blog-service-area": "Blog Topics × Service Areas",
      "blog-location": "Blog Topics × Locations",
      "location-keyword": "Keywords × Locations (legacy)",
      "service-area": "Keywords × Service Areas (legacy)",
    };
    return labels[pageType] || pageType;
  };

  // No business selected
  if (!selectedBusiness) {
    return (
      <DashboardLayout title="Generation Jobs">
        <div className="bg-dark-800 rounded-lg p-8 text-center">
          <div className="text-dark-400 mb-2">No business selected</div>
          <div className="text-dark-500 text-sm">
            Select a business from the sidebar to view generation jobs.
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Generation Jobs"
      actions={
        <Link
          to="/jobs/new"
          className="bg-metro-orange text-dark-950 px-4 py-2 rounded-lg font-medium hover:bg-metro-orange-600 transition-colors"
        >
          Create Job
        </Link>
      }
    >
      {/* Polling status */}
      <div className="flex items-center justify-between mb-4 text-sm text-dark-400">
        <span>
          {liveMode === "sse" ? (
            <>Live updates connected</>
          ) : polling ? (
            <>Auto-refreshing every {POLL_INTERVAL_MS / 1000}s</>
          ) : (
            <>Auto-refresh paused</>
          )}
        </span>
        <div className="flex items-center gap-2">
          {sseDisabled && (
            <button
              type="button"
              onClick={() => {
                setSseDisabled(false);
                setLiveMode("poll");
                setPolling(false);
              }}
              className="px-3 py-1 border border-metro-orange/60 rounded-lg text-metro-orange hover:bg-metro-orange/10 transition-colors"
            >
              Enable Live
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (liveMode === "sse") {
                sourceRef.current?.close();
                setLiveMode("poll");
                setPolling(true);
                setSseDisabled(true);
                return;
              }
              setPolling((p) => !p);
            }}
            className="px-3 py-1 border border-dark-600 rounded-lg text-dark-300 hover:bg-dark-800 hover:text-dark-100 transition-colors"
          >
            {liveMode === "sse" ? "Switch to polling" : polling ? "Pause" : "Resume"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-dark-800 rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-dark-700 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-dark-700 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-dark-700 rounded w-2/3"></div>
          </div>
        </div>
      ) : error ? (
        <div className="bg-metro-red-950 border border-metro-red-700 text-metro-red px-4 py-3 rounded-lg">
          {error}
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-dark-800 rounded-lg p-8 text-center">
          <div className="text-dark-400 mb-2">No jobs found</div>
          <div className="text-dark-500 text-sm mb-4">
            Create a generation job to start generating SEO pages.
          </div>
          <Link
            to="/jobs/new"
            className="inline-block bg-metro-orange text-dark-950 px-4 py-2 rounded-lg font-medium hover:bg-metro-orange-600 transition-colors"
          >
            Create Job
          </Link>
        </div>
      ) : (
        <div className="bg-dark-800 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-dark-700">
            <thead className="bg-dark-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider">
                  Job ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider">
                  Page Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {jobs.map((j) => (
                <tr key={j.id} className="hover:bg-dark-700/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-dark-200 text-sm">
                    {j.id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3 text-dark-200 text-sm">
                    {formatPageType(j.page_type)}
                  </td>
                  <td className="px-4 py-3 text-dark-200 text-sm">
                    <span className="text-metro-green">{j.completed_pages}</span>
                    {j.failed_pages > 0 && (
                      <span className="text-metro-red ml-1">
                        +{j.failed_pages} failed
                      </span>
                    )}
                    <span className="text-dark-500"> / {j.total_pages}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor(
                        j.status
                      )} bg-dark-900`}
                    >
                      {j.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-dark-400 text-sm">
                    {new Date(j.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    {j.completed_pages && j.completed_pages > 0 && (
                      <button
                        onClick={() => setViewerJobId(j.id)}
                        className="text-metro-blue hover:text-metro-blue-400 transition-colors text-sm"
                      >
                        View Content
                      </button>
                    )}
                    <Link
                      to={`/jobs/${selectedBusiness}/${j.id}`}
                      className="text-metro-orange hover:text-metro-orange-400 transition-colors text-sm"
                    >
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Generated Page Viewer Modal */}
      {viewerJobId && (
        <GeneratedPageViewer
          jobId={viewerJobId}
          onClose={() => setViewerJobId(null)}
        />
      )}
    </DashboardLayout>
  );
};

export default JobsList;
