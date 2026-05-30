import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import mime from "mime";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { generateImage } from "@/lib/styles/connector";

const Body = z.object({
  sourceResultId: z.string().min(1),
  prompt: z.string().trim().min(1, "Describe the changes you want.").max(800, "Keep revision notes under 800 characters.")
});

const MAX_REVISIONS_PER_REQUEST = 2;

function toSeconds(durationMs: number | null) {
  return typeof durationMs === "number" ? Number((durationMs / 1000).toFixed(2)) : null;
}

function getGenerationErrorMessage(err: unknown): string {
  const fallback = "Revision generation failed.";
  if (!(err instanceof Error)) return fallback;

  const match = err.message.match(/\{.*\}/s);
  if (!match) return err.message || fallback;

  try {
    const parsed = JSON.parse(match[0]);
    const message = parsed?.error?.message ?? parsed?.message;
    return typeof message === "string" && message.trim() ? message : fallback;
  } catch {
    return err.message || fallback;
  }
}

function buildRevisionPrompt({
  sourcePrompt,
  revisionPrompt
}: {
  sourcePrompt: string;
  revisionPrompt: string;
}) {
  return [
    "Revise the attached generated pendant image. Use it as the source image and preserve the pendant identity, product-photo realism, readable jewelry text, diamond detail, metal finish, camera angle, and luxury presentation unless the revision request explicitly changes them.",
    `Revision request: ${revisionPrompt}`,
    "Return one updated pendant product image only. Do not add text overlays, mockup labels, borders, or UI elements.",
    "",
    "Original generation prompt for context:",
    sourcePrompt
  ].join("\n");
}

async function sourceImageAttachment(imageUrl: string, requestUrl: string, revisionId: string) {
  const url = new URL(imageUrl, requestUrl);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to fetch source image for revision. HTTP ${response.status}.`);
  }

  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Source file is not an image (${contentType}).`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const extension = mime.getExtension(contentType) ?? "png";
  const filePath = path.join(os.tmpdir(), `revision-source-${revisionId}.${extension}`);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = Body.parse(await req.json());
    const request = await prisma.request.findUnique({
      where: { id: params.id },
      include: {
        Results: true,
        ResultRevisions: { orderBy: { revisionNumber: "asc" } }
      }
    });

    if (!request) return NextResponse.json({ error: "Request not found." }, { status: 404 });

    const source = request.Results.find(result => result.id === body.sourceResultId);
    if (!source || source.status !== "succeeded" || !source.imageUrl) {
      return NextResponse.json({ error: "The selected draft is not ready for revisions." }, { status: 400 });
    }

    if (request.ResultRevisions.length >= MAX_REVISIONS_PER_REQUEST) {
      return NextResponse.json({ error: "This design already has the maximum of 2 revisions." }, { status: 400 });
    }

    const revisionNumber = request.ResultRevisions.length + 1;
    const startedAt = new Date();
    const revision = await prisma.resultRevision.create({
      data: {
        accountId: request.accountId,
        requestId: request.id,
        sourceResultId: source.id,
        revisionNumber,
        prompt: body.prompt,
        status: "pending"
      }
    });

    void (async () => {
      let attachmentPath: string | null = null;
      try {
        attachmentPath = await sourceImageAttachment(source.imageUrl!, req.url, revision.id);
        const generated = await generateImage({
          prompt: buildRevisionPrompt({
            sourcePrompt: source.prompt,
            revisionPrompt: body.prompt
          }),
          attachments: [attachmentPath],
          requestId: request.id,
          variant: 100 + revisionNumber,
          modelVariant: 1
        });
        const completedAt = new Date();
        await prisma.resultRevision.update({
          where: { id: revision.id },
          data: {
            imageUrl: generated.imageUrl,
            status: "succeeded",
            error: null,
            modelId: generated.modelId,
            provider: "google",
            completedAt,
            durationMs: Math.max(0, completedAt.getTime() - startedAt.getTime())
          }
        });
      } catch (error) {
        const completedAt = new Date();
        await prisma.resultRevision.update({
          where: { id: revision.id },
          data: {
            status: "failed",
            error: getGenerationErrorMessage(error),
            completedAt,
            durationMs: Math.max(0, completedAt.getTime() - startedAt.getTime())
          }
        });
      } finally {
        if (attachmentPath) {
          await fs.unlink(attachmentPath).catch(() => {});
        }
      }
    })();

    return NextResponse.json({
      revisionId: revision.id,
      revisionNumber: revision.revisionNumber,
      status: revision.status,
      durationSeconds: toSeconds(revision.durationMs)
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "bad_request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
