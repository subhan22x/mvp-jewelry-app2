import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { assertPublicImageUrl, toPublicImageUrl } from "@/src/lib/video/public-url";
import { saveRemoteModelLocally } from "@/src/lib/model3d/storage";
import { buildModel3dPrompt, generateRodinModel } from "@/src/lib/model3d/rodin";
import { scheduleBackgroundTask } from "@/src/lib/platform/background";
import { consumeUsageCredit, ensureUsageAvailable, usageErrorResponse } from "@/src/lib/usage";

export const maxDuration = 300;

const MODEL_FORMAT = "glb";
const RODIN_MODEL_ID = "hyper3d/rodin-v2.5/image-to-3d";

const Body = z.object({
  resultId: z.string().min(1)
});

function getGenerationErrorMessage(err: unknown) {
  return err instanceof Error && err.message ? err.message : "3D generation failed.";
}

export async function POST(req: Request) {
  const owner = await getOwnerContext();
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = Body.parse(await req.json());
    const accountId = owner.accountId;
    const result = await prisma.result.findUnique({
      where: { id: body.resultId },
      include: { request: true }
    });

    if (!result) return NextResponse.json({ error: "Generation result not found." }, { status: 404 });
    if (result.accountId !== accountId) return NextResponse.json({ error: "Generation result not found." }, { status: 404 });
    if (result.status !== "succeeded" || !result.imageUrl) {
      return NextResponse.json({ error: "This generation image is not ready for 3D generation." }, { status: 400 });
    }
    if ((result.request.productType ?? "name") !== "name") {
      return NextResponse.json({ error: "3D generation is available for name pendant generations only." }, { status: 400 });
    }

    const reusableModel = await prisma.model3dGeneration.findFirst({
      where: {
        accountId,
        sourceResultId: result.id,
        OR: [
          { status: "pending" },
          { status: "succeeded", modelUrl: { not: null } }
        ]
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true }
    });
    if (reusableModel) {
      return NextResponse.json(
        { modelJobId: reusableModel.id, status: reusableModel.status, reused: true },
        { status: 200 }
      );
    }

    await ensureUsageAvailable(accountId, "design_3d_generated");

    const sourceImageUrl = toPublicImageUrl(req, result.imageUrl);
    assertPublicImageUrl(sourceImageUrl);
    const prompt = buildModel3dPrompt();
    const startedAt = new Date();
    const model = await prisma.model3dGeneration.create({
      data: {
        accountId: result.accountId,
        requestId: result.requestId,
        sourceResultId: result.id,
        sourceImageUrl,
        prompt,
        format: MODEL_FORMAT,
        modelId: RODIN_MODEL_ID,
        status: "pending",
        startedAt
      }
    });

    scheduleBackgroundTask((async () => {
      const startedMs = startedAt.getTime();
      try {
        const generated = await generateRodinModel({ imageUrl: sourceImageUrl, prompt, format: MODEL_FORMAT });
        const localModelUrl = await saveRemoteModelLocally(generated.modelUrl, model.id, `.${MODEL_FORMAT}`);
        const completedAt = new Date();
        const updated = await prisma.model3dGeneration.update({
          where: { id: model.id },
          data: {
            modelUrl: localModelUrl,
            remoteModelUrl: generated.modelUrl,
            modelId: generated.modelId,
            providerJobId: generated.providerJobId,
            status: "succeeded",
            error: null,
            completedAt,
            durationMs: Math.max(0, completedAt.getTime() - startedMs)
          }
        });
        await consumeUsageCredit({
          accountId,
          kind: "design_3d_generated",
          sourceType: "Model3dGeneration",
          sourceId: updated.id,
          metadata: { requestId: result.requestId }
        });
      } catch (err) {
        console.error(`[owner model3d ${model.id}] generation failed:`, err);
        const completedAt = new Date();
        await prisma.model3dGeneration.update({
          where: { id: model.id },
          data: {
            status: "failed",
            error: getGenerationErrorMessage(err),
            completedAt,
            durationMs: Math.max(0, completedAt.getTime() - startedMs)
          }
        });
      }
    })(), `owner-model3d:${model.id}`);

    return NextResponse.json({ modelJobId: model.id }, { status: 201 });
  } catch (err) {
    const usage = usageErrorResponse(err);
    if (usage) return NextResponse.json(usage, { status: 402 });
    const message = getGenerationErrorMessage(err);
    const status = message.includes("configured") || message.includes("APP_BASE_URL") ? 500 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
