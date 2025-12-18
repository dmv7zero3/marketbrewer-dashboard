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

import { createEmptyQuestionnaire } from "../types/questionnaire";

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

  it("transliterates accented characters (San José → san-jose)", () => {
    expect(toSlug("San José")).toBe("san-jose");
  });

  it("handles real-world city names with diacritics", () => {
    expect(toSlug("Montréal")).toBe("montreal");
    expect(toSlug("São Paulo")).toBe("sao-paulo");
    expect(toSlug("Zürich")).toBe("zurich");
    expect(toSlug("Bogotá")).toBe("bogota");
  });

  it("preserves SEO-friendly format for multi-word cities", () => {
    expect(toSlug("San José, CA")).toBe("san-jose-ca");
    expect(toSlug("Coeur d'Alene")).toBe("coeur-dalene");
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

  it("transliterates accented city names for SEO", () => {
    expect(toCityStateSlug("San José", "CA")).toBe("san-jose-ca");
    expect(toCityStateSlug("Montréal", "QC")).toBe("montreal-qc");
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
  const baseQuestionnaire = createEmptyQuestionnaire();

  it("returns 0 when required fields are missing", () => {
    expect(
      calculateCompletenessScore({
        business: {
          name: "",
          industry_type: "LocalBusiness",
          phone: null,
          email: null,
          website: null,
          gbp_url: null,
          primary_city: null,
          primary_state: null,
        },
        questionnaire: baseQuestionnaire,
        socialLinkCount: 0,
        hasHours: false,
        hasFullAddress: false,
      })
    ).toBe(0);
  });

  it("scores contact fields", () => {
    expect(
      calculateCompletenessScore({
        business: {
          name: "Acme Co",
          industry_type: "LocalBusiness",
          phone: "555-555-5555",
          email: null,
          website: "https://example.com",
          gbp_url: null,
          primary_city: null,
          primary_state: null,
        },
        questionnaire: baseQuestionnaire,
        socialLinkCount: 0,
        hasHours: false,
        hasFullAddress: false,
      })
    ).toBe(15); // phone 5 + website 5 + brand voiceTone 5
  });

  it("scores location fields", () => {
    expect(
      calculateCompletenessScore({
        business: {
          name: "Acme Co",
          industry_type: "LocalBusiness",
          phone: null,
          email: null,
          website: null,
          gbp_url: null,
          primary_city: "Sterling",
          primary_state: "VA",
        },
        questionnaire: baseQuestionnaire,
        socialLinkCount: 0,
        hasHours: false,
        hasFullAddress: true,
      })
    ).toBe(20); // city 2.5 + state 2.5 + address 10 + default voiceTone 5
  });

  it("scores services fields", () => {
    expect(
      calculateCompletenessScore({
        business: {
          name: "Acme Co",
          industry_type: "LocalBusiness",
          phone: null,
          email: null,
          website: null,
          gbp_url: null,
          primary_city: null,
          primary_state: null,
        },
        questionnaire: {
          ...baseQuestionnaire,
          services: {
            offerings: [
              { name: "Service 1", description: "", isPrimary: true },
              { name: "Service 2", description: "", isPrimary: false },
              { name: "Service 3", description: "", isPrimary: false },
            ],
          },
        },
        socialLinkCount: 0,
        hasHours: false,
        hasFullAddress: false,
      })
    ).toBe(17); // default voiceTone 5 + services (4+4+4)
  });

  it("scores social and hours", () => {
    expect(
      calculateCompletenessScore({
        business: {
          name: "Acme Co",
          industry_type: "LocalBusiness",
          phone: null,
          email: null,
          website: null,
          gbp_url: null,
          primary_city: null,
          primary_state: null,
        },
        questionnaire: baseQuestionnaire,
        socialLinkCount: 3,
        hasHours: true,
        hasFullAddress: false,
      })
    ).toBe(20); // brand voiceTone 5 + callToAction 5 + hours 10
  });

  it("caps at 100", () => {
    expect(
      calculateCompletenessScore({
        business: {
          name: "Acme Co",
          industry_type: "LocalBusiness",
          phone: "555-555-5555",
          email: "a@b.com",
          website: "https://example.com",
          gbp_url: "https://google.com/maps",
          primary_city: "Sterling",
          primary_state: "VA",
        },
        questionnaire: {
          identity: { tagline: "Hi", yearEstablished: "2020", ownerName: "J" },
          services: {
            offerings: [
              { name: "S1", description: "", isPrimary: true },
              { name: "S2", description: "", isPrimary: false },
              { name: "S3", description: "", isPrimary: false },
            ],
          },
          audience: { targetDescription: "All", languages: ["English"] },
          brand: {
            voiceTone: "friendly",
            forbiddenTerms: ["cheap"],
            callToAction: "Call",
          },
          serviceType: "both",
        },
        socialLinkCount: 10,
        hasHours: true,
        hasFullAddress: true,
      })
    ).toBe(100);
  });
});
