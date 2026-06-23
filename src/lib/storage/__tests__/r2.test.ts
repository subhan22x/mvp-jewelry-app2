import { describe, expect, it } from "vitest";
import { R2_URL_PREFIX, parseR2Key } from "../r2";

describe("parseR2Key", () => {
  it("parses a well-formed r2:// reference into the object key", () => {
    expect(parseR2Key("r2://vvs-studio/acct/shoot-top-id.jpg")).toBe("vvs-studio/acct/shoot-top-id.jpg");
  });

  it("strips leading slashes after the prefix", () => {
    expect(parseR2Key("r2:///vvs-studio/key.jpg")).toBe("vvs-studio/key.jpg");
  });

  it("returns null for non-r2 schemes", () => {
    expect(parseR2Key("https://example.com/img.png")).toBeNull();
    expect(parseR2Key("/generated/img.png")).toBeNull();
    expect(parseR2Key("//evil.com/img.png")).toBeNull();
  });

  it("returns null for empty key after prefix and slash stripping", () => {
    expect(parseR2Key("r2://")).toBeNull();
    expect(parseR2Key("r2:///")).toBeNull();
  });

  it("returns null for null, undefined, and empty strings", () => {
    expect(parseR2Key(null)).toBeNull();
    expect(parseR2Key(undefined)).toBeNull();
    expect(parseR2Key("")).toBeNull();
  });
});

describe("R2_URL_PREFIX", () => {
  it("exposes the r2:// prefix constant", () => {
    expect(R2_URL_PREFIX).toBe("r2://");
  });
});
