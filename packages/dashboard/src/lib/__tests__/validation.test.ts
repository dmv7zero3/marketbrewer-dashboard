import {
  validateEmail,
  validatePhone,
  validateURL,
  validateKeyword,
  validateCity,
  validateState,
  validateBusinessName,
  validateIndustry,
} from "../validation";

describe("validation helpers", () => {
  describe("validateEmail", () => {
    it("allows empty email", () => {
      expect(validateEmail("")).toBeNull();
    });

    it("rejects invalid email", () => {
      expect(validateEmail("not-an-email")).toBe("Invalid email format");
    });

    it("accepts valid email", () => {
      expect(validateEmail("user@example.com")).toBeNull();
    });
  });

  describe("validatePhone", () => {
    it("allows empty phone", () => {
      expect(validatePhone("")).toBeNull();
    });

    it("rejects too short phone", () => {
      expect(validatePhone("123")).toBe("Invalid phone format");
    });

    it("accepts formatted phone", () => {
      expect(validatePhone("(703) 555-1212")).toBeNull();
    });
  });

  describe("validateURL", () => {
    it("allows empty url", () => {
      expect(validateURL("")).toBeNull();
    });

    it("rejects malformed url", () => {
      expect(validateURL("http://" )).toBe("Invalid URL format");
    });

    it("accepts url without scheme", () => {
      expect(validateURL("example.com")).toBeNull();
    });
  });

  describe("validateKeyword", () => {
    it("rejects empty keyword", () => {
      expect(validateKeyword(" ")).toBe("Keyword cannot be empty");
    });

    it("rejects too short keyword", () => {
      expect(validateKeyword("a")).toBe("Keyword must be at least 2 characters");
    });

    it("accepts valid keyword", () => {
      expect(validateKeyword("local seo")).toBeNull();
    });
  });

  describe("validateCity", () => {
    it("rejects empty city", () => {
      expect(validateCity(" ")).toBe("City is required");
    });

    it("rejects invalid characters", () => {
      expect(validateCity("City123")).toBe(
        "City must contain only letters, spaces, hyphens, and apostrophes"
      );
    });

    it("accepts valid city", () => {
      expect(validateCity("San Jose")).toBeNull();
    });
  });

  describe("validateState", () => {
    it("rejects empty state", () => {
      expect(validateState(" ")).toBe("State is required");
    });

    it("rejects invalid state", () => {
      expect(validateState("Virginia")).toBe("State must be a 2-letter code (e.g., VA, MD)");
    });

    it("accepts valid state", () => {
      expect(validateState("va")).toBeNull();
    });
  });

  describe("validateBusinessName", () => {
    it("rejects empty business name", () => {
      expect(validateBusinessName(" ")).toBe("Business name is required");
    });

    it("rejects too short business name", () => {
      expect(validateBusinessName("A")).toBe("Business name must be at least 2 characters");
    });

    it("accepts valid business name", () => {
      expect(validateBusinessName("MarketBrewer")).toBeNull();
    });
  });

  describe("validateIndustry", () => {
    it("rejects empty industry", () => {
      expect(validateIndustry(" ")).toBe("Industry is required");
    });

    it("rejects too short industry", () => {
      expect(validateIndustry("A")).toBe("Industry must be at least 2 characters");
    });

    it("accepts valid industry", () => {
      expect(validateIndustry("Restaurants")).toBeNull();
    });
  });
});
