import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  usagePlanFindFirst: vi.fn(),
  usageBucketFindUnique: vi.fn()
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    usagePlan: { findFirst: mocks.usagePlanFindFirst },
    accountUsageBucket: { findUnique: mocks.usageBucketFindUnique }
  }
}));

describe("getMonthlyUsageSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-20T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses the active plan limit and current monthly bucket", async () => {
    mocks.usagePlanFindFirst.mockResolvedValue({ limitsJson: JSON.stringify({ design_image_generated: 500 }) });
    mocks.usageBucketFindUnique.mockResolvedValue({ used: 20 });
    const { getMonthlyUsageSummary } = await import("../usage");

    const summary = await getMonthlyUsageSummary("account-1", "design_image_generated");

    expect(summary.used).toBe(20);
    expect(summary.included).toBe(500);
    expect(summary.periodStart).toEqual(new Date("2026-06-01T00:00:00Z"));
    expect(summary.periodEnd).toEqual(new Date("2026-07-01T00:00:00Z"));
  });

  it("returns zero usage without creating a missing bucket", async () => {
    mocks.usagePlanFindFirst.mockResolvedValue({ limitsJson: JSON.stringify({ design_image_generated: 500 }) });
    mocks.usageBucketFindUnique.mockResolvedValue(null);
    const { getMonthlyUsageSummary } = await import("../usage");

    const summary = await getMonthlyUsageSummary("account-1", "design_image_generated");

    expect(summary).toMatchObject({ used: 0, included: 500 });
    expect(mocks.usageBucketFindUnique).toHaveBeenCalledOnce();
  });

  it("falls back to the default monthly limit without an active custom plan", async () => {
    mocks.usagePlanFindFirst.mockResolvedValue(null);
    mocks.usageBucketFindUnique.mockResolvedValue(null);
    const { getMonthlyUsageSummary } = await import("../usage");

    const summary = await getMonthlyUsageSummary("account-1", "design_image_generated");

    expect(summary).toMatchObject({ used: 0, included: 100 });
  });
});
