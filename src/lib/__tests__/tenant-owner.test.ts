import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ owner: vi.fn(), account: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { account: { findUnique: mock.account } } }));
vi.mock("@/src/lib/auth/owner-context", () => ({ getOwnerContext: mock.owner }));
import { resolveAccountIdFromSlug } from "../tenant";
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test"); mock.owner.mockResolvedValue({ accountId: "own" }); });
afterEach(() => vi.unstubAllEnvs());
describe("owner design Account resolution", () => {
  it("resolves an authenticated unscoped builder to its own Account", async () => {
    expect(await resolveAccountIdFromSlug(undefined)).toBe("own");
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
