import type { APIGatewayProxyEventV2 } from "aws-lambda";

const buildEvent = (
  origin: string | undefined,
  method: "OPTIONS" | "GET" = "OPTIONS",
  path: string = "/api/health"
): APIGatewayProxyEventV2 => ({
  version: "2.0",
  routeKey: "ANY /",
  rawPath: path,
  rawQueryString: "",
  headers: origin ? { origin } : {},
  requestContext: {
    accountId: "123",
    apiId: "abc",
    domainName: "api.marketbrewer.com",
    domainPrefix: "api",
    http: {
      method,
      path,
      protocol: "HTTP/1.1",
      sourceIp: "127.0.0.1",
      userAgent: "jest",
    },
    requestId: "req-123",
    routeKey: "ANY /",
    stage: "$default",
    time: "",
    timeEpoch: 0,
  },
  isBase64Encoded: false,
} as APIGatewayProxyEventV2);

describe("CORS headers", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("echoes allowed origin", async () => {
    process.env.CORS_ALLOW_ORIGINS = "https://admin.marketbrewer.com,http://localhost:3002";
    const { handler } = await import("../index");
    const response = (await handler(buildEvent("http://localhost:3002"))) as {
      headers?: Record<string, string>;
    };
    expect(response.headers?.["Access-Control-Allow-Origin"]).toBe(
      "http://localhost:3002"
    );
  });

  it("falls back to first allowed origin when origin missing", async () => {
    process.env.CORS_ALLOW_ORIGINS = "https://admin.marketbrewer.com,http://localhost:3002";
    const { handler } = await import("../index");
    const response = (await handler(buildEvent(undefined))) as {
      headers?: Record<string, string>;
    };
    expect(response.headers?.["Access-Control-Allow-Origin"]).toBe(
      "https://admin.marketbrewer.com"
    );
  });

  it("rejects disallowed origin with 403", async () => {
    process.env.CORS_ALLOW_ORIGINS = "https://admin.marketbrewer.com";
    const { handler } = await import("../index");
    const response = (await handler(buildEvent("https://evil.example.com", "GET", "/api/health"))) as {
      statusCode: number;
    };
    expect(response.statusCode).toBe(403);
  });

  it("returns 401 when auth is missing", async () => {
    process.env.CORS_ALLOW_ORIGINS = "https://admin.marketbrewer.com";
    const { handler } = await import("../index");
    const response = (await handler(buildEvent("https://admin.marketbrewer.com", "GET", "/api/businesses"))) as {
      statusCode: number;
    };
    expect(response.statusCode).toBe(401);
  });
});
