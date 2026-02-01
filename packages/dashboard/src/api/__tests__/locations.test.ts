import apiClient from "../client";
import {
  getLocations,
  getLocationStats,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation,
  bulkImportLocations,
} from "../locations";

jest.mock("../client");

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("locations api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists locations with filters", async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: { locations: [] } });
    const signal = new AbortController().signal;

    await getLocations("b1", { status: "active", state: "VA" }, { signal });

    expect(mockApiClient.get).toHaveBeenCalledWith(
      "/api/businesses/seo/b1/locations",
      { params: { status: "active", state: "VA" }, signal }
    );
  });

  it("gets location stats", async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: { stats: {} } });
    const signal = new AbortController().signal;

    await getLocationStats("b1", { signal });

    expect(mockApiClient.get).toHaveBeenCalledWith(
      "/api/businesses/seo/b1/locations/stats",
      { signal }
    );
  });

  it("gets a location", async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: { location: { id: "l1" } } });

    await getLocation("b1", "l1");

    expect(mockApiClient.get).toHaveBeenCalledWith(
      "/api/businesses/seo/b1/locations/l1"
    );
  });

  it("creates a location", async () => {
    const payload = { city: "Bethesda", state: "MD" };
    mockApiClient.post.mockResolvedValueOnce({ data: { location: { id: "l1" } } });

    await createLocation("b1", payload as never);

    expect(mockApiClient.post).toHaveBeenCalledWith(
      "/api/businesses/seo/b1/locations",
      payload
    );
  });

  it("updates a location", async () => {
    const updates = { city: "Rockville" };
    mockApiClient.put.mockResolvedValueOnce({ data: { location: { id: "l1" } } });

    await updateLocation("b1", "l1", updates);

    expect(mockApiClient.put).toHaveBeenCalledWith(
      "/api/businesses/seo/b1/locations/l1",
      updates
    );
  });

  it("deletes a location", async () => {
    mockApiClient.delete.mockResolvedValueOnce({});

    await deleteLocation("b1", "l1");

    expect(mockApiClient.delete).toHaveBeenCalledWith(
      "/api/businesses/seo/b1/locations/l1"
    );
  });

  it("bulk imports locations", async () => {
    const payload = { locations: [{ city: "Bethesda", state: "MD" }] };
    mockApiClient.post.mockResolvedValueOnce({ data: { created: 1, failed: 0, locations: [], errors: [] } });

    await bulkImportLocations("b1", payload as never);

    expect(mockApiClient.post).toHaveBeenCalledWith(
      "/api/businesses/seo/b1/locations/bulk-import",
      payload
    );
  });
});
