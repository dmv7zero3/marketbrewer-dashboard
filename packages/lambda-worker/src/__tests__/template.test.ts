import { renderTemplate } from "../index";

describe("renderTemplate", () => {
  it("replaces known variables and leaves missing as empty", () => {
    const template = "Hello {{name}}, welcome to {{city}}.";
    const result = renderTemplate(template, { name: "Jorge" });
    expect(result).toBe("Hello Jorge, welcome to .");
  });

  it("supports nested tokens with dots", () => {
    const template = "Business: {{business.name}}";
    const result = renderTemplate(template, { "business.name": "MarketBrewer" });
    expect(result).toBe("Business: MarketBrewer");
  });
});
