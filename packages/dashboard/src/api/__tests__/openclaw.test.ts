describe("openclaw api client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("uses configured base url", async () => {
    process.env.REACT_APP_OPENCLAW_API_URL = "https://openclaw.example.com";

    const module = await import("../openclaw");

    expect(module.getOpenclawBaseUrl()).toBe("https://openclaw.example.com");
    expect(module.openclawClient.defaults.baseURL).toBe("https://openclaw.example.com");
  });
});
