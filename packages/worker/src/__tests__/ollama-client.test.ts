import axios from "axios";
import { OllamaClient } from "../ollama/client";

jest.mock("axios");

const mockPost = jest.fn();
const mockGet = jest.fn();

const createMockAxios = () => {
  return {
    post: mockPost,
    get: mockGet,
  } as unknown as ReturnType<typeof axios.create>;
};

describe("OllamaClient", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...OLD_ENV };
    (axios.create as jest.Mock).mockReturnValue(createMockAxios());
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("sends generate request and returns response text", async () => {
    mockPost.mockResolvedValueOnce({ data: { response: "hello" } });
    const client = new OllamaClient();
    const result = await client.generate("Hi");

    expect(mockPost).toHaveBeenCalledWith(
      "/api/generate",
      expect.objectContaining({ prompt: "Hi", stream: false })
    );
    expect(result).toBe("hello");
  });

  it("returns true when health check succeeds", async () => {
    mockGet.mockResolvedValueOnce({ data: { models: [] } });
    const client = new OllamaClient();
    const result = await client.checkHealth();

    expect(mockGet).toHaveBeenCalledWith("/api/tags");
    expect(result).toBe(true);
  });

  it("returns false when health check fails", async () => {
    mockGet.mockRejectedValueOnce(new Error("boom"));
    const client = new OllamaClient();
    const result = await client.checkHealth();

    expect(result).toBe(false);
  });

  it("returns model name from env or default", () => {
    process.env.OLLAMA_MODEL = "custom-model";
    const client = new OllamaClient();
    expect(client.getModel()).toBe("custom-model");
  });

  it("lists models on success and returns empty on failure", async () => {
    mockGet.mockResolvedValueOnce({
      data: { models: [{ name: "m1" }, { name: "m2" }] },
    });
    const client = new OllamaClient();
    await expect(client.listModels()).resolves.toEqual(["m1", "m2"]);

    mockGet.mockRejectedValueOnce(new Error("fail"));
    await expect(client.listModels()).resolves.toEqual([]);
  });
});
