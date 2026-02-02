import { renderTemplate } from "../index";

describe("renderTemplate extras", () => {
  it("supports dotted keys", () => {
    const result = renderTemplate("Hello {{user.name}}", { "user.name": "Sam" });
    expect(result).toBe("Hello Sam");
  });

  it("renders empty for missing keys", () => {
    const result = renderTemplate("Hello {{missing}}", {});
    expect(result).toBe("Hello ");
  });
});
