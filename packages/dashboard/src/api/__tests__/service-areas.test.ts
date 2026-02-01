import apiClient from "../client";
import {
  listServiceAreas,
  createServiceArea,
  updateServiceArea,
  deleteServiceArea,
} from "../service-areas";

jest.mock("../client");

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("service areas api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists service areas", async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: { service_areas: [] } });

    await listServiceAreas("b1");

    expect(mockApiClient.get).toHaveBeenCalledWith(
      "/api/businesses/b1/service-areas",
      { signal: undefined }
    );
  });

  it("creates a service area", async () => {
    const payload = { city: "Bethesda", state: "MD" };
    mockApiClient.post.mockResolvedValueOnce({ data: { service_area: { id: "s1" } } });

    await createServiceArea("b1", payload);

    expect(mockApiClient.post).toHaveBeenCalledWith(
      "/api/businesses/b1/service-areas",
      payload,
      { signal: undefined }
    );
  });

  it("updates a service area", async () => {
    const updates = { city: "Rockville" };
    mockApiClient.put.mockResolvedValueOnce({ data: { service_area: { id: "s1" } } });

    await updateServiceArea("b1", "s1", updates);

    expect(mockApiClient.put).toHaveBeenCalledWith(
      "/api/businesses/b1/service-areas/s1",
      updates,
      { signal: undefined }
    );
  });

  it("deletes a service area", async () => {
    mockApiClient.delete.mockResolvedValueOnce({});

    await deleteServiceArea("b1", "s1");

    expect(mockApiClient.delete).toHaveBeenCalledWith(
      "/api/businesses/b1/service-areas/s1",
      { signal: undefined }
    );
  });
});
