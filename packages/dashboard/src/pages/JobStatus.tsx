/**
 * Job Status Page
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getJobStatus } from '../api';
import { GeneratedPageViewer } from '../components/dashboard';
import type { JobWithCounts } from '@marketbrewer/shared';

const POLL_INTERVAL_MS = 3000;

export const JobStatus: React.FC = () => {
  const { businessId, jobId } = useParams<{ businessId: string; jobId: string }>();
  const [job, setJob] = useState<JobWithCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showViewer, setShowViewer] = useState(false);

  const fetchStatus = useCallback(async (): Promise<void> => {
    if (!businessId || !jobId) return;

    try {
      const response = await getJobStatus(businessId, jobId);
      setJob(response.job);
      setError(null);
    } catch (err) {
      setError('Failed to load job status');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [businessId, jobId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!job || job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return;
    }

    const interval = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [job, fetchStatus]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-dark-700 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-dark-700 rounded w-3/4 mb-2"></div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-metro-red-950 border border-metro-red-700 text-metro-red px-4 py-3 rounded-lg mb-4">
          {error || 'Job not found'}
        </div>
        <Link to="/" className="text-metro-orange hover:text-metro-orange-400 transition-colors">Back to Home</Link>
      </div>
    );
  }

  const progressPercent = job.total_pages > 0
    ? Math.round(((job.completed_count + job.failed_count) / job.total_pages) * 100)
    : 0;

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'text-metro-green bg-metro-green-950 border-metro-green-700';
      case 'failed': return 'text-metro-red bg-metro-red-950 border-metro-red-700';
      case 'processing': return 'text-metro-blue bg-metro-blue-950 border-metro-blue-700';
      case 'pending': return 'text-metro-yellow bg-metro-yellow-950 border-metro-yellow-700';
      default: return 'text-dark-400 bg-dark-800 border-dark-700';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-dark-100">Job Status</h1>
        <Link to="/" className="text-metro-orange hover:text-metro-orange-400 transition-colors">Back</Link>
      </div>

      <div className="mb-6">
        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(job.status)}`}>
          {job.status.toUpperCase()}
        </span>
      </div>

      <div className="bg-dark-800 border border-dark-700 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-dark-400">Job ID:</span> <span className="ml-2 font-mono text-dark-200">{job.id.slice(0, 8)}...</span></div>
          <div><span className="text-dark-400">Page Type:</span> <span className="ml-2 text-dark-200">{job.page_type}</span></div>
          <div><span className="text-dark-400">Total Pages:</span> <span className="ml-2 font-bold text-dark-100">{job.total_pages}</span></div>
          <div><span className="text-dark-400">Created:</span> <span className="ml-2 text-dark-200">{new Date(job.created_at).toLocaleString()}</span></div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-dark-300">Progress</span>
          <span className="text-sm font-bold text-dark-100">{progressPercent}%</span>
        </div>
        <div className="w-full bg-dark-700 rounded-full h-4">
          <div className="h-4 rounded-full bg-metro-orange transition-all duration-300" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-dark-800 border border-dark-700 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-dark-400">{job.queued_count}</div>
          <div className="text-sm text-dark-500">Queued</div>
        </div>
        <div className="bg-metro-blue-950/50 border border-metro-blue-900/50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-metro-blue">{job.processing_count}</div>
          <div className="text-sm text-metro-blue-400">Processing</div>
        </div>
        <div className="bg-metro-green-950/50 border border-metro-green-900/50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-metro-green">{job.completed_count}</div>
          <div className="text-sm text-metro-green-400">Completed</div>
        </div>
        <div className="bg-metro-red-950/50 border border-metro-red-900/50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-metro-red">{job.failed_count}</div>
          <div className="text-sm text-metro-red-400">Failed</div>
        </div>
      </div>

      {/* View Generated Content Button */}
      {job.completed_count > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowViewer(true)}
            className="w-full bg-metro-orange hover:bg-metro-orange-600 hover:shadow-glow-orange text-dark-950 font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View Generated Content ({job.completed_count} pages)
          </button>
        </div>
      )}

      {(job.status === 'pending' || job.status === 'processing') && (
        <div className="text-center text-sm text-dark-500">
          <span className="inline-block animate-pulse mr-2 text-metro-orange">●</span>
          Auto-refreshing every {POLL_INTERVAL_MS / 1000} seconds
        </div>
      )}

      {job.status === 'completed' && (
        <div className="bg-metro-green-950 border border-metro-green-700 text-metro-green px-4 py-3 rounded-lg">
          Job completed! {job.completed_pages} pages generated.
        </div>
      )}

      {job.status === 'failed' && (
        <div className="bg-metro-red-950 border border-metro-red-700 text-metro-red px-4 py-3 rounded-lg">
          Job failed. {job.failed_pages} pages failed out of {job.total_pages}.
        </div>
      )}

      {/* Generated Page Viewer Modal */}
      {showViewer && jobId && (
        <GeneratedPageViewer
          jobId={jobId}
          onClose={() => setShowViewer(false)}
        />
      )}
    </div>
  );
};

export default JobStatus;
