import { describe, expect, it } from "vitest";
import { safeInternalPath } from "../redirect";

describe("safeInternalPath", () => {
  it.each(["/", "/owner", "/onboarding?tour=1#setup", "/owner?return=https://example.com"])(
    "preserves internal destination %s",
    path => {
      expect(safeInternalPath(path)).toBe(path);
      expect(new URL(safeInternalPath(path), "https://growjewelry.io").origin).toBe("https://growjewelry.io");
    }
  );

  it.each([
    "https://example.com",
    "//example.com",
    "/\\example.com",
    "/\t/example.com",
    "/\n/example.com",
    "/\r/example.com",
    "/owner\u0000",
    "/owner\u007f",
    "owner",
    "",
    null,
    undefined
  ])("rejects unsafe or missing destination %s", path => {
    expect(safeInternalPath(path)).toBe("/owner");
    expect(safeInternalPath(path, "/onboarding")).toBe("/onboarding");
  });
});
