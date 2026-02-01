import apiClient from "../client";
import {
  getBusinesses,
  getBusiness,
  createBusiness,
  getQuestionnaire,
  updateBusiness,
  updateQuestionnaire,
} from "../businesses";

jest.mock("../client");

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("businesses api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists businesses", async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: { businesses: [] } });

    await getBusinesses();

    expect(mockApiClient.get).toHaveBeenCalledWith("/api/businesses");
  });

  it("gets a business", async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: { business: { id: "b1" } } });

    await getBusiness("b1");

    expect(mockApiClient.get).toHaveBeenCalledWith("/api/businesses/b1");
  });

  it("creates a business", async () => {
    const payload = { name: "Acme", industry: "Services" };
    mockApiClient.post.mockResolvedValueOnce({ data: { business: { id: "b1" } } });

    await createBusiness(payload);

    expect(mockApiClient.post).toHaveBeenCalledWith("/api/businesses", payload);
  });

  it("gets questionnaire", async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: { questionnaire: { id: "q1", data: {} } } });

    await getQuestionnaire("b1");

    expect(mockApiClient.get).toHaveBeenCalledWith("/api/businesses/b1/questionnaire");
  });

  it("updates a business", async () => {
    const updates = { name: "Updated" };
    mockApiClient.put.mockResolvedValueOnce({ data: { business: { id: "b1" } } });

    await updateBusiness("b1", updates);

    expect(mockApiClient.put).toHaveBeenCalledWith("/api/businesses/b1", updates);
  });

  it("updates questionnaire", async () => {
    const payload = { data: { foo: "bar" } };
    mockApiClient.put.mockResolvedValueOnce({ data: { questionnaire: { id: "q1", data: {} } } });

    await updateQuestionnaire("b1", { foo: "bar" });

    expect(mockApiClient.put).toHaveBeenCalledWith(
      "/api/businesses/b1/questionnaire",
      payload
    );
  });
});
