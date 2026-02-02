import type { APIGatewayProxyEventV2 } from "aws-lambda";

const mockSend = jest.fn();

jest.mock("google-auth-library", () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn(async () => ({
      getPayload: () => ({ email: "user@example.com", email_verified: true }),
    })),
  })),
}));

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

describe("auth handling", () => {
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
      requestId: "req-auth",
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
    mockSend.mockResolvedValue({ Items: [] });
    process.env.CORS_ALLOW_ORIGINS = "https://admin.marketbrewer.com";
    process.env.RATE_LIMIT_PER_MIN = "0";
  });

  it("accepts API token", async () => {
    process.env.API_TOKEN = "token-123";
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

  it("accepts Google token when client id is set", async () => {
    process.env.API_TOKEN = "";
    process.env.GOOGLE_CLIENT_ID = "google-client";
    process.env.GOOGLE_ALLOWED_EMAILS = "user@example.com";

    const { handler } = await import("../index");
    const response = (await handler({
      ...baseEvent,
      headers: {
        origin: "https://admin.marketbrewer.com",
        authorization: "Bearer google-token",
      },
    })) as any;

    expect(response.statusCode).toBe(200);
  });
});
