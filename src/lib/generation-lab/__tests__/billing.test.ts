import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ find: vi.fn(), update: vi.fn(), account: vi.fn(), findCase: vi.fn(), generate: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { account: { findUnique: mocks.account }, generationLabRun: { findUnique: mocks.find, update: mocks.update }, generationLabCase: { findUnique: mocks.findCase } } }));
vi.mock("@/lib/styles/connector", () => ({ generateImage: mocks.generate }));
import { runLabRun } from "../runner";
afterEach(() => vi.restoreAllMocks());
it("stops a queued run before generating if its subscription expires", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.find.mockResolvedValue({ id: "run-1", accountId: "account-1", Cases: [{ id: "case-1" }] });
  mocks.update.mockResolvedValue({});
  mocks.account.mockResolvedValue({ id: "account-1", status: "active", subscriptionStatus: "canceled" });
  await runLabRun({ runId: "run-1", accountId: "account-1", userId: "owner-1" });
  expect(mocks.account).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "account-1" } }));
  expect(mocks.findCase).not.toHaveBeenCalled();
  expect(mocks.generate).not.toHaveBeenCalled();
  expect(mocks.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "failed" }) }));
});
