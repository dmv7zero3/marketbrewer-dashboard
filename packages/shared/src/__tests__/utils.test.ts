/**
 * Unit tests for @marketbrewer/shared utility functions
 */

import {
  toSlug,
  toCityStateSlug,
  generateUrlPath,
  generateId,
  calculateCompletenessScore,
} from "../utils";

describe("toSlug", () => {
  it("converts simple string to lowercase slug", () => {
    expect(toSlug("Hello World")).toBe("hello-world");
  });

  it("handles multiple spaces", () => {
    expect(toSlug("Hello    World")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(toSlug("Nash & Smashed's BBQ!")).toBe("nash-smasheds-bbq");
  });

  it("handles leading/trailing spaces", () => {
    expect(toSlug("  Hello World  ")).toBe("hello-world");
  });

  it("handles leading/trailing hyphens", () => {
    expect(toSlug("--Hello-World--")).toBe("hello-world");
  });

  it("converts underscores to hyphens", () => {
    expect(toSlug("hello_world_test")).toBe("hello-world-test");
  });

  it("handles empty string", () => {
    expect(toSlug("")).toBe("");
  });

  it("handles string with only spaces", () => {
    expect(toSlug("   ")).toBe("");
  });

  it("handles numbers", () => {
    expect(toSlug("Service 123")).toBe("service-123");
  });

  it("handles mixed case", () => {
    expect(toSlug("CamelCaseString")).toBe("camelcasestring");
  });
});

describe("toCityStateSlug", () => {
  it("creates city-state slug", () => {
    expect(toCityStateSlug("Sterling", "VA")).toBe("sterling-va");
  });

  it("handles city with spaces", () => {
    expect(toCityStateSlug("Falls Church", "VA")).toBe("falls-church-va");
  });

  it("normalizes state to lowercase", () => {
    expect(toCityStateSlug("Reston", "VA")).toBe("reston-va");
    expect(toCityStateSlug("Reston", "va")).toBe("reston-va");
  });

  it("handles special characters in city name", () => {
    expect(toCityStateSlug("King's Park", "VA")).toBe("kings-park-va");
  });

  it("handles city with apostrophe", () => {
    expect(toCityStateSlug("O'Fallon", "MO")).toBe("ofallon-mo");
  });
});

describe("generateUrlPath", () => {
  it("creates path with keyword and service area", () => {
    expect(generateUrlPath("smash-burgers", "sterling-va")).toBe(
      "/smash-burgers/sterling-va"
    );
  });

  it("creates path with only service area when keyword is null", () => {
    expect(generateUrlPath(null, "sterling-va")).toBe("/sterling-va");
  });

  it("handles empty keyword as falsy", () => {
    expect(generateUrlPath("", "sterling-va")).toBe("/sterling-va");
  });
});

describe("generateId", () => {
  it("generates a valid UUID v4 format", () => {
    const id = generateId();
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(id).toMatch(uuidV4Regex);
  });

  it("generates unique IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(1000);
  });

  it("has correct length", () => {
    const id = generateId();
    expect(id.length).toBe(36);
  });

  it("has version 4 indicator", () => {
    const id = generateId();
    expect(id[14]).toBe("4");
  });

  it("has valid variant bits", () => {
    const id = generateId();
    const variantChar = id[19];
    expect(["8", "9", "a", "b"]).toContain(variantChar.toLowerCase());
  });
});

describe("calculateCompletenessScore", () => {
  const requiredFields = [
    "business_name",
    "industry",
    "phone",
    "services",
    "service_areas",
    "target_audience",
  ];

  const optionalFields = [
    "website",
    "email",
    "address",
    "tagline",
    "year_established",
    "differentiators",
    "testimonials",
    "awards",
    "brand_voice",
    "cta_text",
  ];

  it("returns 0 for empty object", () => {
    expect(calculateCompletenessScore({})).toBe(0);
  });

  it("returns 60 for all required fields filled", () => {
    const data: Record<string, unknown> = {};
    for (const field of requiredFields) {
      data[field] = "value";
    }
    expect(calculateCompletenessScore(data)).toBe(60);
  });

  it("returns 100 for all fields filled", () => {
    const data: Record<string, unknown> = {};
    for (const field of [...requiredFields, ...optionalFields]) {
      data[field] = "value";
    }
    expect(calculateCompletenessScore(data)).toBe(100);
  });

  it("ignores empty string values", () => {
    const data: Record<string, unknown> = {
      business_name: "",
      industry: "Food & Beverage",
    };
    expect(calculateCompletenessScore(data)).toBe(10);
  });

  it("ignores null values", () => {
    const data: Record<string, unknown> = {
      business_name: null,
      industry: "Food & Beverage",
    };
    expect(calculateCompletenessScore(data)).toBe(10);
  });

  it("ignores undefined values", () => {
    const data: Record<string, unknown> = {
      business_name: undefined,
      industry: "Food & Beverage",
    };
    expect(calculateCompletenessScore(data)).toBe(10);
  });

  it("calculates partial score correctly", () => {
    const data: Record<string, unknown> = {
      business_name: "Nash & Smashed",
      industry: "Food & Beverage",
      phone: "703-555-1234",
      website: "https://nashsmashed.com",
    };
    expect(calculateCompletenessScore(data)).toBe(34);
  });

  it("caps at 100", () => {
    const data: Record<string, unknown> = {};
    for (const field of [...requiredFields, ...optionalFields]) {
      data[field] = "value";
    }
    data["extra_field1"] = "value";
    data["extra_field2"] = "value";
    expect(calculateCompletenessScore(data)).toBe(100);
  });

  it("handles array values", () => {
    const data: Record<string, unknown> = {
      services: ["burgers", "fries", "shakes"],
    };
    expect(calculateCompletenessScore(data)).toBe(10);
  });

  it("handles number values", () => {
    const data: Record<string, unknown> = {
      year_established: 2020,
    };
    expect(calculateCompletenessScore(data)).toBe(4);
  });

  it("handles zero as valid value", () => {
    const data: Record<string, unknown> = {
      year_established: 0,
    };
    expect(calculateCompletenessScore(data)).toBe(4);
  });
});
