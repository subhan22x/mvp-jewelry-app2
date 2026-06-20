import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  quoteRequestCount: vi.fn(),
  quoteRequestAggregate: vi.fn(),
  getMonthlyUsageSummary: vi.fn()
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    quoteRequest: {
      count: mocks.quoteRequestCount,
      aggregate: mocks.quoteRequestAggregate
    }
  }
}));

vi.mock("@/src/lib/usage", () => ({
  getMonthlyUsageSummary: mocks.getMonthlyUsageSummary
}));

describe("getOwnerDashboardMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.quoteRequestCount.mockResolvedValueOnce(3).mockResolvedValueOnce(2);
    mocks.getMonthlyUsageSummary.mockResolvedValue({ used: 20, included: 500 });
    mocks.quoteRequestAggregate.mockResolvedValue({ _sum: { quotedPriceCents: 375000 } });
  });

  it("returns quote counts, monthly plan usage, and sent plus fulfilled revenue", async () => {
    const { getOwnerDashboardMetrics } = await import("../dashboard-metrics");
    const metrics = await getOwnerDashboardMetrics("account-1");

    expect(metrics).toEqual({
      sentQuotes: 3,
      pendingQuotes: 2,
      designUsage: { used: 20, included: 500 },
      potentialRevenueCents: 375000
    });
    expect(mocks.quoteRequestAggregate).toHaveBeenCalledWith({
      where: {
        accountId: "account-1",
        status: { in: ["sent", "fulfilled"] },
        quotedPriceCents: { not: null }
      },
      _sum: { quotedPriceCents: true }
    });
  });

  it("returns zero potential revenue when no included quote has a price", async () => {
    mocks.quoteRequestAggregate.mockResolvedValueOnce({ _sum: { quotedPriceCents: null } });
    const { getOwnerDashboardMetrics } = await import("../dashboard-metrics");

    const metrics = await getOwnerDashboardMetrics("account-1");

    expect(metrics.potentialRevenueCents).toBe(0);
  });
});
