import type { APIGatewayProxyEventV2 } from "aws-lambda";

const mockSend = jest.fn();

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
  SQSClient: jest.fn().mockImplementation(() => ({})),
  SendMessageBatchCommand: jest.fn(),
}));

describe("business endpoints", () => {
  const baseEvent: APIGatewayProxyEventV2 = {
    version: "2.0",
    routeKey: "$default",
    rawPath: "/api/businesses",
    rawQueryString: "",
    headers: {},
    requestContext: {
      accountId: "123",
      apiId: "api",
      domainName: "example.com",
      domainPrefix: "example",
      http: {
        method: "GET",
        path: "/api/businesses",
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "jest",
      },
      requestId: "req-biz",
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
    process.env.API_TOKEN = "token-123";
    process.env.CORS_ALLOW_ORIGINS = "https://admin.marketbrewer.com";
    process.env.RATE_LIMIT_PER_MIN = "0";
  });

  it("lists businesses", async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });

    const { handler } = await import("../index");
    const response = (await handler({
      ...baseEvent,
      headers: {
        origin: "https://admin.marketbrewer.com",
        authorization: "Bearer token-123",
      },
    })) as any;

    expect(response.statusCode).toBe(200);
  });

  it("creates a business", async () => {
    mockSend.mockResolvedValueOnce({});
    mockSend.mockResolvedValueOnce({});

    const { handler } = await import("../index");
    const response = (await handler({
      ...baseEvent,
      rawPath: "/api/businesses",
      requestContext: {
        ...baseEvent.requestContext,
        http: { ...baseEvent.requestContext.http, method: "POST", path: "/api/businesses" },
      },
      headers: {
        origin: "https://admin.marketbrewer.com",
        authorization: "Bearer token-123",
      },
      body: JSON.stringify({ name: "Biz", industry: "Services" }),
    })) as any;

    expect(response.statusCode).toBe(201);
  });

  it("returns 400 for missing fields", async () => {
    const { handler } = await import("../index");
    const response = (await handler({
      ...baseEvent,
      rawPath: "/api/businesses",
      requestContext: {
        ...baseEvent.requestContext,
        http: { ...baseEvent.requestContext.http, method: "POST", path: "/api/businesses" },
      },
      headers: {
        origin: "https://admin.marketbrewer.com",
        authorization: "Bearer token-123",
      },
      body: JSON.stringify({ name: "Biz" }),
    })) as any;

    expect(response.statusCode).toBe(400);
  });
});
