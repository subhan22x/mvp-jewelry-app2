// @vitest-environment node
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requestCreate: vi.fn(), resultCreate: vi.fn(), resultUpdate: vi.fn(),
  generate: vi.fn(), resolveAccount: vi.fn(), owner: vi.fn(), usage: vi.fn(),
  usageResponse: vi.fn(), consume: vi.fn(), quote: vi.fn(), readUpload: vi.fn(), bind: vi.fn(),
  tasks: [] as Promise<unknown>[]
}));
vi.mock("@/server/db/client", () => ({ prisma: { request: { create: mocks.requestCreate }, result: { create: mocks.resultCreate, update: mocks.resultUpdate } } }));
vi.mock("@/lib/styles/connector", () => ({ generateImage: mocks.generate }));
vi.mock("@/src/lib/account", () => ({ getDefaultAccountId: () => "default-account" }));
vi.mock("@/src/lib/auth/owner-context", () => ({ getOwnerContext: mocks.owner }));
vi.mock("@/src/lib/tenant", () => ({ PublicTenantAccessError: class extends Error { status = 403; }, resolveAccountIdFromSlug: mocks.resolveAccount }));
vi.mock("@/src/lib/billing/signup-credits", () => ({ withSignupGeneration: (handler: unknown) => handler, signupGenerationUserId: (id: string) => id, bindSignupGeneration: mocks.bind }));
vi.mock("@/src/lib/platform/background", () => ({ scheduleBackgroundTask: (task: Promise<unknown>) => mocks.tasks.push(task) }));
vi.mock("@/src/lib/notifications/origin", () => ({ requestNotificationAudience: async () => "customer" }));
vi.mock("@/src/lib/usage", () => ({ ensureUsageAvailable: mocks.usage, consumeUsageCredit: mocks.consume, usageErrorResponse: mocks.usageResponse }));
vi.mock("@/src/lib/quotes/ensure-draft-quote", () => ({ ensureDraftQuoteForRequest: mocks.quote }));
vi.mock("@/src/lib/qr-kits/service", () => ({ QrKitAttributionError: class extends Error {}, resolveQrKitAttributionFromRequest: async () => ({ qrKitId: "qr-1" }) }));
vi.mock("@/src/lib/storage/direct-upload", async importOriginal => ({ ...await importOriginal<object>(), readDirectUpload: mocks.readUpload }));

const settings = { userId: "demo", accountSlug: "store", shape: "custom", colorCombo: "ROSE_WHITE", size: "large", stoneType: "cz", diamondQuality: "vs", metalType: "silver", additionalText: "GROW" };

