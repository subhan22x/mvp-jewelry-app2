import { prisma } from "@/server/db/client";
import { getMonthlyUsageSummary } from "@/src/lib/usage";

export async function getOwnerDashboardMetrics(accountId: string) {
  const [sentQuotes, pendingQuotes, designUsage, potentialRevenue] = await Promise.all([
    prisma.quoteRequest.count({ where: { accountId, status: "sent" } }),
    prisma.quoteRequest.count({ where: { accountId, status: "pending" } }),
    getMonthlyUsageSummary(accountId, "design_image_generated"),
    prisma.quoteRequest.aggregate({
      where: {
        accountId,
        status: { in: ["sent", "fulfilled"] },
        quotedPriceCents: { not: null }
      },
      _sum: { quotedPriceCents: true }
    })
  ]);

  return {
    sentQuotes,
    pendingQuotes,
    designUsage: { used: designUsage.used, included: designUsage.included },
    potentialRevenueCents: potentialRevenue._sum.quotedPriceCents ?? 0
  };
}
