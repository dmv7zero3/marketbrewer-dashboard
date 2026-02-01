import apiClient from "../client";
import { getWebhooks, createWebhook, deleteWebhook } from "../webhooks";

jest.mock("../client");

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("webhooks api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists webhooks", async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: { webhooks: [] } });

    await getWebhooks();

    expect(mockApiClient.get).toHaveBeenCalledWith("/api/webhooks");
  });

  it("creates a webhook", async () => {
    const payload = { url: "https://example.com", events: ["job.completed"] as const };
    mockApiClient.post.mockResolvedValueOnce({ data: { webhook: { id: "w1" } } });

    await createWebhook(payload);

    expect(mockApiClient.post).toHaveBeenCalledWith("/api/webhooks", payload);
  });

  it("deletes a webhook", async () => {
    mockApiClient.delete.mockResolvedValueOnce({});

    await deleteWebhook("w1");

    expect(mockApiClient.delete).toHaveBeenCalledWith("/api/webhooks/w1");
  });
});
