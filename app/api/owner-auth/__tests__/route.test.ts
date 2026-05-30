import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("/api/owner-auth", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.OWNER_ACCESS_CODE = "ID8";
  });

  afterEach(() => {
    delete process.env.OWNER_ACCESS_CODE;
  });

  it("sets an http-only owner session cookie for the correct access code", async () => {
    const { POST } = await import("../route");

    const response = await POST(new Request("http://test.local/api/owner-auth", {
      method: "POST",
      body: JSON.stringify({ accessCode: "ID8" })
    }));
    const json = await response.json();
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(setCookie).toContain("owner_session=");
    expect(setCookie.toLowerCase()).toContain("httponly");
  });

  it("rejects an invalid access code", async () => {
    const { POST } = await import("../route");

    const response = await POST(new Request("http://test.local/api/owner-auth", {
      method: "POST",
      body: JSON.stringify({ accessCode: "WRONG" })
    }));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toMatch(/invalid owner access code/i);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
