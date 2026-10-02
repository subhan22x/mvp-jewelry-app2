// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), updateMany: vi.fn(), eventCreate: vi.fn() }));
vi.mock("@/server/db/client", () => {
  const tx = { account: { findUnique: vi.fn(async () => ({ id: "account", status: "active" })) }, qrKit: { findUnique: mocks.findUnique, updateMany: mocks.updateMany, findUniqueOrThrow: mocks.findUnique }, qrKitEvent: { create: mocks.eventCreate } };
  return { prisma: { ...tx, $transaction: async (fn: any) => fn(tx) } };
});
import { assignQrKit, changeQrKitStatus, nextQrKitCookieValue, resolveQrKitAttribution, resolveQrKitAttributionFromRequest } from "../service";
const token = "A".repeat(32);
const account = { id: "account", slug: "store", status: "active", subscriptionStatus: "canceled", subscriptionPlanKey: "basic", trialEndsAt: null, subscriptionCurrentPeriodEnd: null, cancelAtPeriodEnd: false, billingIssueStartedAt: null, StoreProfile: { isPublished: true }, AccessExceptions: [{ id: "grant", expiresAt: null, revokedAt: null }] };
beforeEach(() => {
  vi.clearAllMocks();
  // Emulate Prisma projection: a omitted grant must reproduce the integration bug.
  mocks.findUnique.mockImplementation(async ({ select }: any) => ({ id: "kit", status: "assigned", account: { ...account, AccessExceptions: select?.account?.select?.AccessExceptions ? account.AccessExceptions : undefined } }));
  mocks.updateMany.mockResolvedValue({ count: 0 });
});
describe("QR access and attribution boundaries", () => {
  it("honors complimentary access when scanning a published store", async () => {
    expect(await resolveQrKitAttribution("store", token)).toEqual({ qrKitId: "kit" });
  });
  it.each(["suspended", "lost", "retired"])("rejects a %s kit", async status => {
    mocks.findUnique.mockResolvedValue({ id: "kit", status, account });
    await expect(resolveQrKitAttribution("store", token)).rejects.toMatchObject({ status: 410 });
  });
  it("rejects cross-account attribution", async () => {
    await expect(resolveQrKitAttribution("another-store", token)).rejects.toMatchObject({ status: 403 });
  });
  it.each([
    { status: "disabled" },
    { StoreProfile: { isPublished: false } },
    { AccessExceptions: [] },
    { AccessExceptions: [{ id: "grant", expiresAt: null, revokedAt: new Date() }] },
    { AccessExceptions: [{ id: "grant", expiresAt: new Date(0), revokedAt: null }] },
  ])("rejects unavailable store state %j", async override => {
    mocks.findUnique.mockResolvedValue({ id: "kit", status: "assigned", account: { ...account, ...override } });
    await expect(resolveQrKitAttribution("store", token)).rejects.toMatchObject({ status: 403 });
  });
  it("does not write audit events when a concurrent assignment wins", async () => {
    await expect(assignQrKit({ qrKitId: "kit", accountId: "account", actorUserId: "admin" })).rejects.toThrow("no longer available");
    expect(mocks.eventCreate).not.toHaveBeenCalled();
  });
  it("does not write audit events when a concurrent status update wins", async () => {
    mocks.findUnique.mockResolvedValue({ id: "kit", accountId: "account", status: "assigned" });
    await expect(changeQrKitStatus({ qrKitId: "kit", status: "suspended", actorUserId: "admin" })).rejects.toThrow("changed");
    expect(mocks.eventCreate).not.toHaveBeenCalled();
  });
  it.each(["gj_qr_kits=%bad", "gj_qr_kits=e30", `gj_qr_kits=${Buffer.from(JSON.stringify({ store: 123 })).toString("base64url")}`])("ignores malformed cookies %s", async cookie => {
    expect(await resolveQrKitAttributionFromRequest(new Request("http://localhost", { headers: { cookie } }), "store")).toEqual({ qrKitId: null });
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
  it("bounds cookie growth and uses only the current store's token", async () => {
    let cookie = "";
    for (let i = 0; i < 100; i++) cookie = `gj_qr_kits=${nextQrKitCookieValue(cookie, `store-${i}`, token)}`;
    const entries = JSON.parse(Buffer.from(cookie.split("=")[1], "base64url").toString("utf8"));
    expect(Object.keys(entries)).toHaveLength(12);
    expect(entries["store-0"]).toBeUndefined();
    expect(await resolveQrKitAttributionFromRequest(new Request("http://localhost", { headers: { cookie } }), "store")).toEqual({ qrKitId: null });
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
});
