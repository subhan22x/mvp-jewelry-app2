// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getStyle } from "../registry";

describe("public style ID validation", () => {
  it.each(["../king", "*", "{king,lexy}", "{".repeat(5000) + "a" + "}".repeat(5000), "x".repeat(81)])("rejects untrusted glob/path syntax", value => {
    expect(() => getStyle(value)).toThrow("Invalid style ID.");
  });
  it("continues to resolve configured styles", () => {
    expect(getStyle("king").id).toBe("king");
  });
});
