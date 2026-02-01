import apiClient from "../client";
import {
  listKeywords,
  createKeyword,
  updateKeyword,
  deleteKeyword,
} from "../keywords";

jest.mock("../client");

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("keywords api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists keywords", async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: { keywords: [] } });

    await listKeywords("b1");

    expect(mockApiClient.get).toHaveBeenCalledWith("/api/businesses/b1/keywords");
  });

  it("creates keyword", async () => {
    const payload = { keyword: "local seo", language: "en" };
    mockApiClient.post.mockResolvedValueOnce({ data: { keyword: { id: "k1" } } });

    await createKeyword("b1", payload);

    expect(mockApiClient.post).toHaveBeenCalledWith("/api/businesses/b1/keywords", payload);
  });

  it("updates keyword", async () => {
    const updates = { keyword: "updated" };
    mockApiClient.put.mockResolvedValueOnce({ data: { keyword: { id: "k1" } } });

    await updateKeyword("b1", "k1", updates);

    expect(mockApiClient.put).toHaveBeenCalledWith("/api/businesses/b1/keywords/k1", updates);
  });

  it("deletes keyword", async () => {
    mockApiClient.delete.mockResolvedValueOnce({});

    await deleteKeyword("b1", "k1");

    expect(mockApiClient.delete).toHaveBeenCalledWith("/api/businesses/b1/keywords/k1");
  });
});
