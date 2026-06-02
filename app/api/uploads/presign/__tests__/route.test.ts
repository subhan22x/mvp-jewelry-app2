import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createPresignedR2Upload: vi.fn(),
  getOwnerContext: vi.fn(),
  isR2Configured: vi.fn()
}));

vi.mock("@/src/lib/storage/r2", () => ({
  createPresignedR2Upload: mocks.createPresignedR2Upload,
  isR2Configured: mocks.isR2Configured
}));

vi.mock("@/src/lib/auth/owner-context", () => ({
  getOwnerContext: mocks.getOwnerContext
}));

function request(body: Record<string, unknown>) {
  return new Request("http://test.local/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("/api/uploads/presign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isR2Configured.mockReturnValue(true);
    mocks.getOwnerContext.mockResolvedValue(null);
    mocks.createPresignedR2Upload.mockResolvedValue({
      uploadUrl: "https://r2.example.com/signed",
      publicUrl: "https://media.example.com/incoming/file.png"
    });
  });

  it("creates a signed public picture-pendant upload", async () => {
    const { POST } = await import("../route");
    const response = await POST(request({
      purpose: "picture-pendant",
      fileName: "portrait.png",
      contentType: "image/png",
      size: 1024
    }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual(expect.objectContaining({
      uploadUrl: "https://r2.example.com/signed",
      contentType: "image/png",
      originalName: "portrait.png",
      size: 1024
    }));
    expect(json.key).toMatch(/^incoming\/picture-pendant\/.+\.png$/);
  });

  it("requires owner auth for owner upload scopes", async () => {
    const { POST } = await import("../route");
    const response = await POST(request({
      purpose: "owner-profile",
      fileName: "profile.jpg",
      contentType: "image/jpeg",
      size: 1024
    }));

    expect(response.status).toBe(401);
    expect(mocks.createPresignedR2Upload).not.toHaveBeenCalled();
  });

  it("returns a local-fallback signal when R2 is not configured", async () => {
    mocks.isR2Configured.mockReturnValue(false);
    const { POST } = await import("../route");
    const response = await POST(request({
      purpose: "picture-pendant",
      fileName: "portrait.png",
      contentType: "image/png",
      size: 1024
    }));

    expect(response.status).toBe(503);
  });
});
