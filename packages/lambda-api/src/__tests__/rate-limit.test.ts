import type { APIGatewayProxyEventV2 } from "aws-lambda";

const mockSend = jest.fn();

jest.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => ({ send: mockSend })),
  },
  UpdateCommand: jest.fn(),
  GetCommand: jest.fn(),
  PutCommand: jest.fn(),
  QueryCommand: jest.fn(),
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

describe("rate limiting", () => {
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
      requestId: "req-rate",
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
    process.env.API_TOKEN = "test-token";
    process.env.CORS_ALLOW_ORIGINS = "https://admin.marketbrewer.com";
  });

  it("returns 429 when rate limit is exceeded", async () => {
    const rateLimitError = new Error("limit");
    rateLimitError.name = "ConditionalCheckFailedException";
    mockSend.mockRejectedValueOnce(rateLimitError);

    const { handler } = await import("../index");
    const response = (await handler({
      ...baseEvent,
      headers: {
        origin: "https://admin.marketbrewer.com",
        authorization: "Bearer test-token",
      },
    })) as any;

    expect(response.statusCode).toBe(429);
  });
});
