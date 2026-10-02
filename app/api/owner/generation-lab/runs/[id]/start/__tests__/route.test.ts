import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ owner: vi.fn(), find: vi.fn(), update: vi.fn(), duplicate: vi.fn(), run: vi.fn(), schedule: vi.fn(), account: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { account: { findUnique: mocks.account }, generationLabRun: { findUnique: mocks.find }, generationLabCase: { updateMany: mocks.update } } }));
vi.mock("@/src/lib/auth/owner-context", () => ({ getOwnerContext: mocks.owner }));
vi.mock("@/src/lib/generation-lab/runner", () => ({ duplicateRunForRerun: mocks.duplicate, runLabRun: mocks.run }));
vi.mock("@/src/lib/platform/background", () => ({ scheduleBackgroundTask: mocks.schedule }));
import { POST } from "../route";
const request = () => POST(new Request("http://localhost/api/owner/generation-lab/runs/run-1/start", { method: "POST" }), { params: Promise.resolve({ id: "run-1" }) });
beforeEach(() => { vi.clearAllMocks(); mocks.owner.mockResolvedValue({ accountId: "account-1", userId: "owner-1" }); mocks.find.mockResolvedValue({ id: "run-1", accountId: "account-1", status: "draft", Cases: [{}] }); mocks.account.mockResolvedValue({ id: "account-1", status: "active", subscriptionStatus: "active", subscriptionPlanKey: "basic" }); mocks.update.mockResolvedValue({ count: 0 }); mocks.run.mockResolvedValue(undefined); });
describe("generation lab subscription gate", () => {
  it.each(["draft", "completed", "failed"])("rejects unpaid %s runs before any mutation or provider call", async status => {
    mocks.find.mockResolvedValue({ id: "run-1", accountId: "account-1", status, Cases: [{}] });
    mocks.account.mockResolvedValue({ id: "account-1", status: "active", subscriptionStatus: "canceled", subscriptionPlanKey: "basic" });
    const response = await request();
    expect(response.status).toBe(402); expect(await response.json()).toMatchObject({ code: "billing_required" });
    expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.duplicate).not.toHaveBeenCalled(); expect(mocks.run).not.toHaveBeenCalled(); expect(mocks.schedule).not.toHaveBeenCalled();
  });
  it("still schedules an entitled owner's run", async () => { expect((await request()).status).toBe(200); expect(mocks.run).toHaveBeenCalledWith({ runId: "run-1", accountId: "account-1", userId: "owner-1" }); expect(mocks.schedule).toHaveBeenCalledTimes(1); });
  it("preserves existing legacy store access", async () => { mocks.account.mockResolvedValue({ id: "account-1", status: "active", subscriptionStatus: null }); expect((await request()).status).toBe(200); expect(mocks.schedule).toHaveBeenCalledTimes(1); });
  it("does not check billing or launch another account's run", async () => { mocks.find.mockResolvedValue({ id: "run-1", accountId: "other" }); expect((await request()).status).toBe(404); expect(mocks.account).not.toHaveBeenCalled(); expect(mocks.run).not.toHaveBeenCalled(); });
});
