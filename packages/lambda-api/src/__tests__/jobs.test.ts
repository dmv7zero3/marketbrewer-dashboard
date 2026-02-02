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

describe("job and preview endpoints", () => {
  const baseEvent: APIGatewayProxyEventV2 = {
    version: "2.0",
    routeKey: "$default",
    rawPath: "/api/businesses/b1/generate",
    rawQueryString: "",
    headers: {},
    requestContext: {
      accountId: "123",
      apiId: "api",
      domainName: "example.com",
      domainPrefix: "example",
      http: {
        method: "POST",
        path: "/api/businesses/b1/generate",
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "jest",
      },
      requestId: "req-job",
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
    process.env.SQS_QUEUE_URL = "https://sqs.us-east-1.amazonaws.com/123/test";
  });

  it("creates a job and enqueues pages", async () => {
    mockSend
      .mockResolvedValueOnce({
        Items: [{ id: "k1", keyword: "roofing", slug: "roofing", language: "en" }],
      })
      .mockResolvedValueOnce({
        Items: [{ id: "a1", slug: "austin", city: "Austin", state: "TX" }],
      })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({
        Item: { data: { services: { offerings: [{ name: "Cleaning", slug: "cleaning" }] } } },
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    mockSqsSend.mockResolvedValueOnce({});

    const { handler } = await import("../index");
    const response = (await handler({
      ...baseEvent,
      headers: { origin: "https://admin.marketbrewer.com", authorization: "Bearer token-123" },
      body: JSON.stringify({ page_type: "keyword-service-area" }),
    })) as any;

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.body);
    expect(payload.total_pages_created).toBe(1);
  });

  it("previews keyword-service-area pages with filters", async () => {
    mockSend
      .mockResolvedValueOnce({
        Items: [{ id: "k1", keyword: "Roofing", slug: "roofing", language: "es" }],
      })
      .mockResolvedValueOnce({
        Items: [{ id: "a1", slug: "austin", city: "Austin", state: "TX" }],
      })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({ Item: { data: {} } });

    const { handler } = await import("../index");
    const response = (await handler({
      ...baseEvent,
      rawPath: "/api/businesses/b1/generate/preview",
      requestContext: {
        ...baseEvent.requestContext,
        http: { ...baseEvent.requestContext.http, method: "GET", path: "/api/businesses/b1/generate/preview" },
      },
      rawQueryString: "page_type=keyword-service-area&language=es&search=roof&page=1&limit=5",
      queryStringParameters: {
        page_type: "keyword-service-area",
        language: "es",
        search: "roof",
        page: "1",
        limit: "5",
      },
      headers: { origin: "https://admin.marketbrewer.com", authorization: "Bearer token-123" },
    })) as any;

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.body);
    expect(payload.pagination.total).toBe(1);
    expect(payload.summary.by_language.es).toBe(1);
  });

  it("previews service-location pages", async () => {
    mockSend
      .mockResolvedValueOnce({
        Items: [{ id: "k1", keyword: "Roofing", slug: "roofing", language: "en" }],
      })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({
        Items: [{ id: "l1", slug: "austin", city: "Austin", state: "TX" }],
      })
      .mockResolvedValueOnce({
        Item: { data: { services: { offerings: [{ name: "Cleaning", slug: "cleaning" }] } } },
      });

    const { handler } = await import("../index");
    const response = (await handler({
      ...baseEvent,
      rawPath: "/api/businesses/b1/generate/preview",
      requestContext: {
        ...baseEvent.requestContext,
        http: { ...baseEvent.requestContext.http, method: "GET", path: "/api/businesses/b1/generate/preview" },
      },
      rawQueryString: "page_type=service-location&search=clean",
      queryStringParameters: {
        page_type: "service-location",
        search: "clean",
        page: "1",
        limit: "10",
      },
      headers: { origin: "https://admin.marketbrewer.com", authorization: "Bearer token-123" },
    })) as any;

    expect(response.statusCode).toBe(200);
  });

  it("returns job details with status counts", async () => {
    mockSend
      .mockResolvedValueOnce({
        Item: { id: "job1", status: "pending", business_id: "b1" },
      })
      .mockResolvedValueOnce({
        Items: [
          { status: "queued" },
          { status: "completed" },
          { status: "completed" },
          { status: "failed" },
        ],
      });

    const { handler } = await import("../index");
    const response = (await handler({
      ...baseEvent,
      rawPath: "/api/businesses/b1/jobs/job1",
      requestContext: {
        ...baseEvent.requestContext,
        http: { ...baseEvent.requestContext.http, method: "GET", path: "/api/businesses/b1/jobs/job1" },
      },
      headers: { origin: "https://admin.marketbrewer.com", authorization: "Bearer token-123" },
    })) as any;

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.body);
    expect(payload.job.completed_count).toBe(2);
  });

  it("filters job pages by status, language, and search", async () => {
    mockSend.mockResolvedValueOnce({
      Items: [
        { status: "completed", keyword_language: "en", keyword_text: "Roofing", keyword_slug: "roofing" },
        { status: "queued", keyword_language: "en", keyword_text: "Plumbing", keyword_slug: "plumbing" },
        { status: "completed", keyword_language: "es", keyword_text: "Techos", keyword_slug: "techos" },
      ],
    });

    const { handler } = await import("../index");
    const response = (await handler({
      ...baseEvent,
      rawPath: "/api/jobs/job1/pages",
      requestContext: {
        ...baseEvent.requestContext,
        http: { ...baseEvent.requestContext.http, method: "GET", path: "/api/jobs/job1/pages" },
      },
      rawQueryString: "status=completed&language=en&search=roof&page=1&limit=10",
      queryStringParameters: {
        status: "completed",
        language: "en",
        search: "roof",
        page: "1",
        limit: "10",
      },
      headers: { origin: "https://admin.marketbrewer.com", authorization: "Bearer token-123" },
    })) as any;

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.body);
    expect(payload.pages.length).toBe(1);
    expect(payload.counts.completed).toBe(2);
  });
});
