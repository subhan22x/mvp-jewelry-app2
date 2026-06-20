import { describe, expect, it } from "vitest";
import { buildQuoteMessage } from "../quote-message";

describe("buildQuoteMessage", () => {
  it("restores the complete quote message format", () => {
    expect(buildQuoteMessage({
      customerName: "Maina",
      quotedPriceCents: 3453400,
      estimatedDelivery: "3-4 weeks",
      material: "gold",
      materialKarat: "14k",
      stoneType: "lab_diamonds",
      notes: "Production begins after approval.",
      quoteUrl: "https://example.com/q/test"
    })).toBe([
      "Your custom jewelry quote is ready.",
      "Price: $34,534.00",
      "Estimated delivery: 3-4 weeks",
      "Material: 14K Gold",
      "Stone: Lab Diamonds",
      "Message: Production begins after approval.",
      "Open your quote: https://example.com/q/test"
    ].join("\n"));
  });
});
