import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getOwnerContext: vi.fn() }));

function authedRequest(url: string) {
  return new Request(url);
}

vi.mock("@/src/lib/auth/owner-context", () => ({
  getOwnerContext: mocks.getOwnerContext,
}));

describe("/api/owner/link", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.getOwnerContext.mockResolvedValue({ accountId: "demo-account", userId: "demo", authUserId: "auth-demo", email: "demo@example.com" });
  });

  it("treats any real HTTP response as reachable, including Cloudflare 503 pages", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 503 }));
    const { GET } = await import("../route");

    const response = await GET(authedRequest("http://test.local/api/owner/link?url=https%3A%2F%2Fwww.shopdiamondx.com"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      url: "https://www.shopdiamondx.com/",
      exists: true,
      status: "found",
      httpStatus: 503,
    });
  });

  it("rejects invalid urls before attempting a network request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { GET } = await import("../route");

    const response = await GET(authedRequest("http://test.local/api/owner/link?url=not%20a%20url"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe("invalid");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
