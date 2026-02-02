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

describe("worker failure path", () => {
  beforeEach(() => {
    jest.resetModules();
    mockSend.mockReset();
    mockFetch.mockReset();
  });

  it("marks page failed when prompt is missing", async () => {
    const { handler } = await import("../index");

    // 1) page GetCommand
    mockSend.mockResolvedValueOnce({ Item: { status: "queued", page_type: "keyword-service-area" } });
    // 2) update page to processing
    mockSend.mockResolvedValueOnce({});
    // 3) business GetCommand
    mockSend.mockResolvedValueOnce({ Item: { name: "Biz" } });
    // 4) questionnaire GetCommand
    mockSend.mockResolvedValueOnce({ Item: { data: {} } });
    // 5) prompts QueryCommand (no prompt)
    mockSend.mockResolvedValueOnce({ Items: [] });
    // 6) update page to failed
    mockSend.mockResolvedValueOnce({});
    // 7) update job counts
    mockSend.mockResolvedValueOnce({ Attributes: { total_pages: 1, completed_pages: 0, failed_pages: 1 } });
    // 8) finalize job status
    mockSend.mockResolvedValueOnce({ Attributes: { status: "failed" } });
    // 9) webhook ready flag update
    mockSend.mockResolvedValueOnce({});
    // 10) webhooks query for dispatch (empty)
    mockSend.mockResolvedValueOnce({ Items: [] });

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
    expect(mockSend).toHaveBeenCalled();
  });
});
