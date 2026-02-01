/**
 * Unit tests for Job schemas (Zod validation)
 */

import {
  PageTypeSchema,
  CreateGenerationJobSchema,
  ClaimPageSchema,
  CompletePageSchema,
} from "../job";

describe("PageTypeSchema", () => {
  describe("valid page types", () => {
    it("should accept keyword-service-area", () => {
      expect(() => PageTypeSchema.parse("keyword-service-area")).not.toThrow();
    });

    it("should accept keyword-location", () => {
      expect(() => PageTypeSchema.parse("keyword-location")).not.toThrow();
    });

    it("should accept service-service-area", () => {
      expect(() => PageTypeSchema.parse("service-service-area")).not.toThrow();
    });

    it("should accept service-location", () => {
      expect(() => PageTypeSchema.parse("service-location")).not.toThrow();
    });

    it("should accept blog-service-area", () => {
      expect(() => PageTypeSchema.parse("blog-service-area")).not.toThrow();
    });

    it("should accept blog-location", () => {
      expect(() => PageTypeSchema.parse("blog-location")).not.toThrow();
    });

    it("should accept legacy location-keyword", () => {
      expect(() => PageTypeSchema.parse("location-keyword")).not.toThrow();
    });

    it("should accept legacy service-area", () => {
      expect(() => PageTypeSchema.parse("service-area")).not.toThrow();
    });
  });

  describe("invalid page types", () => {
    it("should reject invalid-type", () => {
      expect(() => PageTypeSchema.parse("invalid-type")).toThrow();
    });

    it("should reject empty string", () => {
      expect(() => PageTypeSchema.parse("")).toThrow();
    });

    it("should reject null", () => {
      expect(() => PageTypeSchema.parse(null)).toThrow();
    });

    it("should reject undefined", () => {
      expect(() => PageTypeSchema.parse(undefined)).toThrow();
    });

    it("should reject numbers", () => {
      expect(() => PageTypeSchema.parse(123)).toThrow();
    });

    it("should reject case variations", () => {
      expect(() => PageTypeSchema.parse("Keyword-Service-Area")).toThrow();
      expect(() => PageTypeSchema.parse("KEYWORD-SERVICE-AREA")).toThrow();
    });
  });
});

describe("CreateGenerationJobSchema", () => {
  describe("valid inputs", () => {
    it("should accept valid page_type", () => {
      const result = CreateGenerationJobSchema.parse({
        page_type: "keyword-service-area",
      });
      expect(result.page_type).toBe("keyword-service-area");
    });

    it("should accept all valid page types", () => {
      const validTypes = [
        "keyword-service-area",
        "keyword-location",
        "service-service-area",
        "service-location",
        "blog-service-area",
        "blog-location",
        "location-keyword",
        "service-area",
      ];

      validTypes.forEach((type) => {
        const result = CreateGenerationJobSchema.parse({ page_type: type });
        expect(result.page_type).toBe(type);
      });
    });
  });

  describe("invalid inputs", () => {
    it("should reject missing page_type", () => {
      expect(() => CreateGenerationJobSchema.parse({})).toThrow();
    });

    it("should reject invalid page_type", () => {
      expect(() =>
        CreateGenerationJobSchema.parse({ page_type: "invalid" })
      ).toThrow();
    });

    it("should reject extra fields (strip by default)", () => {
      const result = CreateGenerationJobSchema.parse({
        page_type: "keyword-service-area",
        extra_field: "should be stripped",
      });
      expect(result).not.toHaveProperty("extra_field");
    });
  });
});

describe("ClaimPageSchema", () => {
  it("should accept valid worker_id", () => {
    const result = ClaimPageSchema.parse({ worker_id: "worker-123" });
    expect(result.worker_id).toBe("worker-123");
  });

  it("should reject empty worker_id", () => {
    expect(() => ClaimPageSchema.parse({ worker_id: "" })).toThrow();
  });

  it("should reject missing worker_id", () => {
    expect(() => ClaimPageSchema.parse({})).toThrow();
  });
});

describe("CompletePageSchema", () => {
  it("should accept completed status with content", () => {
    const result = CompletePageSchema.parse({
      status: "completed",
      content: "<h1>Test Content</h1>",
      word_count: 100,
    });
    expect(result.status).toBe("completed");
    expect(result.content).toBe("<h1>Test Content</h1>");
  });

  it("should accept failed status with error_message", () => {
    const result = CompletePageSchema.parse({
      status: "failed",
      error_message: "LLM timeout",
    });
    expect(result.status).toBe("failed");
    expect(result.error_message).toBe("LLM timeout");
  });

  it("should reject invalid status", () => {
    expect(() =>
      CompletePageSchema.parse({ status: "processing" })
    ).toThrow();
  });

  it("should accept optional fields", () => {
    const result = CompletePageSchema.parse({
      status: "completed",
      content: "Test",
      section_count: 5,
      model_name: "llama3.2",
      prompt_version: "1.0",
      generation_duration_ms: 5000,
      word_count: 250,
    });
    expect(result.section_count).toBe(5);
    expect(result.model_name).toBe("llama3.2");
    expect(result.prompt_version).toBe("1.0");
    expect(result.generation_duration_ms).toBe(5000);
    expect(result.word_count).toBe(250);
  });
});
