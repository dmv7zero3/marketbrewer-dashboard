import type { SQSEvent } from "aws-lambda";

const mockSend = jest.fn();
const mockFetch = jest.fn();

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => ({ send: mockSend })),
  },
  GetCommand: jest.fn(),
  UpdateCommand: jest.fn(),
  PutCommand: jest.fn(),
  QueryCommand: jest.fn(),
}));

(global as any).fetch = mockFetch;

describe("worker success path", () => {
  beforeEach(() => {
    jest.resetModules();
    mockSend.mockReset();
    mockFetch.mockReset();
    process.env.CLAUDE_API_KEY = "key";
  });

  it("processes a page successfully", async () => {
    const { handler } = await import("../index");

    const responses = [
      { Item: { status: "queued", page_type: "keyword-service-area", keyword_language: "en", keyword_text: "Test", city: "A", state: "B" } },
      {},
      { Item: { name: "Biz", industry: "Services" } },
      { Item: { data: {} } },
      { Items: [{ page_type: "keyword-service-area", is_active: true, template: "Hello {{keyword}}" }] },
      {},
      { Attributes: { total_pages: 1, completed_pages: 1, failed_pages: 0 } },
      { Attributes: { status: "completed", total_pages: 1, completed_pages: 1, failed_pages: 0 } },
      {},
      { Items: [] },
      {},
      {},
    ];

    mockSend.mockImplementation(() => Promise.resolve(responses.shift()));
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: "text", text: "{}" }], usage: { input_tokens: 1, output_tokens: 1 } }),
    });

    const event: SQSEvent = {
      Records: [
        {
          messageId: "1",
          receiptHandle: "abc",
          body: JSON.stringify({ job_id: "j1", page_id: "p1", business_id: "b1" }),
          attributes: {
            ApproximateReceiveCount: "1",
            SentTimestamp: "0",
            SenderId: "s",
            ApproximateFirstReceiveTimestamp: "0",
          },
          messageAttributes: {},
          md5OfBody: "",
          eventSource: "aws:sqs",
          eventSourceARN: "arn:aws:sqs:us-east-1:123:queue",
          awsRegion: "us-east-1",
        },
      ],
    } as SQSEvent;

    await handler(event);
    expect(mockFetch).toHaveBeenCalled();
  });
});
