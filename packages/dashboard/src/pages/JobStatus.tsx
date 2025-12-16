/**
 * Job Status Page
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getJobStatus } from '../api';
import type { JobWithCounts } from '@marketbrewer/shared';

const POLL_INTERVAL_MS = 3000;

export const JobStatus: React.FC = () => {
  const { businessId, jobId } = useParams<{ businessId: string; jobId: string }>();
  const [job, setJob] = useState<JobWithCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error || 'Job not found'}
        </div>
        <Link to="/" className="text-blue-600 hover:underline">Back to Home</Link>
      </div>
    );
  }

  const progressPercent = job.total_pages > 0 
    ? Math.round(((job.completed_count + job.failed_count) / job.total_pages) * 100)
    : 0;

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Job Status</h1>
        <Link to="/" className="text-blue-600 hover:underline">Back</Link>
      </div>

      <div className="mb-6">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(job.status)}`}>
          {job.status.toUpperCase()}
        </span>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Job ID:</span> <span className="ml-2 font-mono">{job.id.slice(0, 8)}...</span></div>
          <div><span className="text-gray-500">Page Type:</span> <span className="ml-2">{job.page_type}</span></div>
          <div><span className="text-gray-500">Total Pages:</span> <span className="ml-2 font-bold">{job.total_pages}</span></div>
          <div><span className="text-gray-500">Created:</span> <span className="ml-2">{new Date(job.created_at).toLocaleString()}</span></div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-bold">{progressPercent}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div className="h-4 rounded-full bg-blue-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-100 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-gray-600">{job.queued_count}</div>
          <div className="text-sm text-gray-500">Queued</div>
        </div>
        <div className="bg-blue-100 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{job.processing_count}</div>
          <div className="text-sm text-blue-500">Processing</div>
        </div>
        <div className="bg-green-100 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">{job.completed_count}</div>
          <div className="text-sm text-green-500">Completed</div>
        </div>
        <div className="bg-red-100 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-red-600">{job.failed_count}</div>
          <div className="text-sm text-red-500">Failed</div>
        </div>
      </div>

      {(job.status === 'pending' || job.status === 'processing') && (
        <div className="text-center text-sm text-gray-500">
          <span className="inline-block animate-pulse mr-2">●</span>
          Auto-refreshing every {POLL_INTERVAL_MS / 1000} seconds
        </div>
      )}

      {job.status === 'completed' && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          Job completed! {job.completed_pages} pages generated.
        </div>
      )}

      {job.status === 'failed' && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Job failed. {job.failed_pages} pages failed out of {job.total_pages}.
        </div>
      )}
    </div>
  );
};

export default JobStatus;
