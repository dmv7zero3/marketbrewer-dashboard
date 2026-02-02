import type { APIGatewayProxyEventV2 } from "aws-lambda";

const mockSend = jest.fn();
const mockSqsSend = jest.fn();

jest.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => ({ send: mockSend })),
  },
  GetCommand: jest.fn(),
  QueryCommand: jest.fn(),
  UpdateCommand: jest.fn(),
  PutCommand: jest.fn(),
  DeleteCommand: jest.fn(),
  BatchWriteCommand: jest.fn(),
}));

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("@aws-sdk/client-sqs", () => ({
  SQSClient: jest.fn().mockImplementation(() => ({ send: mockSqsSend })),
  SendMessageBatchCommand: jest.fn(),
}));

describe("profile, hours, and social endpoints", () => {
  const baseEvent: APIGatewayProxyEventV2 = {
    version: "2.0",
    routeKey: "$default",
    rawPath: "/api/businesses/b1/locations",
    rawQueryString: "",
    headers: {},
    requestContext: {
      accountId: "123",
      apiId: "api",
      domainName: "example.com",
      domainPrefix: "example",
      http: {
        method: "GET",
        path: "/api/businesses/b1/locations",
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "jest",
      },
      requestId: "req-profile",
      routeKey: "$default",
      stage: "$default",
      time: "01/Jan/2026:00:00:00 +0000",
      timeEpoch: 0,
    },
    isBase64Encoded: false,
  } as APIGatewayProxyEventV2;

  beforeEach(() => {
    jest.resetModules();
    mockSend.mockReset();
    mockSqsSend.mockReset();
    process.env.API_TOKEN = "token-123";
    process.env.CORS_ALLOW_ORIGINS = "https://admin.marketbrewer.com";
    process.env.RATE_LIMIT_PER_MIN = "0";
  });

  it("lists and updates profile hours", async () => {
    mockSend.mockResolvedValueOnce({ Item: { hours: [{ day_of_week: "monday" }] } });
    mockSend.mockResolvedValueOnce({});

    const { handler } = await import("../index");

    const listRes = (await handler({
      ...baseEvent,
      rawPath: "/api/businesses/b1/hours",
      requestContext: {
        ...baseEvent.requestContext,
        http: { ...baseEvent.requestContext.http, method: "GET", path: "/api/businesses/b1/hours" },
      },
      headers: { origin: "https://admin.marketbrewer.com", authorization: "Bearer token-123" },
    })) as any;

    const updateRes = (await handler({
      ...baseEvent,
      rawPath: "/api/businesses/b1/hours",
      requestContext: {
        ...baseEvent.requestContext,
        http: { ...baseEvent.requestContext.http, method: "PUT", path: "/api/businesses/b1/hours" },
      },
      headers: { origin: "https://admin.marketbrewer.com", authorization: "Bearer token-123" },
      body: JSON.stringify({ hours: [{ day_of_week: "monday", open_time: "09:00" }] }),
    })) as any;

    expect(listRes.statusCode).toBe(200);
    expect(updateRes.statusCode).toBe(200);
  });

  it("rejects invalid hours payload", async () => {
    const { handler } = await import("../index");
    const response = (await handler({
      ...baseEvent,
      rawPath: "/api/businesses/b1/hours",
      requestContext: {
        ...baseEvent.requestContext,
        http: { ...baseEvent.requestContext.http, method: "PUT", path: "/api/businesses/b1/hours" },
      },
      headers: { origin: "https://admin.marketbrewer.com", authorization: "Bearer token-123" },
      body: JSON.stringify({}),
    })) as any;

    expect(response.statusCode).toBe(400);
  });

  it("creates and clears primary profile location", async () => {
    mockSend
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        Items: [
          { id: "loc-old", is_primary: true },
          { id: "loc-new", is_primary: true },
        ],
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const { handler } = await import("../index");
    const response = (await handler({
      ...baseEvent,
      rawPath: "/api/businesses/b1/locations",
      requestContext: {
        ...baseEvent.requestContext,
        http: { ...baseEvent.requestContext.http, method: "POST", path: "/api/businesses/b1/locations" },
      },
      headers: { origin: "https://admin.marketbrewer.com", authorization: "Bearer token-123" },
      body: JSON.stringify({ location_type: "office", city: "Austin", state: "TX", is_primary: true }),
    })) as any;

    expect(response.statusCode).toBe(201);
  });

  it("updates profile location and enforces primary", async () => {
    mockSend
      .mockResolvedValueOnce({ Attributes: { id: "loc1", is_primary: true } })
      .mockResolvedValueOnce({
        Items: [{ id: "loc2", is_primary: true }],
      })
      .mockResolvedValueOnce({});

    const { handler } = await import("../index");
    const response = (await handler({
      ...baseEvent,
      rawPath: "/api/businesses/b1/locations/loc1",
      requestContext: {
        ...baseEvent.requestContext,
        http: { ...baseEvent.requestContext.http, method: "PUT", path: "/api/businesses/b1/locations/loc1" },
      },
      headers: { origin: "https://admin.marketbrewer.com", authorization: "Bearer token-123" },
      body: JSON.stringify({ city: "Austin", is_primary: true }),
    })) as any;

    expect(response.statusCode).toBe(200);
  });

  it("fetches a profile location", async () => {
    mockSend.mockResolvedValueOnce({ Item: { id: "loc1", city: "Austin" } });

    const { handler } = await import("../index");
    const response = (await handler({
      ...baseEvent,
      rawPath: "/api/businesses/b1/locations/loc1",
      requestContext: {
        ...baseEvent.requestContext,
        http: { ...baseEvent.requestContext.http, method: "GET", path: "/api/businesses/b1/locations/loc1" },
      },
      headers: { origin: "https://admin.marketbrewer.com", authorization: "Bearer token-123" },
    })) as any;

    expect(response.statusCode).toBe(200);
  });

  it("upserts and deletes social links", async () => {
    mockSend.mockResolvedValueOnce({});
    mockSend.mockResolvedValueOnce({ Items: [{ platform: "facebook", url: "https://fb.com/x" }] });
    mockSend.mockResolvedValueOnce({});

    const { handler } = await import("../index");

    const upsertRes = (await handler({
      ...baseEvent,
      rawPath: "/api/businesses/b1/social",
      requestContext: {
        ...baseEvent.requestContext,
        http: { ...baseEvent.requestContext.http, method: "POST", path: "/api/businesses/b1/social" },
      },
      headers: { origin: "https://admin.marketbrewer.com", authorization: "Bearer token-123" },
      body: JSON.stringify({ platform: "facebook", url: "https://fb.com/x" }),
    })) as any;

    const deleteRes = (await handler({
      ...baseEvent,
      rawPath: "/api/businesses/b1/social/facebook",
      requestContext: {
        ...baseEvent.requestContext,
        http: { ...baseEvent.requestContext.http, method: "DELETE", path: "/api/businesses/b1/social/facebook" },
      },
      headers: { origin: "https://admin.marketbrewer.com", authorization: "Bearer token-123" },
    })) as any;

    expect(upsertRes.statusCode).toBe(200);
    expect(deleteRes.statusCode).toBe(204);
  });
});
