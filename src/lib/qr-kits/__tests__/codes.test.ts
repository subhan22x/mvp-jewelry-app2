import { describe, expect, it } from "vitest";
import { createQrKitPublicToken, normalizeBatchCode, qrKitDisplayCode } from "../codes";
import { nextQrKitCookieValue } from "../service";

describe("QR kit codes", () => {
  it("normalizes a print-safe batch code", () => {
    expect(normalizeBatchCode(" houston / sept. 26 ")).toBe("HOUSTON-SEPT-26");
  });

  it("rejects ambiguous or too-short batch codes", () => {
    expect(() => normalizeBatchCode("-")).toThrow("Batch code");
  });

  it("makes the visible inventory label deterministic", () => {
    expect(qrKitDisplayCode("HOU-SEP-26", 7)).toBe("GJ-HOU-SEP-26-007");
  });

  it("creates URL-safe, high-entropy public tokens", () => {
    const first = createQrKitPublicToken();
    const second = createQrKitPublicToken();

    expect(first).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(second).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(first).not.toBe(second);
  });

  it("keeps a separate last-scanned kit for each store in the browser cookie", () => {
    const firstToken = "A".repeat(32);
    const first = nextQrKitCookieValue(null, "first-store", firstToken);
    const second = nextQrKitCookieValue(`gj_qr_kits=${first}`, "second-store", "B".repeat(32));
    const parsed = JSON.parse(Buffer.from(second, "base64url").toString("utf8"));

    expect(parsed).toEqual({ "first-store": firstToken, "second-store": "B".repeat(32) });
  });
});
