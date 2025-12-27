/**
 * Unit tests for GeneratedPageViewer component
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GeneratedPageViewer } from "../GeneratedPageViewer";
import * as jobsApi from "../../../api/jobs";
import type { JobPage } from "@marketbrewer/shared";

// Mock the jobs API
jest.mock("../../../api/jobs");
const mockedGetJobPages = jobsApi.getJobPages as jest.MockedFunction<
  typeof jobsApi.getJobPages
>;

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

const mockJobPage: JobPage = {
  id: "page-1",
  job_id: "job-1",
  business_id: "biz-1",
  keyword_slug: "criminal-defense-lawyer",
  keyword_text: "Criminal Defense Lawyer",
  keyword_language: "en",
  service_area_slug: "bethesda-md",
  url_path: "/criminal-defense-lawyer/bethesda-md",
  status: "completed",
  location_status: "active",
  worker_id: "worker-1",
  attempts: 1,
  claimed_at: "2025-01-01T00:00:00Z",
  completed_at: "2025-01-01T00:01:00Z",
  content: JSON.stringify({
    h1: "Criminal Defense Lawyer in Bethesda, MD",
    intro: "<p>Expert legal representation for your case.</p>",
    sections: [
      {
        heading: "Why Choose Us",
        body: "<p>We have 20+ years of experience.</p>",
      },
    ],
    cta: "Call us today for a free consultation!",
    meta: {
      title: "Criminal Defense Lawyer | Bethesda MD",
      description: "Expert criminal defense lawyer in Bethesda, Maryland.",
    },
  }),
  error_message: null,
  section_count: 3,
  model_name: "llama3.2",
  prompt_version: "1.0",
  generation_duration_ms: 5000,
  word_count: 250,
  created_at: "2025-01-01T00:00:00Z",
};

const mockFailedPage: JobPage = {
  ...mockJobPage,
  id: "page-2",
  status: "failed",
  content: null,
  error_message: "LLM timeout after 30 seconds",
  completed_at: null,
};

const mockPagesResponse: jobsApi.JobPagesResponse = {
  pages: [mockJobPage],
  pagination: {
    page: 1,
    limit: 20,
    total: 1,
    totalPages: 1,
  },
  counts: {
    queued: 0,
    processing: 0,
    completed: 1,
    failed: 0,
  },
};

const mockEmptyResponse: jobsApi.JobPagesResponse = {
  pages: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  counts: {
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  },
};

describe("GeneratedPageViewer", () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Loading state", () => {
    it("shows loading spinner while fetching pages", async () => {
      mockedGetJobPages.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockPagesResponse), 100))
      );

      render(<GeneratedPageViewer jobId="job-1" onClose={mockOnClose} />);

      // Should show loading spinner
      expect(screen.getByRole("heading", { name: /generated page content/i })).toBeInTheDocument();
    });
  });

  describe("Empty state", () => {
    it("shows 'No pages found' when no pages match filter", async () => {
      mockedGetJobPages.mockResolvedValue(mockEmptyResponse);

      render(<GeneratedPageViewer jobId="job-1" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText(/no pages found/i)).toBeInTheDocument();
      });
    });
  });

  describe("With pages", () => {
    it("renders page list and content area", async () => {
      mockedGetJobPages.mockResolvedValue(mockPagesResponse);

      render(<GeneratedPageViewer jobId="job-1" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Criminal Defense Lawyer")).toBeInTheDocument();
      });

      // Should show the URL path
      expect(screen.getByText("/criminal-defense-lawyer/bethesda-md")).toBeInTheDocument();
    });

    it("auto-selects first page on load", async () => {
      mockedGetJobPages.mockResolvedValue(mockPagesResponse);

      render(<GeneratedPageViewer jobId="job-1" onClose={mockOnClose} />);

      await waitFor(() => {
        // Check content area shows page content
        expect(screen.getByText("Criminal Defense Lawyer in Bethesda, MD")).toBeInTheDocument();
      });
    });

    it("shows preview mode by default", async () => {
      mockedGetJobPages.mockResolvedValue(mockPagesResponse);

      render(<GeneratedPageViewer jobId="job-1" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /preview/i })).toHaveClass("bg-metro-orange");
      });
    });

    it("can switch to JSON view mode", async () => {
      mockedGetJobPages.mockResolvedValue(mockPagesResponse);

      render(<GeneratedPageViewer jobId="job-1" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Criminal Defense Lawyer")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /json/i }));

      // JSON view should be active
      expect(screen.getByRole("button", { name: /json/i })).toHaveClass("bg-metro-orange");
    });

    it("displays word count and generation duration", async () => {
      mockedGetJobPages.mockResolvedValue(mockPagesResponse);

      render(<GeneratedPageViewer jobId="job-1" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText(/words: 250/i)).toBeInTheDocument();
        expect(screen.getByText(/generated in 5.0s/i)).toBeInTheDocument();
        expect(screen.getByText(/model: llama3.2/i)).toBeInTheDocument();
      });
    });
  });

  describe("Filtering", () => {
    it("calls API with filter when status filter is changed", async () => {
      mockedGetJobPages.mockResolvedValue(mockPagesResponse);

      render(<GeneratedPageViewer jobId="job-1" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(mockedGetJobPages).toHaveBeenCalledWith(
          "job-1",
          expect.objectContaining({ status: "completed" })
        );
      });

      // Change filter to "All"
      fireEvent.click(screen.getByRole("button", { name: /^all$/i }));

      await waitFor(() => {
        expect(mockedGetJobPages).toHaveBeenCalledWith(
          "job-1",
          expect.objectContaining({ status: undefined })
        );
      });
    });

    it("calls API with search term when searching", async () => {
      mockedGetJobPages.mockResolvedValue(mockPagesResponse);

      render(<GeneratedPageViewer jobId="job-1" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search pages/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search pages/i);
      fireEvent.change(searchInput, { target: { value: "bethesda" } });

      await waitFor(() => {
        expect(mockedGetJobPages).toHaveBeenCalledWith(
          "job-1",
          expect.objectContaining({ search: "bethesda" })
        );
      });
    });
  });

  describe("Error handling", () => {
    it("shows error message when API fails", async () => {
      mockedGetJobPages.mockRejectedValue(new Error("Network error"));

      render(<GeneratedPageViewer jobId="job-1" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe("Failed pages", () => {
    it("displays error message for failed pages", async () => {
      mockedGetJobPages.mockResolvedValue({
        ...mockPagesResponse,
        pages: [mockFailedPage],
      });

      render(<GeneratedPageViewer jobId="job-1" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText(/llm timeout after 30 seconds/i)).toBeInTheDocument();
      });
    });
  });

  describe("Copy to clipboard", () => {
    it("copies content when copy button is clicked", async () => {
      mockedGetJobPages.mockResolvedValue(mockPagesResponse);

      render(<GeneratedPageViewer jobId="job-1" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Criminal Defense Lawyer")).toBeInTheDocument();
      });

      const copyButton = screen.getByRole("button", { name: /copy/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockJobPage.content);
      });
    });
  });

  describe("Close functionality", () => {
    it("calls onClose when close button is clicked", async () => {
      mockedGetJobPages.mockResolvedValue(mockPagesResponse);

      render(<GeneratedPageViewer jobId="job-1" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText("Criminal Defense Lawyer")).toBeInTheDocument();
      });

      // Find and click the close button (X icon)
      const closeButtons = screen.getAllByRole("button");
      const closeButton = closeButtons.find((btn) =>
        btn.querySelector("svg path[d*='M6 18L18 6']")
      );

      if (closeButton) {
        fireEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });

  describe("Pagination", () => {
    it("shows pagination controls when multiple pages exist", async () => {
      mockedGetJobPages.mockResolvedValue({
        ...mockPagesResponse,
        pagination: {
          page: 1,
          limit: 20,
          total: 40,
          totalPages: 2,
        },
      });

      render(<GeneratedPageViewer jobId="job-1" onClose={mockOnClose} />);

      // Wait for page content to load first
      await waitFor(() => {
        expect(screen.getByText("Criminal Defense Lawyer")).toBeInTheDocument();
      });

      // Now check pagination
      expect(screen.getByText("1 / 2")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Prev" })).toBeInTheDocument();
    });

    it("navigates to next page when next button is clicked", async () => {
      mockedGetJobPages.mockResolvedValue({
        ...mockPagesResponse,
        pagination: {
          page: 1,
          limit: 20,
          total: 40,
          totalPages: 2,
        },
      });

      render(<GeneratedPageViewer jobId="job-1" onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        expect(mockedGetJobPages).toHaveBeenCalledWith(
          "job-1",
          expect.objectContaining({ page: 2 })
        );
      });
    });
  });
});

describe("GeneratedPageViewer content parsing", () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders structured JSON content with SEO meta preview", async () => {
    mockedGetJobPages.mockResolvedValue(mockPagesResponse);

    render(<GeneratedPageViewer jobId="job-1" onClose={mockOnClose} />);

    await waitFor(() => {
      // Should show meta title preview
      expect(screen.getByText("Criminal Defense Lawyer | Bethesda MD")).toBeInTheDocument();
      // Should show meta description preview
      expect(
        screen.getByText("Expert criminal defense lawyer in Bethesda, Maryland.")
      ).toBeInTheDocument();
      // Should show H1
      expect(screen.getByText("Criminal Defense Lawyer in Bethesda, MD")).toBeInTheDocument();
      // Should show section heading
      expect(screen.getByText("Why Choose Us")).toBeInTheDocument();
      // Should show CTA
      expect(screen.getByText("Call us today for a free consultation!")).toBeInTheDocument();
    });
  });

  it("handles raw HTML content (non-JSON)", async () => {
    const rawHtmlPage: JobPage = {
      ...mockJobPage,
      content: "<h1>Raw HTML Content</h1><p>This is plain HTML.</p>",
    };

    mockedGetJobPages.mockResolvedValue({
      ...mockPagesResponse,
      pages: [rawHtmlPage],
    });

    render(<GeneratedPageViewer jobId="job-1" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText("Raw HTML Content")).toBeInTheDocument();
    });
  });

  it("shows 'No content generated yet' for pages without content", async () => {
    const noContentPage: JobPage = {
      ...mockJobPage,
      status: "queued",
      content: null,
    };

    mockedGetJobPages.mockResolvedValue({
      ...mockPagesResponse,
      pages: [noContentPage],
    });

    render(<GeneratedPageViewer jobId="job-1" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText(/no content generated yet/i)).toBeInTheDocument();
    });
  });
});
