import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db/client";
import { requireOwnerContext } from "@/src/lib/auth/owner-context";
import { proxiedOwnerModelUrl } from "@/src/lib/model3d/proxy";
import Model3dViewer from "../Model3dViewer";

export const dynamic = "force-dynamic";

function toSeconds(durationMs: number | null) {
  return typeof durationMs === "number" ? Number((durationMs / 1000).toFixed(2)) : null;
}

export default async function OwnerModelJobPage({ params }: { params: Promise<{ modelJobId: string }> }) {
  const { modelJobId } = await params;
  const { accountId } = await requireOwnerContext();
  const model = await prisma.model3dGeneration.findFirst({
    where: { id: modelJobId, accountId },
    include: {
      request: {
        select: {
          text: true,
          styleId: true,
          primaryMetal: true,
          secondaryMetal: true,
          emblem: true
        }
      }
    }
  });

  if (!model) notFound();

  return (
    <main className="min-h-dvh bg-[#101114] px-4 py-8 text-[#e1e2ec] md:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/owner" className="text-sm text-[#adc6ff] hover:text-white">Back to dashboard</Link>
            <h1 className="mt-2 text-3xl font-bold">Pendant in 3D</h1>
          </div>
          <span className="rounded-full border border-[#f7bc5f]/30 bg-[#1D120C] px-3 py-1 text-xs font-semibold text-[#f7bc5f]">
            Experimental
          </span>
        </div>

        <Model3dViewer
          initialJob={{
            id: model.id,
            sourceImageUrl: model.sourceImageUrl,
            modelUrl: proxiedOwnerModelUrl(model.id, Boolean(model.modelUrl)),
            format: model.format,
            status: model.status,
            error: model.error,
            durationSeconds: toSeconds(model.durationMs),
            done: model.status === "succeeded" || model.status === "failed",
            request: model.request
          }}
        />
      </div>
    </main>
  );
}
