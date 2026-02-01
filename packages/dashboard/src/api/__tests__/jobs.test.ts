import apiClient from "../client";
import {
  createJob,
  getJobStatus,
  getJobs,
  previewPages,
  getJobPages,
} from "../jobs";

jest.mock("../client");

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("jobs api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a job", async () => {
    mockApiClient.post.mockResolvedValueOnce({ data: { job: { id: "j1" }, total_pages_created: 1 } });

    await createJob("b1", "keyword-service-area");

    expect(mockApiClient.post).toHaveBeenCalledWith(
      "/api/businesses/b1/generate",
      { page_type: "keyword-service-area" }
    );
  });

  it("gets job status", async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: { job: { id: "j1" } } });

    await getJobStatus("b1", "j1");

    expect(mockApiClient.get).toHaveBeenCalledWith("/api/businesses/b1/jobs/j1");
  });

  it("lists jobs", async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: { jobs: [] } });

    await getJobs("b1");

    expect(mockApiClient.get).toHaveBeenCalledWith("/api/businesses/b1/jobs");
  });

  it("previews pages with filters", async () => {
    mockApiClient.post.mockResolvedValueOnce({ data: { pages: [], pagination: {}, summary: {}, business: {}, page_type: "keyword-service-area" } });

    const signal = new AbortController().signal;
    await previewPages("b1", "keyword-location", { search: "abc", language: "en", page: 2, limit: 10 }, signal);

    expect(mockApiClient.post).toHaveBeenCalledWith(
      "/api/businesses/b1/generate/preview?search=abc&language=en&page=2&limit=10",
      { page_type: "keyword-location" },
      { signal }
    );
  });

  it("gets job pages with filters", async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: { pages: [], pagination: {}, counts: {} } });

    const signal = new AbortController().signal;
    await getJobPages("j1", { status: "completed", search: "bethesda", page: 3, limit: 5, sort: "created_at", order: "asc" }, signal);

    expect(mockApiClient.get).toHaveBeenCalledWith(
      "/api/jobs/j1/pages?status=completed&search=bethesda&page=3&limit=5&sort=created_at&order=asc",
      { signal }
    );
  });
});
