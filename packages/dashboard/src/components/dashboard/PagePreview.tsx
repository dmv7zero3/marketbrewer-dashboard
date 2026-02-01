/**
 * PagePreview - Preview pages to be generated before creating a job
 *
 * Features:
 * - Search by keyword, URL path, or location
 * - Filter by language (en/es)
 * - Pagination for large page sets
 * - Summary stats (total pages, keywords, areas)
 * - Spelling/formatting review before generation
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useBusiness } from '../../contexts/BusinessContext';
import { previewPages, PreviewPagesResponse } from '../../api/jobs';
import type { PageType } from '@marketbrewer/shared';

interface PagePreviewProps {
  pageType: PageType;
  onConfirm: () => void;
  onCancel: () => void;
}

const ITEMS_PER_PAGE = 50;

export function PagePreview({ pageType, onConfirm, onCancel }: PagePreviewProps) {
  const { selectedBusiness, businesses } = useBusiness();
  const currentBusiness = businesses.find(b => b.id === selectedBusiness);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PreviewPagesResponse | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [language, setLanguage] = useState<'all' | 'en' | 'es'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const pageTypeLabel = useMemo(() => {
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
  }, [pageType]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch preview data
  const fetchPreview = useCallback(async () => {
    if (!currentBusiness) return;

    setLoading(true);
    setError(null);

    const controller = new AbortController();

    try {
      const result = await previewPages(
        currentBusiness.id,
        pageType,
        {
          search: debouncedSearch || undefined,
          language: language === 'all' ? undefined : language,
          page: currentPage,
          limit: ITEMS_PER_PAGE,
        },
        controller.signal
      );
      setData(result);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message || 'Failed to load preview');
      }
    } finally {
      setLoading(false);
    }

    return () => controller.abort();
  }, [currentBusiness, pageType, debouncedSearch, language, currentPage]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  // Highlight potential issues in keywords/URLs
  const flaggedPages = useMemo(() => {
    if (!data?.pages) return [];

    return data.pages.map((page) => {
      const issues: string[] = [];

      // Check for potential spelling issues (simple heuristics)
      const keyword = page.keyword_text || '';

      // Check for double spaces
      if (/\s{2,}/.test(keyword)) {
        issues.push('Double spaces detected');
      }

      // Check for leading/trailing spaces
      if (keyword !== keyword.trim()) {
        issues.push('Leading/trailing spaces');
      }

      // Check for unusual characters
      if (/[^\w\s-'"áéíóúñüÁÉÍÓÚÑÜ]/i.test(keyword)) {
        issues.push('Unusual characters');
      }

      // Check URL path for issues
      if (page.url_path.includes('--')) {
        issues.push('Double dashes in URL');
      }

      return { ...page, issues };
    });
  }, [data?.pages]);

  if (!currentBusiness) {
    return (
      <div className="p-6 text-center text-dark-400">
        No business selected
      </div>
    );
  }

  return (
    <div className="bg-dark-800 rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-dark-700 bg-dark-900">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-dark-100">
              Preview Pages to Generate
            </h2>
            <p className="text-sm text-dark-400 mt-1">
              Review pages before starting generation for {currentBusiness.name}
            </p>
          </div>
          <span className="px-3 py-1 text-sm font-medium bg-metro-blue-950 text-metro-blue border border-metro-blue-700 rounded-full">
            {pageTypeLabel}
          </span>
        </div>
      </div>

      {/* Summary Stats */}
      {data?.summary && (
        <div className="px-6 py-4 bg-dark-900 border-b border-dark-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-dark-800 rounded-lg p-3 border border-dark-700">
              <div className="text-2xl font-bold text-dark-100">
                {data.summary.total_pages.toLocaleString()}
              </div>
              <div className="text-sm text-dark-400">Total Pages</div>
            </div>
            <div className="bg-dark-800 rounded-lg p-3 border border-dark-700">
              <div className="text-2xl font-bold text-dark-100">
                {data.summary.unique_keywords}
              </div>
              <div className="text-sm text-dark-400">Keywords</div>
            </div>
            <div className="bg-dark-800 rounded-lg p-3 border border-dark-700">
              <div className="text-2xl font-bold text-dark-100">
                {data.summary.unique_service_areas}
              </div>
              <div className="text-sm text-dark-400">Locations</div>
            </div>
            <div className="bg-dark-800 rounded-lg p-3 border border-dark-700">
              <div className="flex gap-2">
                <span className="text-sm text-dark-100">
                  <span className="font-semibold">{data.summary.by_language.en}</span>{' '}
                  <span className="text-dark-400">EN</span>
                </span>
                <span className="text-dark-500">|</span>
                <span className="text-sm text-dark-100">
                  <span className="font-semibold">{data.summary.by_language.es}</span>{' '}
                  <span className="text-dark-400">ES</span>
                </span>
              </div>
              <div className="text-sm text-dark-400">By Language</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="px-6 py-3 border-b border-dark-700 flex flex-wrap gap-4 items-center">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search keywords, URLs, or locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 bg-dark-800 text-dark-100 placeholder:text-dark-500 border border-dark-600 rounded-lg focus:ring-2 focus:ring-metro-orange focus:border-metro-orange"
          />
        </div>

        {/* Language Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-dark-400">Language:</span>
          <select
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value as 'all' | 'en' | 'es');
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-dark-800 text-dark-100 border border-dark-600 rounded-lg focus:ring-2 focus:ring-metro-orange"
          >
            <option value="all">All</option>
            <option value="en">English</option>
            <option value="es">Spanish</option>
          </select>
        </div>

        {/* Results count */}
        {data?.pagination && (
          <div className="text-sm text-dark-400">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-
            {Math.min(currentPage * ITEMS_PER_PAGE, data.pagination.total)} of{' '}
            {data.pagination.total.toLocaleString()}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-metro-orange"></div>
            <span className="ml-3 text-dark-400">Loading preview...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-metro-red mb-2">Error: {error}</div>
            <button
              onClick={fetchPreview}
              className="text-metro-orange hover:underline"
            >
              Try again
            </button>
          </div>
        ) : flaggedPages.length === 0 ? (
          <div className="text-center py-12 text-dark-400">
            No pages found matching your criteria
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-dark-700">
              <thead className="bg-dark-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                    Keyword
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                    URL Path
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                    Lang
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-dark-800 divide-y divide-dark-700">
                {flaggedPages.map((page, idx) => (
                  <tr
                    key={`${page.url_path}-${idx}`}
                    className={page.issues.length > 0 ? 'bg-metro-yellow-950' : ''}
                  >
                    <td className="px-4 py-3 text-sm text-dark-100">
                      {page.keyword_text || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-100">
                      {page.service_area_city}, {page.service_area_state}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-dark-400">
                      {page.url_path}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const language = page.keyword_language || 'en';
                        return (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              language === 'es'
                                ? 'bg-purple-900/50 text-purple-400'
                                : 'bg-dark-800 text-dark-100'
                            }`}
                          >
                            {language.toUpperCase()}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      {page.issues.length > 0 ? (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-metro-yellow-950 text-metro-yellow"
                          title={page.issues.join(', ')}
                        >
                          Review
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-metro-green-950 text-metro-green">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="px-6 py-3 border-t border-dark-700 flex items-center justify-between bg-dark-900">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-medium text-dark-200 bg-dark-800 border border-dark-600 rounded-lg hover:bg-dark-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-dark-400">
            Page {currentPage} of {data.pagination.totalPages}
          </span>
          <button
            onClick={() =>
              setCurrentPage((p) => Math.min(data.pagination.totalPages, p + 1))
            }
            disabled={currentPage === data.pagination.totalPages}
            className="px-4 py-2 text-sm font-medium text-dark-200 bg-dark-800 border border-dark-600 rounded-lg hover:bg-dark-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Footer Actions */}
      <div className="px-6 py-4 border-t border-dark-700 bg-dark-900 flex items-center justify-between">
        <div className="text-sm text-dark-400">
          {data?.summary && (
            <>
              Ready to generate <strong>{data.summary.total_pages.toLocaleString()}</strong> pages
            </>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-dark-200 bg-dark-800 border border-dark-600 rounded-lg hover:bg-dark-900"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!data?.summary || data.summary.total_pages === 0}
            className="px-6 py-2 text-sm font-medium text-dark-950 bg-metro-orange rounded-lg hover:bg-metro-orange-600 hover:shadow-glow-orange disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Start Generation
          </button>
        </div>
      </div>
    </div>
  );
}

export default PagePreview;
