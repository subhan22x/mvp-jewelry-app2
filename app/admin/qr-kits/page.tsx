import { prisma } from "@/server/db/client";
import QrKitDashboard from "./QrKitDashboard";

export const dynamic = "force-dynamic";

export default async function QrKitsPage() {
  const [kits, counts] = await Promise.all([
    prisma.qrKit.findMany({
      select: {
        id: true,
        displayCode: true,
        status: true,
        publicToken: true,
        assignedAt: true,
        deployedAt: true,
        createdAt: true,
        batch: { select: { code: true, label: true, printTemplateVersion: true } },
        account: { select: { id: true, name: true, slug: true } }
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50
    }),
    prisma.qrKit.groupBy({ by: ["status"], _count: { _all: true } })
  ]);

  return (
    <QrKitDashboard
      initialKits={kits.map(kit => ({
        ...kit,
        assignedAt: kit.assignedAt?.toISOString() ?? null,
        deployedAt: kit.deployedAt?.toISOString() ?? null,
        createdAt: kit.createdAt.toISOString()
      }))}
      counts={Object.fromEntries(counts.map(entry => [entry.status, entry._count._all]))}
    />
  );
}
