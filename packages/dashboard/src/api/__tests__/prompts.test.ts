import apiClient from "../client";
import {
  listPromptTemplates,
  getPromptTemplate,
  createPromptTemplate,
  updatePromptTemplate,
  deletePromptTemplate,
} from "../prompts";

jest.mock("../client");

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("prompts api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists prompt templates", async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: { prompt_templates: [] } });

    await listPromptTemplates("b1");

    expect(mockApiClient.get).toHaveBeenCalledWith(
      "/api/businesses/b1/prompts",
      { signal: undefined }
    );
  });

  it("gets a prompt template", async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: { prompt_template: { id: "p1" } } });

    await getPromptTemplate("b1", "p1");

    expect(mockApiClient.get).toHaveBeenCalledWith(
      "/api/businesses/b1/prompts/p1",
      { signal: undefined }
    );
  });

  it("creates a prompt template", async () => {
    const payload = {
      page_type: "keyword-service-area" as const,
      version: 1,
      template: "hello",
      word_count_target: 400,
    };
    mockApiClient.post.mockResolvedValueOnce({ data: { prompt_template: { id: "p1" } } });

    await createPromptTemplate("b1", payload);

    expect(mockApiClient.post).toHaveBeenCalledWith(
      "/api/businesses/b1/prompts",
      payload,
      { signal: undefined }
    );
  });

  it("updates a prompt template", async () => {
    const updates = { template: "updated" };
    mockApiClient.put.mockResolvedValueOnce({ data: { prompt_template: { id: "p1" } } });

    await updatePromptTemplate("b1", "p1", updates);

    expect(mockApiClient.put).toHaveBeenCalledWith(
      "/api/businesses/b1/prompts/p1",
      updates,
      { signal: undefined }
    );
  });

  it("deletes a prompt template", async () => {
    mockApiClient.delete.mockResolvedValueOnce({});

    await deletePromptTemplate("b1", "p1");

    expect(mockApiClient.delete).toHaveBeenCalledWith(
      "/api/businesses/b1/prompts/p1",
      { signal: undefined }
    );
  });
});