async function imageBytes() {
  return sharp({ create: { width: 2, height: 2, channels: 4, background: "white" } }).png().toBuffer();
}
async function formRequest(file?: File, overrides = {}) {
  const form = new FormData();
  Object.entries({ ...settings, ...overrides }).forEach(([key, value]) => form.set(key, value));
  if (file) form.set("image", file);
  return new Request("http://localhost/api/logo-requests", { method: "POST", body: form });
}
const jsonRequest = (key: string) => new Request("http://localhost/api/logo-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...settings, imageUpload: { key, contentType: "image/png", size: 100, originalName: "logo.png" } }) });

describe("logo generation pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tasks.length = 0;
    mocks.resolveAccount.mockResolvedValue("store-account");
    mocks.owner.mockResolvedValue(null);
    mocks.usage.mockResolvedValue({});
    mocks.usageResponse.mockReturnValue(null);
    mocks.requestCreate.mockResolvedValue({ id: "logo-request" });
    mocks.resultCreate.mockImplementation(async ({ data }) => ({ id: "logo-result", ...data }));
    mocks.resultUpdate.mockResolvedValue({ id: "logo-result" });
    mocks.generate.mockResolvedValue({ imageUrl: "/generated/logo.png", modelId: "gemini-test" });
    mocks.consume.mockResolvedValue({});
    mocks.quote.mockResolvedValue({ ok: true });
  });

  it("returns a pending request, sends only the logo, saves the exact prompt and completes usage/quote tracking", async () => {
    const { POST } = await import("../route");
    let complete!: (value: { imageUrl: string; modelId: string }) => void;
    mocks.generate.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    const bytes = await imageBytes();
    const response = await POST(await formRequest(new File([bytes], "logo.png", { type: "image/png" })));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ requestId: "logo-request" });
    expect(mocks.resultUpdate).not.toHaveBeenCalled();
    const data = mocks.requestCreate.mock.calls[0][0].data;
    expect(data).toMatchObject({ accountId: "store-account", qrKitId: "qr-1", productType: "logo", styleId: "logo_custom", stoneType: "cz", diamondQuality: "vs", metalType: "silver", primaryMetal: "rose_gold", secondaryMetal: "white_gold", text: "GROW" });
    const generation = mocks.generate.mock.calls[0][0];
    expect(generation.attachments).toHaveLength(1);
    expect(generation.prompt).not.toMatch(/selected .*shape|pendant shape/);
    expect(generation.prompt).toContain("VVS natural diamonds");
    expect(mocks.resultCreate.mock.calls[0][0].data.prompt).toBe(generation.prompt);
    expect((await fs.readFile(generation.attachments[0])).length).toBeGreaterThan(0);
    complete({ imageUrl: "/generated/logo.png", modelId: "gemini-test" });
    await Promise.all(mocks.tasks);
    expect(mocks.resultUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "succeeded", imageUrl: "/generated/logo.png" }) }));
    expect(mocks.consume).toHaveBeenCalledWith(expect.objectContaining({ accountId: "store-account", sourceId: "logo-result" }));
    expect(mocks.quote).toHaveBeenCalledWith("logo-request");
    await expect(fs.access(generation.attachments[0])).rejects.toThrow();
  });

  it.each([
    ["circle", "circle_rose_gold.png"],
    ["shield", "shield_yellow_gold.png"],
    ["hexa", "hexagon_rose_gold.png"],
    ["diamond", "diamond_yellow_gold.png"]
  ])("sends and records the logo plus the %s reference", async (shape, filename) => {
    const { POST } = await import("../route");
    let complete!: (value: { imageUrl: string; modelId: string }) => void;
    mocks.generate.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    const bytes = await imageBytes();
    const response = await POST(await formRequest(new File([bytes], "logo.png", { type: "image/png" }), { shape }));
    expect(response.status).toBe(201);
    const generation = mocks.generate.mock.calls[0][0];
    try {
      expect(generation.attachments).toHaveLength(2);
      expect(generation.attachments[1]).toBe(path.join(process.cwd(), "public/logo-pendants/references", filename));
      expect((await sharp(await fs.readFile(generation.attachments[0])).metadata()).format).toBe("png");
      expect((await sharp(await fs.readFile(generation.attachments[1])).metadata()).format).toBe("png");
      expect(JSON.parse(mocks.resultCreate.mock.calls[0][0].data.attachmentPathsJson)).toEqual(generation.attachments);
    } finally {
      complete({ imageUrl: "/generated/logo.png", modelId: "gemini-test" });
      await Promise.all(mocks.tasks);
    }
    await expect(fs.access(generation.attachments[0])).rejects.toThrow();
    await expect(fs.access(generation.attachments[1])).resolves.toBeUndefined();
  });

  it("rejects unavailable Accounts before reading uploaded objects", async () => {
    const { PublicTenantAccessError } = await import("@/src/lib/tenant");
    mocks.resolveAccount.mockRejectedValue(new PublicTenantAccessError("access_denied"));
    const { POST } = await import("../route");
    expect((await POST(jsonRequest("incoming/logo-pendant/logo.png"))).status).toBe(403);
    expect(mocks.readUpload).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.requestCreate).not.toHaveBeenCalled();
  });

  it("rejects unavailable usage before reading uploaded objects", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.usage.mockRejectedValueOnce(new Error("Private billing detail"));
    const { POST } = await import("../route");
    const response = await POST(jsonRequest("incoming/logo-pendant/logo.png"));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("Private billing detail");
    expect(mocks.readUpload).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("preserves shared billing denial responses", async () => {
    mocks.usage.mockRejectedValueOnce(new Error("Billing denial"));
    mocks.usageResponse.mockReturnValueOnce({ error: "Monthly usage limit reached." });
    const { POST } = await import("../route");
    const response = await POST(jsonRequest("incoming/logo-pendant/logo.png"));
    expect(response.status).toBe(402);
    expect(await response.json()).toEqual({ error: "Monthly usage limit reached." });
    expect(mocks.readUpload).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("rejects disguised SVG content despite an allowed declared MIME type", async () => {
    const { POST } = await import("../route");
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>';
    expect((await POST(await formRequest(new File([svg], "logo.png", { type: "image/png" })))).status).toBe(400);
    expect(mocks.requestCreate).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("rejects compressed images exceeding the decoded pixel limit", async () => {
    const { POST } = await import("../route");
    const bytes = await sharp({ create: { width: 5100, height: 5100, channels: 3, background: "white" } }).png().toBuffer();
    expect((await POST(await formRequest(new File([bytes], "huge.png", { type: "image/png" })))).status).toBe(400);
    expect(mocks.requestCreate).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("does not disclose unexpected storage errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.readUpload.mockRejectedValueOnce(new Error("Private storage path /secret/file"));
    const { POST } = await import("../route");
    const response = await POST(jsonRequest("incoming/logo-pendant/logo.png"));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("/secret/file");
    expect(mocks.requestCreate).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it.each([
    { shape: "../../private" },
    { colorCombo: "attacker-metal" },
    { additionalText: "x".repeat(2001) },
    { userId: "x".repeat(241) }
  ])("rejects invalid settings before storing or generating", async overrides => {
    const { POST } = await import("../route");
    const bytes = await imageBytes();
    expect((await POST(await formRequest(new File([bytes], "logo.png", { type: "image/png" }), overrides))).status).toBe(400);
    expect(mocks.requestCreate).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("rejects oversized image bytes even if direct-upload metadata lies", async () => {
    mocks.readUpload.mockResolvedValueOnce({ buffer: Buffer.alloc(10 * 1024 * 1024 + 1) });
    const { POST } = await import("../route");
    expect((await POST(jsonRequest("incoming/logo-pendant/logo.png"))).status).toBe(400);
    expect(mocks.requestCreate).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("bounds normalized logo dimensions without enlarging small images", async () => {
    let complete!: (value: { imageUrl: string; modelId: string }) => void;
    mocks.generate.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    const bytes = await sharp({ create: { width: 3000, height: 1000, channels: 3, background: "white" } }).png().toBuffer();
    const { POST } = await import("../route");
    expect((await POST(await formRequest(new File([bytes], "logo.png", { type: "image/png" })))).status).toBe(201);
    try {
      const metadata = await sharp(await fs.readFile(mocks.generate.mock.calls[0][0].attachments[0])).metadata();
      expect(metadata.width).toBe(2048);
      expect(metadata.height).toBeLessThanOrEqual(2048);
    } finally {
      complete({ imageUrl: "/generated/logo.png", modelId: "gemini-test" });
      await Promise.all(mocks.tasks);
    }
  });

  it("accepts direct R2 logo uploads", async () => {
    mocks.readUpload.mockResolvedValue({ buffer: await imageBytes() });
    const { POST } = await import("../route");
    expect((await POST(jsonRequest("incoming/logo-pendant/logo.png"))).status).toBe(201);
    await Promise.all(mocks.tasks);
    expect(mocks.readUpload).toHaveBeenCalled();
  });

  it("rejects another upload purpose before reading it or saving a request", async () => {
    const { POST } = await import("../route");
    expect((await POST(jsonRequest("incoming/picture-pendant/logo.png"))).status).toBe(400);
    expect(mocks.readUpload).not.toHaveBeenCalled();
    expect(mocks.requestCreate).not.toHaveBeenCalled();
  });

  it("rejects missing uploads and invalid image bytes", async () => {
    const { POST } = await import("../route");
    expect((await POST(await formRequest())).status).toBe(400);
    expect((await POST(await formRequest(new File(["broken"], "logo.png", { type: "image/png" })))).status).toBe(400);
    expect(mocks.requestCreate).not.toHaveBeenCalled();
  });

  it("records provider failures, cleans up uploads, and does not consume usage", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.generate.mockRejectedValue(new Error("Provider unavailable"));
    const { POST } = await import("../route");
    const bytes = await imageBytes();
    expect((await POST(await formRequest(new File([bytes], "logo.png", { type: "image/png" })))).status).toBe(201);
    await Promise.all(mocks.tasks);
    expect(mocks.resultUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "failed", error: "Logo pendant generation failed. Please try again." }) }));
    expect(mocks.consume).not.toHaveBeenCalled();
    expect(mocks.quote).not.toHaveBeenCalled();
    await expect(fs.access(mocks.generate.mock.calls[0][0].attachments[0])).rejects.toThrow();
    consoleSpy.mockRestore();
  });

  it("keeps a successful image available if usage tracking fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.consume.mockRejectedValue(new Error("Usage write failed"));
    const { POST } = await import("../route");
    const bytes = await imageBytes();
    await POST(await formRequest(new File([bytes], "logo.png", { type: "image/png" })));
    await Promise.all(mocks.tasks);
    expect(mocks.resultUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.resultUpdate.mock.calls[0][0].data.status).toBe("succeeded");
    expect(mocks.quote).toHaveBeenCalledWith("logo-request");
    consoleSpy.mockRestore();
  });
});
