/**
 * GeneratedPageViewer - View individual generated page content
 *
 * Features:
 * - View full HTML content of generated pages
 * - Preview how the page will render
 * - Copy content to clipboard
 * - View metadata and stats
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getJobPages, JobPagesResponse } from '../../api/jobs';
import type { JobPage } from '@marketbrewer/shared';

interface GeneratedPageViewerProps {
  jobId: string;
  onClose: () => void;
}

export function GeneratedPageViewer({ jobId, onClose }: GeneratedPageViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<JobPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<JobPage | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'json'>('preview');
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed'>('completed');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<JobPagesResponse['pagination'] | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const ITEMS_PER_PAGE = 20;

  // Fetch pages
  const fetchPages = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getJobPages(jobId, {
        status: filter === 'all' ? undefined : filter,
        search: search || undefined,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      });
      setPages(result.pages);
      setPagination(result.pagination);

      // Auto-select first page if none selected
      if (!selectedPage && result.pages.length > 0) {
        setSelectedPage(result.pages[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pages');
    } finally {
      setLoading(false);
    }
  }, [jobId, filter, search, currentPage, selectedPage]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  // Copy content to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Download page as PDF
  const downloadPdf = async () => {
    if (!selectedPage || !contentRef.current) return;

    setGeneratingPdf(true);

    try {
      const parsed = parseContent(selectedPage.content);
      const languageLabel = selectedPage.keyword_language === 'es' ? 'Español' : 'English';
      const generatedDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Build HTML for PDF - MarketBrewer official branding with Geist font and Metro colors
      const pdfHtml = `<!DOCTYPE html>
<html lang="${selectedPage.keyword_language}">
<head>
  <meta charset="UTF-8">
  <title>${selectedPage.keyword_text || selectedPage.keyword_slug} - ${selectedPage.url_path}</title>
  <style>
    /* Geist font - fallback to system fonts for PDF */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    /* MarketBrewer Design System Colors */
    :root {
      --metro-red: #BF0D3E;
      --metro-orange: #ED8B00;
      --metro-yellow: #FFD100;
      --metro-green: #00B140;
      --metro-blue: #009CDE;
      --metro-silver: #919D9D;
      --dark-900: #0f172a;
      --dark-800: #1e293b;
      --dark-700: #334155;
      --dark-600: #475569;
      --dark-500: #64748b;
      --dark-400: #94a3b8;
      --dark-300: #cbd5e1;
      --dark-200: #e2e8f0;
      --dark-100: #f1f5f9;
      --dark-50: #f8fafc;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: var(--dark-900);
      background: #fff;
      -webkit-font-smoothing: antialiased;
    }

    .page {
      max-width: 100%;
      margin: 0 auto;
      padding: 40px 50px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* Metro stripe decoration */
    .metro-stripe {
      height: 4px;
      background: linear-gradient(90deg,
        var(--metro-red) 0%, var(--metro-red) 16.67%,
        var(--metro-orange) 16.67%, var(--metro-orange) 33.33%,
        var(--metro-yellow) 33.33%, var(--metro-yellow) 50%,
        var(--metro-green) 50%, var(--metro-green) 66.67%,
        var(--metro-blue) 66.67%, var(--metro-blue) 83.33%,
        var(--metro-silver) 83.33%, var(--metro-silver) 100%
      );
      margin-bottom: 24px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }

    .logo {
      font-size: 22pt;
      font-weight: 700;
      color: var(--dark-900);
      letter-spacing: -0.5px;
    }
    .logo span { color: var(--metro-orange); }

    .meta-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--dark-900);
      color: var(--dark-50);
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 9pt;
      font-weight: 500;
    }

    .page-info {
      background: var(--dark-50);
      border: 1px solid var(--dark-200);
      border-left: 4px solid var(--metro-orange);
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 30px;
    }

    .page-title {
      font-size: 18pt;
      font-weight: 700;
      color: var(--dark-900);
      margin-bottom: 8px;
      text-transform: capitalize;
    }

    .page-location {
      font-size: 12pt;
      color: var(--metro-blue);
      font-weight: 500;
      margin-bottom: 16px;
    }

    .page-stats {
      display: flex;
      gap: 32px;
      flex-wrap: wrap;
    }

    .stat { display: flex; flex-direction: column; }
    .stat-label {
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--dark-500);
      margin-bottom: 2px;
    }
    .stat-value {
      font-size: 11pt;
      font-weight: 600;
      color: var(--dark-900);
    }

    .content { flex: 1; padding: 0; }

    .content h1 {
      font-size: 20pt;
      font-weight: 700;
      color: var(--dark-900);
      margin-bottom: 16px;
    }

    .content h2 {
      font-size: 14pt;
      font-weight: 700;
      color: var(--dark-900);
      margin: 24px 0 12px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--metro-orange);
    }

    .content h3 {
      font-size: 12pt;
      font-weight: 600;
      color: var(--dark-700);
      margin: 20px 0 10px 0;
    }

    .content p { margin-bottom: 12px; text-align: justify; }
    .content ul { margin: 12px 0; padding-left: 24px; }
    .content li { margin-bottom: 6px; }

    .meta-box {
      margin-bottom: 16px;
      padding: 12px 16px;
      border-radius: 8px;
      border: 1px solid;
    }
    .meta-box.title {
      background: rgba(0, 156, 222, 0.08);
      border-color: rgba(0, 156, 222, 0.3);
    }
    .meta-box.desc {
      background: rgba(0, 177, 64, 0.08);
      border-color: rgba(0, 177, 64, 0.3);
    }
    .meta-box-label {
      font-size: 8pt;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .meta-box.title .meta-box-label { color: var(--metro-blue); }
    .meta-box.desc .meta-box-label { color: var(--metro-green); }

    .cta-box {
      margin-top: 24px;
      padding: 16px;
      background: rgba(237, 139, 0, 0.08);
      border: 1px solid rgba(237, 139, 0, 0.3);
      border-radius: 8px;
    }
    .cta-label {
      font-size: 8pt;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--metro-orange);
      margin-bottom: 4px;
    }

    .footer {
      margin-top: auto;
      padding-top: 24px;
      border-top: 1px solid var(--dark-200);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9pt;
      color: var(--dark-500);
    }
    .footer a {
      color: var(--metro-orange);
      text-decoration: none;
      font-weight: 600;
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 30px 40px; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="metro-stripe"></div>
    <header class="header">
      <div class="logo">Market<span>Brewer</span></div>
      <div class="meta-badge">
        <span>${languageLabel}</span>
        <span>•</span>
        <span>SEO Content Preview</span>
      </div>
    </header>
    <div class="page-info">
      <h1 class="page-title">${selectedPage.keyword_text || selectedPage.keyword_slug || 'Generated Page'}</h1>
      <div class="page-location">${selectedPage.url_path}</div>
      <div class="page-stats">
        <div class="stat">
          <span class="stat-label">Word Count</span>
          <span class="stat-value">${selectedPage.word_count?.toLocaleString() || 'N/A'}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Model</span>
          <span class="stat-value">${selectedPage.model_name || 'N/A'}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Generation Time</span>
          <span class="stat-value">${selectedPage.generation_duration_ms ? (selectedPage.generation_duration_ms / 1000).toFixed(1) + 's' : 'N/A'}</span>
        </div>
      </div>
    </div>
    <div class="content">
      ${parsed.meta?.title ? `<div class="meta-box title"><div class="meta-box-label">SEO Title</div><div>${parsed.meta.title}</div></div>` : ''}
      ${parsed.meta?.description ? `<div class="meta-box desc"><div class="meta-box-label">Meta Description</div><div>${parsed.meta.description}</div></div>` : ''}
      ${parsed.h1 ? `<h1>${parsed.h1}</h1>` : ''}
      ${parsed.intro ? `<p>${parsed.intro}</p>` : ''}
      ${parsed.sections?.map(s => `<h2>${s.heading}</h2><p>${s.body}</p>`).join('') || ''}
      ${parsed.cta ? `<div class="cta-box"><div class="cta-label">Call to Action</div><div>${parsed.cta}</div></div>` : ''}
      ${!parsed.isJson && parsed.raw ? parsed.raw : ''}
    </div>
    <footer class="footer">
      <div>Powered by <a href="https://marketbrewer.com">marketbrewer.com</a></div>
      <div style="font-style: italic;">Generated ${generatedDate} • For review purposes only</div>
    </footer>
  </div>
</body>
</html>`;

      // Open in new window and trigger print
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(pdfHtml);
        printWindow.document.close();

        // Wait for fonts to load then print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
      }
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Helper to check if a string has meaningful content (not just punctuation/whitespace)
  const hasMeaningfulContent = (str: string): boolean => {
    if (!str) return false;
    // Remove HTML tags, then check if there's actual text content
    const textOnly = str.replace(/<[^>]*>/g, '').trim();
    // Must have at least 2 alphanumeric characters to be meaningful
    return /[a-zA-Z0-9]{2,}/.test(textOnly);
  };

  // Check if an object looks like a repeated full page response (LLM error)
  // These have title, meta_description, h1, etc. - shouldn't be in section body
  const isRepeatedPageJson = (obj: Record<string, unknown>): boolean => {
    const pageKeys = ['title', 'meta_description', 'h1', 'meta'];
    const matchingKeys = pageKeys.filter(key => key in obj);
    return matchingKeys.length >= 2; // If it has 2+ page-level keys, it's repeated output
  };

  // Helper to safely render a value that might be a string or object
  // Also detects JSON strings that the LLM mistakenly output as text
  const renderValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      // Check if the string is actually JSON that got stringified
      const trimmed = value.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          // If it parsed successfully and is an object
          if (typeof parsed === 'object' && parsed !== null) {
            // Check if this is a repeated full page JSON (LLM error)
            if (isRepeatedPageJson(parsed)) {
              // Return empty - this is garbage data (repeated JSON output)
              return '';
            }
            // Try to extract meaningful text from common fields
            const textParts: string[] = [];
            if (parsed.body && typeof parsed.body === 'string') {
              textParts.push(parsed.body);
            }
            if (parsed.content && typeof parsed.content === 'string') {
              textParts.push(parsed.content);
            }
            if (parsed.text && typeof parsed.text === 'string') {
              textParts.push(parsed.text);
            }
            // If we found meaningful text, return it
            if (textParts.length > 0) {
              return textParts.join(' ');
            }
          }
        } catch {
          // Not valid JSON, return as-is
        }
      }
      return value;
    }
    if (typeof value === 'object') {
      // Handle {text, url} link objects
      if ('text' in value && typeof (value as Record<string, unknown>).text === 'string') {
        const obj = value as { text: string; url?: string };
        if (obj.url) {
          return `<a href="${obj.url}">${obj.text}</a>`;
        }
        return obj.text;
      }
      // Handle objects with body/content fields
      const obj = value as Record<string, unknown>;
      if (obj.body && typeof obj.body === 'string') {
        return obj.body;
      }
      if (obj.content && typeof obj.content === 'string') {
        return obj.content;
      }
      // Fallback: stringify the object
      return JSON.stringify(value);
    }
    return String(value);
  };

  // Parse content JSON - handles multiple formats from LLM output
  const parseContent = (content: string | null): {
    isJson: boolean;
    h1?: string;
    intro?: string;
    sections?: Array<{ heading: string; body: string }>;
    cta?: string;
    meta?: { title?: string; description?: string };
    raw: string;
  } => {
    if (!content) {
      return { isJson: false, raw: '' };
    }

    try {
      const parsed = JSON.parse(content);

      // Check if this looks like structured content (has h1 or title)
      const hasStructuredContent = parsed.h1 || parsed.content?.h1 || parsed.title;

      if (hasStructuredContent) {
        // Handle nested format (content.h1) or flat format (h1 at root)
        const data = parsed.content || parsed;

        // Parse sections - handle both {heading, body} and {heading, content} formats
        const sections = Array.isArray(data.sections)
          ? data.sections.map((s: { heading?: unknown; body?: unknown; content?: unknown }) => ({
              heading: renderValue(s.heading),
              body: renderValue(s.body || s.content), // LLM uses "content" sometimes
            }))
          : undefined;

        // Get meta - handle nested (meta.title) or flat (title at root) formats
        const metaTitle = parsed.meta?.title || parsed.title;
        const metaDesc = parsed.meta?.description || parsed.meta_description;

        // Get intro - handle "intro" or "body" (LLM sometimes uses body for main content)
        // Show body as intro if it exists and is a string
        const intro = data.intro || (typeof data.body === 'string' ? data.body : undefined);

        return {
          isJson: true,
          h1: renderValue(data.h1),
          intro: renderValue(intro),
          sections,
          cta: renderValue(data.cta),
          meta: (metaTitle || metaDesc)
            ? {
                title: renderValue(metaTitle),
                description: renderValue(metaDesc),
              }
            : undefined,
          raw: content,
        };
      }
    } catch {
      // Not JSON, treat as raw HTML/text
    }

    return { isJson: false, raw: content };
  };

  const renderContent = () => {
    if (!selectedPage?.content) {
      return (
        <div className="flex items-center justify-center h-64 text-dark-500">
          No content generated yet
        </div>
      );
    }

    const parsed = parseContent(selectedPage.content);

    if (viewMode === 'json') {
      return (
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm font-mono whitespace-pre-wrap">
          {JSON.stringify(parsed.isJson ? JSON.parse(parsed.raw) : { raw: parsed.raw }, null, 2)}
        </pre>
      );
    }

    // Preview mode
    if (parsed.isJson) {
      return (
        <div className="prose prose-lg max-w-none">
          {parsed.meta?.title && hasMeaningfulContent(parsed.meta.title) && (
            <div className="mb-4 p-3 bg-metro-blue-950 rounded-lg border border-metro-blue-700">
              <div className="text-xs text-metro-orange font-medium mb-1">SEO Title</div>
              <div
                className="text-dark-100"
                dangerouslySetInnerHTML={{ __html: parsed.meta.title }}
              />
            </div>
          )}
          {parsed.meta?.description && hasMeaningfulContent(parsed.meta.description) && (
            <div className="mb-4 p-3 bg-metro-green-950 rounded-lg border border-metro-green-700">
              <div className="text-xs text-metro-green font-medium mb-1">Meta Description</div>
              <div
                className="text-dark-200 text-sm"
                dangerouslySetInnerHTML={{ __html: parsed.meta.description }}
              />
            </div>
          )}
          {parsed.h1 && hasMeaningfulContent(parsed.h1) && (
            <h1
              className="text-3xl font-bold text-dark-100 mb-4"
              dangerouslySetInnerHTML={{ __html: parsed.h1 }}
            />
          )}
          {parsed.intro && hasMeaningfulContent(parsed.intro) && (
            <div
              className="text-lg text-dark-200 mb-6"
              dangerouslySetInnerHTML={{ __html: parsed.intro }}
            />
          )}
          {parsed.sections
            ?.filter((section) => hasMeaningfulContent(section.heading) || hasMeaningfulContent(section.body))
            .map((section, idx) => (
              <div key={idx} className="mb-6">
                {hasMeaningfulContent(section.heading) && (
                  <h2
                    className="text-xl font-semibold text-dark-100 mb-2"
                    dangerouslySetInnerHTML={{ __html: section.heading }}
                  />
                )}
                {hasMeaningfulContent(section.body) && (
                  <div
                    className="text-dark-200"
                    dangerouslySetInnerHTML={{ __html: section.body }}
                  />
                )}
              </div>
            ))}
          {parsed.cta && hasMeaningfulContent(parsed.cta) && (
            <div className="mt-6 p-4 bg-metro-orange-950 rounded-lg border border-metro-orange-700">
              <div className="text-xs text-metro-orange font-medium mb-1">Call to Action</div>
              <div
                className="text-dark-100 font-medium"
                dangerouslySetInnerHTML={{ __html: parsed.cta }}
              />
            </div>
          )}
        </div>
      );
    }

    // Raw HTML preview
    return (
      <div
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: parsed.raw }}
      />
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-dark-800 rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-dark-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-dark-100">Generated Page Content</h2>
            <p className="text-sm text-dark-400">Job ID: {jobId}</p>
          </div>
          <button
            onClick={onClose}
            className="text-dark-500 hover:text-dark-400 p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Page List */}
          <div className="w-80 border-r border-dark-700 flex flex-col bg-dark-900">
            {/* Filters */}
            <div className="p-3 border-b border-dark-700 space-y-2">
              <input
                type="text"
                placeholder="Search pages..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 text-sm bg-dark-800 text-dark-100 placeholder:text-dark-500 border border-dark-600 rounded-lg focus:ring-2 focus:ring-metro-orange"
              />
              <div className="flex gap-1">
                {(['all', 'completed', 'failed'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setFilter(f);
                      setCurrentPage(1);
                    }}
                    className={`flex-1 px-2 py-1 text-xs font-medium rounded ${
                      filter === f
                        ? 'bg-metro-orange text-dark-950'
                        : 'bg-dark-800 text-dark-400 hover:bg-dark-700 border border-dark-600'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Page List */}
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-metro-orange"></div>
                </div>
              ) : error ? (
                <div className="p-4 text-center text-metro-red text-sm">{error}</div>
              ) : pages.length === 0 ? (
                <div className="p-4 text-center text-dark-400 text-sm">No pages found</div>
              ) : (
                <div className="divide-y divide-dark-700">
                  {pages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => setSelectedPage(page)}
                      className={`w-full px-3 py-3 text-left hover:bg-dark-800 transition-colors ${
                        selectedPage?.id === page.id ? 'bg-metro-orange-950/30 border-l-4 border-metro-orange' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-dark-100 truncate">
                            {page.keyword_text || page.keyword_slug || 'Service Area Page'}
                          </div>
                          <div className="text-xs text-dark-400 truncate mt-0.5">
                            {page.url_path}
                          </div>
                        </div>
                        <div className="ml-2 flex flex-col items-end gap-1">
                          <span
                            className={`inline-flex px-2 py-0.5 text-xs rounded-full ${
                              page.status === 'completed'
                                ? 'bg-metro-green-950 text-metro-green-600'
                                : page.status === 'failed'
                                ? 'bg-metro-red-950 text-metro-red-600'
                                : page.status === 'processing'
                                ? 'bg-metro-yellow-950 text-yellow-700'
                                : 'bg-dark-800 text-dark-400'
                            }`}
                          >
                            {page.status}
                          </span>
                          <span className="text-xs text-dark-500">
                            {page.keyword_language.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      {page.word_count && (
                        <div className="text-xs text-dark-500 mt-1">
                          {page.word_count} words
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="p-2 border-t border-dark-700 flex items-center justify-between text-xs">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 bg-dark-800 border border-dark-600 rounded disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="text-dark-400">
                  {currentPage} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={currentPage === pagination.totalPages}
                  className="px-2 py-1 bg-dark-800 border border-dark-600 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedPage ? (
              <>
                {/* Content Header */}
                <div className="px-6 py-3 border-b border-dark-700 flex items-center justify-between bg-dark-900">
                  <div>
                    <h3 className="font-medium text-dark-100">{selectedPage.url_path}</h3>
                    <div className="flex items-center gap-4 text-sm text-dark-400 mt-1">
                      <span>Language: {selectedPage.keyword_language.toUpperCase()}</span>
                      {selectedPage.word_count && <span>Words: {selectedPage.word_count}</span>}
                      {selectedPage.generation_duration_ms && (
                        <span>Generated in {(selectedPage.generation_duration_ms / 1000).toFixed(1)}s</span>
                      )}
                      {selectedPage.model_name && <span>Model: {selectedPage.model_name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* View Mode Toggle */}
                    <div className="flex border border-dark-600 rounded-lg overflow-hidden">
                      {(['preview', 'json'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setViewMode(mode)}
                          className={`px-3 py-1.5 text-sm font-medium ${
                            viewMode === mode
                              ? 'bg-metro-orange text-dark-950'
                              : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                          }`}
                        >
                          {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </button>
                      ))}
                    </div>
                    {/* Copy Button */}
                    <button
                      onClick={() => copyToClipboard(selectedPage.content || '')}
                      disabled={!selectedPage.content}
                      className="px-3 py-1.5 text-sm font-medium bg-dark-800 border border-dark-600 rounded-lg hover:bg-dark-900 disabled:opacity-50 flex items-center gap-1"
                    >
                      {copied ? (
                        <>
                          <svg className="w-4 h-4 text-metro-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                    {/* PDF Download Button */}
                    <button
                      onClick={downloadPdf}
                      disabled={!selectedPage.content || generatingPdf}
                      className="px-3 py-1.5 text-sm font-medium bg-metro-blue text-dark-950 rounded-lg hover:bg-metro-blue-600 disabled:opacity-50 flex items-center gap-1"
                    >
                      {generatingPdf ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          PDF
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Content Display */}
                <div ref={contentRef} className="flex-1 overflow-auto p-6">
                  {renderContent()}
                </div>

                {/* Error Message */}
                {selectedPage.status === 'failed' && selectedPage.error_message && (
                  <div className="px-6 py-3 bg-metro-red-950 border-t border-red-200">
                    <div className="text-sm text-metro-red-600">
                      <strong>Error:</strong> {selectedPage.error_message}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-dark-500">
                Select a page from the list to view its content
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GeneratedPageViewer;
