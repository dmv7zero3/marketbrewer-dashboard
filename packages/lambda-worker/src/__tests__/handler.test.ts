import type { SQSEvent } from "aws-lambda";

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => ({ send: jest.fn() })),
  },
  GetCommand: jest.fn(),
  UpdateCommand: jest.fn(),
  PutCommand: jest.fn(),
  QueryCommand: jest.fn(),
}));

describe("lambda worker handler", () => {
  it("handles empty batch without error", async () => {
    const { handler } = await import("../index");
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    const event: SQSEvent = { Records: [] } as SQSEvent;
    await handler(event);

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
