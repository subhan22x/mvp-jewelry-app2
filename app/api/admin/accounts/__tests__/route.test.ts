// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ admin: vi.fn(), findMany: vi.fn() }));
vi.mock("@/src/lib/auth/platform-admin", () => ({ getPlatformAdminContext: mocks.admin }));
vi.mock("@/server/db/client", () => ({ prisma: { account: { findMany: mocks.findMany } } }));
import { GET } from "../route";

function get(query = "") { return GET(new Request(`https://growjewelry.io/api/admin/accounts${query}`)); }

beforeEach(() => {
  vi.resetAllMocks();
  mocks.admin.mockResolvedValue({ userId: "admin" });
  mocks.findMany.mockResolvedValue([{ id: "legacy-id", name: "Store", slug: "store", StoreProfile: { isPublished: true } }]);
});

describe("admin Account listing", () => {
  it("loads active Accounts immediately without a search", async () => {
    const response = await get();
    expect(await response.json()).toEqual({ items: [{ id: "legacy-id", name: "Store", slug: "store", storefrontPublished: true }], nextCursor: null });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: "active" }, take: 21, orderBy: [{ name: "asc" }, { id: "asc" }]
    }));
  });
  it.each(["?q=S", "?q=%20Store%20"])("searches names and slugs for %s", async query => {
    await get(query);
    const term = new URL(`https://test${query}`).searchParams.get("q")!.trim();
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: "active", OR: [
      { name: { contains: term, mode: "insensitive" } }, { slug: { contains: term, mode: "insensitive" } }
    ] } }));
  });
  it("paginates without losing Accounts with duplicate names", async () => {
    mocks.findMany.mockResolvedValue(Array.from({ length: 21 }, (_, i) => ({ id: `account-${i}`, name: "Store", slug: `store-${i}`, StoreProfile: null })));
    const result = await (await get("?cursor=account-previous")).json();
    expect(result.items).toHaveLength(20);
    expect(result.nextCursor).toBe("account-19");
    expect(result.items[0].storefrontPublished).toBe(false);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ cursor: { id: "account-previous" }, skip: 1 }));
  });
  it("returns an explicit empty result", async () => {
    mocks.findMany.mockResolvedValue([]);
    expect(await (await get()).json()).toEqual({ items: [], nextCursor: null });
  });
  it("rejects non-admin sessions before reading any Accounts", async () => {
    mocks.admin.mockResolvedValue(null);
    expect((await get()).status).toBe(401);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
  it.each([`?q=${"x".repeat(121)}`, "?cursor="])("rejects invalid search parameters %s", async query => {
    expect((await get(query)).status).toBe(400);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});
