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

describe("seo locations endpoints", () => {
  const baseEvent: APIGatewayProxyEventV2 = {
    version: "2.0",
    routeKey: "$default",
    rawPath: "/api/businesses/seo/b1/locations",
    rawQueryString: "",
    headers: {},
    requestContext: {
      accountId: "123",
      apiId: "api",
      domainName: "example.com",
      domainPrefix: "example",
      http: {
        method: "GET",
        path: "/api/businesses/seo/b1/locations",
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "jest",
      },
      requestId: "req-locations",
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

  it("returns location stats", async () => {
    mockSend.mockResolvedValueOnce({
      Items: [{ status: "active" }, { status: "inactive" }, { status: "active" }],
    });

    const { handler } = await import("../index");
    const response = (await handler({
      ...baseEvent,
      rawPath: "/api/businesses/seo/b1/locations/stats",
      requestContext: {
        ...baseEvent.requestContext,
        http: { ...baseEvent.requestContext.http, method: "GET", path: "/api/businesses/seo/b1/locations/stats" },
      },
      headers: { origin: "https://admin.marketbrewer.com", authorization: "Bearer token-123" },
    })) as any;

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.body);
    expect(payload.stats.active).toBe(2);
  });

  it("bulk imports locations and validates payload", async () => {
    const { handler } = await import("../index");

    const invalidRes = (await handler({
      ...baseEvent,
      rawPath: "/api/businesses/seo/b1/locations/bulk-import",
      requestContext: {
        ...baseEvent.requestContext,
        http: {
          ...baseEvent.requestContext.http,
          method: "POST",
          path: "/api/businesses/seo/b1/locations/bulk-import",
        },
      },
      headers: { origin: "https://admin.marketbrewer.com", authorization: "Bearer token-123" },
      body: JSON.stringify({}),
    })) as any;

    mockSend.mockResolvedValueOnce({});

    const okRes = (await handler({
      ...baseEvent,
      rawPath: "/api/businesses/seo/b1/locations/bulk-import",
      requestContext: {
        ...baseEvent.requestContext,
        http: {
          ...baseEvent.requestContext.http,
          method: "POST",
          path: "/api/businesses/seo/b1/locations/bulk-import",
        },
      },
      headers: { origin: "https://admin.marketbrewer.com", authorization: "Bearer token-123" },
      body: JSON.stringify({ locations: [{ city: "Austin", state: "TX" }] }),
    })) as any;

    expect(invalidRes.statusCode).toBe(400);
    expect(okRes.statusCode).toBe(200);
  });
});
