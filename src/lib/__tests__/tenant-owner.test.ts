import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ owner: vi.fn(), account: vi.fn(), authUser: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { account: { findUnique: mock.account } } }));
vi.mock("@/src/lib/auth/owner-context", () => ({ getOwnerContext: mock.owner }));
vi.mock("@/src/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mock.authUser } }) }));
import { AuthSessionMissingError } from "@supabase/supabase-js";
import { getDefaultAccountId } from "../account";
import { resolveAccountIdFromSlug } from "../tenant";
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test"); mock.owner.mockResolvedValue({ accountId: "own" }); mock.authUser.mockResolvedValue({ data: { user: null }, error: new AuthSessionMissingError() }); vi.stubEnv("DEFAULT_ACCOUNT_ID", "admin-account"); });
afterEach(() => vi.unstubAllEnvs());
describe("owner design Account resolution", () => {
  it("routes a truly anonymous root try-out to the configured admin Account", async () => {
    mock.owner.mockResolvedValue(null);
    expect(await resolveAccountIdFromSlug(undefined) ?? getDefaultAccountId()).toBe("admin-account");
    expect(mock.authUser).toHaveBeenCalledOnce();
  });
  it("rejects an authenticated visitor without an active Account", async () => {
    mock.owner.mockResolvedValue(null);
    mock.authUser.mockResolvedValue({ data: { user: { id: "unlinked-user" } }, error: null });
    await expect(resolveAccountIdFromSlug(undefined)).rejects.toMatchObject({ status: 403, message: expect.stringContaining("no active Account") });
  });
  it("does not fall back to the admin Account when authentication cannot be verified", async () => {
    mock.owner.mockResolvedValue(null);
    mock.authUser.mockResolvedValue({ data: { user: null }, error: new Error("Auth unavailable") });
    await expect(resolveAccountIdFromSlug(undefined)).rejects.toMatchObject({ status: 403, message: expect.stringContaining("verify your session") });
  });
  it("keeps an anonymous storefront customer in the store Account", async () => {
    mock.owner.mockResolvedValue(null);
    mock.account.mockResolvedValue({ id: "store-account", slug: "store", name: "Store", status: "active", subscriptionStatus: null, StoreProfile: { isPublished: true, displayName: "Store" } });
    expect(await resolveAccountIdFromSlug("store")).toBe("store-account");
    expect(mock.authUser).not.toHaveBeenCalled();
  });
  it("resolves an authenticated unscoped builder to its own Account", async () => {
    expect(await resolveAccountIdFromSlug(undefined) ?? getDefaultAccountId()).toBe("own");
    expect(mock.authUser).not.toHaveBeenCalled();
  });
  it("admits the owner's unpublished Account by slug", async () => {
    mock.account.mockResolvedValue({ slug: "own-store" });
    expect(await resolveAccountIdFromSlug("own-store")).toBe("own");
  });
  it("does not admit a different unpublished Account", async () => {
    mock.account.mockResolvedValueOnce({ slug: "own-store" }).mockResolvedValueOnce({ slug: "other-store", StoreProfile: { isPublished: false } });
    await expect(resolveAccountIdFromSlug("other-store")).rejects.toThrow("Storefront is not available");
  });
  it("preserves the anonymous default when auth is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(await resolveAccountIdFromSlug(undefined)).toBeNull();
    expect(mock.owner).not.toHaveBeenCalled();
  });
});
