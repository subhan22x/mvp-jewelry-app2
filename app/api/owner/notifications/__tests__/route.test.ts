import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ owner: vi.fn(), setting: vi.fn(), save: vi.fn() }));
vi.mock("@/src/lib/auth/owner-context", () => ({ getOwnerContext: mocks.owner }));
vi.mock("@/server/db/client", () => ({ prisma: { appSetting: { findUnique: mocks.setting, upsert: mocks.save } } }));
import { GET, POST } from "../route";
beforeEach(() => { vi.clearAllMocks(); mocks.owner.mockResolvedValue({ accountId: "owner-account", email: "owner@example.com" }); mocks.setting.mockResolvedValue(null); });
const request = (body: unknown) => new Request("https://example.com/api/owner/notifications", { method: "POST", body: JSON.stringify(body) });
describe("owner notification preference API", () => {
  it("requires authenticated owner context", async () => {
    mocks.owner.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect((await POST(request({ enabled: true, emailOverride: null }))).status).toBe(401);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("returns enabled defaults and the owner's login email", async () => {
    expect(await (await GET()).json()).toMatchObject({ enabled: true, email: "owner@example.com", smsEnabled: false });
  });
  it("rejects SMS activation, invalid emails, and client-supplied Account IDs", async () => {
    for (const body of [{ enabled: true, emailOverride: "bad" }, { enabled: true, emailOverride: null, smsEnabled: true }, { enabled: true, emailOverride: null, accountId: "victim" }]) expect((await POST(request(body))).status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("persists an override only for the authenticated Account", async () => {
    const response = await POST(request({ enabled: true, emailOverride: "alerts@example.com", smsEnabled: false }));
    expect(await response.json()).toMatchObject({ email: "alerts@example.com", loginEmail: "owner@example.com" });
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ accountId: "owner-account" }) }));
  });
});
