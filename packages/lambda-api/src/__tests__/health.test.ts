import type { APIGatewayProxyEventV2 } from "aws-lambda";

describe("lambda api handler", () => {
  const baseEvent: APIGatewayProxyEventV2 = {
    version: "2.0",
    routeKey: "$default",
    rawPath: "/health",
    rawQueryString: "",
    headers: {},
    requestContext: {
      accountId: "123",
      apiId: "api",
      domainName: "example.com",
      domainPrefix: "example",
      http: {
        method: "GET",
        path: "/health",
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "jest",
      },
      requestId: "req-1",
      routeKey: "$default",
      stage: "$default",
      time: "01/Jan/2026:00:00:00 +0000",
      timeEpoch: 0,
    },
    isBase64Encoded: false,
  } as APIGatewayProxyEventV2;

  beforeEach(() => {
    jest.resetModules();
    process.env.CORS_ALLOW_ORIGINS = "https://admin.marketbrewer.com";
  });

  it("returns ok for /health without auth", async () => {
    const { handler } = await import("../index");
    const response = (await handler({
      ...baseEvent,
      rawPath: "/health",
      headers: { origin: "https://admin.marketbrewer.com" },
    })) as any;

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("ok");
  });

  it("returns 204 for OPTIONS with allowed origin", async () => {
    const { handler } = await import("../index");
    const response = (await handler({
      ...baseEvent,
      rawPath: "/health",
      requestContext: {
        ...baseEvent.requestContext,
        http: { ...baseEvent.requestContext.http, method: "OPTIONS" },
      },
      headers: { origin: "https://admin.marketbrewer.com" },
    })) as any;

    expect(response.statusCode).toBe(204);
  });

  it("returns 403 for disallowed origin", async () => {
    const { handler } = await import("../index");
    const response = (await handler({
      ...baseEvent,
      rawPath: "/health",
      headers: { origin: "https://evil.example.com" },
    })) as any;

    expect(response.statusCode).toBe(403);
  });

  it("returns 401 for missing auth on protected route", async () => {
    const { handler } = await import("../index");
    const response = (await handler({
      ...baseEvent,
      rawPath: "/api/businesses",
      requestContext: {
        ...baseEvent.requestContext,
        http: { ...baseEvent.requestContext.http, method: "GET", path: "/api/businesses" },
      },
      headers: { origin: "https://admin.marketbrewer.com" },
    })) as any;

    expect(response.statusCode).toBe(401);
  });
});
