// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ resolve: vi.fn() }));
vi.mock("@/src/lib/qr-kits/service", async importOriginal => ({
  ...await importOriginal<typeof import("@/src/lib/qr-kits/service")>(), resolvePublicQrKit: mocks.resolve
}));
vi.mock("@/server/db/client", () => ({ prisma: {} }));
import { GET } from "../route";
const token = "A".repeat(32);
const otherToken = "B".repeat(32);
beforeEach(() => { mocks.resolve.mockReset(); });
afterEach(() => vi.unstubAllEnvs());

describe("printed QR redirects", () => {
  it("keeps the printed URL fixed and resolves the Account at scan time", async () => {
    mocks.resolve.mockResolvedValue("store");
    const req = new NextRequest(`https://growjewelry.io/scan/${token}`);
    const response = await GET(req, { params: Promise.resolve({ token }) });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(`https://growjewelry.io/s/store/design?kit=${token}`);
    expect(mocks.resolve).toHaveBeenCalledWith(token);
    const cookie = response.cookies.get("gj_qr_kits")!;
    expect(JSON.parse(Buffer.from(cookie.value, "base64url").toString())).toEqual({ store: token });
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=14400");
  });
  it("preserves attribution for another Account and secures production cookies", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.resolve.mockResolvedValue("store");
    const previous = Buffer.from(JSON.stringify({ other: otherToken })).toString("base64url");
    const req = new NextRequest(`https://growjewelry.io/scan/${token}`, { headers: { cookie: `gj_qr_kits=${previous}` } });
    const response = await GET(req, { params: Promise.resolve({ token }) });
    expect(JSON.parse(Buffer.from(response.cookies.get("gj_qr_kits")!.value, "base64url").toString())).toEqual({ other: otherToken, store: token });
    expect(response.headers.get("set-cookie")).toContain("Secure");
  });
  it("sends unavailable kits to an unavailable page without setting attribution", async () => {
    mocks.resolve.mockResolvedValue(null);
    const response = await GET(new NextRequest(`https://growjewelry.io/scan/${token}`), { params: Promise.resolve({ token }) });
    expect(response.headers.get("location")).toBe("https://growjewelry.io/qr-unavailable");
    expect(response.cookies.get("gj_qr_kits")).toBeUndefined();
  });
});
