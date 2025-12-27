import React, { useEffect, useState } from "react";
import { DashboardLayout } from "./DashboardLayout";
import { useBusiness } from "../../contexts/BusinessContext";
import { getJobs } from "../../api/jobs";
import type { GenerationJob } from "@marketbrewer/shared";
import { Link } from "react-router-dom";

export const Dashboard: React.FC = () => {
  const { selectedBusiness, loading } = useBusiness();
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!selectedBusiness) return;
      try {
        setJobsLoading(true);
        setError(null);
        const { jobs } = await getJobs(selectedBusiness);
        if (!mounted) return;
        setJobs(jobs);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load jobs";
        setError(msg);
      } finally {
        setJobsLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [selectedBusiness]);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        {loading && <p className="text-dark-400">Loading businesses...</p>}
        {!loading && !selectedBusiness && (
          <p className="text-dark-400">
            Please select a business from the sidebar.
          </p>
        )}
        {!loading && selectedBusiness && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Recent Jobs</h2>
              {jobsLoading && <p className="text-dark-400">Loading jobs...</p>}
              {error && <p className="text-metro-red">{error}</p>}
              {!jobsLoading && jobs.length === 0 && (
                <p className="text-dark-400">
                  No jobs yet. Create one in Generate Content.
                </p>
              )}
              <ul className="space-y-2">
                {jobs.slice(0, 10).map((job) => (
                  <li key={job.id} className="border rounded p-3 bg-dark-800">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-dark-100">Job {job.id}</p>
                        <p className="text-dark-400 text-sm">
                          Status: {job.status}
                        </p>
                        <p className="text-dark-400 text-sm">
                          Pages: {job.completed_pages + job.failed_pages}/
                          {job.total_pages}
                        </p>
                      </div>
                      <Link
                        to={`/jobs/${job.business_id}/${job.id}`}
                        className="text-metro-orange hover:underline"
                      >
                        View
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
