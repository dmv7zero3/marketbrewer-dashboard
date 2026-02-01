import apiClient from "../client";
import {
  getProfileLocations,
  createProfileLocation,
  updateProfileLocation,
  deleteProfileLocation,
  getBusinessHours,
  updateBusinessHours,
  getBusinessSocialLinks,
} from "../business-profile";

jest.mock("../client");

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("business profile api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists profile locations", async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: { locations: [] } });

    await getProfileLocations("b1");

    expect(mockApiClient.get).toHaveBeenCalledWith("/api/businesses/b1/locations");
  });

  it("creates a profile location", async () => {
    const payload = { location_type: "physical" as const, city: "Bethesda", state: "MD" };
    mockApiClient.post.mockResolvedValueOnce({ data: { location: { id: "l1" } } });

    await createProfileLocation("b1", payload);

    expect(mockApiClient.post).toHaveBeenCalledWith(
      "/api/businesses/b1/locations",
      payload
    );
  });

  it("updates a profile location", async () => {
    const updates = { city: "Rockville" };
    mockApiClient.put.mockResolvedValueOnce({ data: { location: { id: "l1" } } });

    await updateProfileLocation("b1", "l1", updates);

    expect(mockApiClient.put).toHaveBeenCalledWith(
      "/api/businesses/b1/locations/l1",
      updates
    );
  });

  it("deletes a profile location", async () => {
    mockApiClient.delete.mockResolvedValueOnce({});

    await deleteProfileLocation("b1", "l1");

    expect(mockApiClient.delete).toHaveBeenCalledWith(
      "/api/businesses/b1/locations/l1"
    );
  });

  it("gets business hours", async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: { hours: [] } });

    await getBusinessHours("b1");

    expect(mockApiClient.get).toHaveBeenCalledWith("/api/businesses/b1/hours");
  });

  it("updates business hours", async () => {
    const payload = [{ day_of_week: "monday", opens: "09:00", closes: "17:00", is_closed: false }];
    mockApiClient.put.mockResolvedValueOnce({ data: { hours: [] } });

    await updateBusinessHours("b1", payload as never);

    expect(mockApiClient.put).toHaveBeenCalledWith(
      "/api/businesses/b1/hours",
      { hours: payload }
    );
  });

  it("gets business social links", async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: { links: [] } });

    await getBusinessSocialLinks("b1");

    expect(mockApiClient.get).toHaveBeenCalledWith("/api/businesses/b1/social");
  });
});
