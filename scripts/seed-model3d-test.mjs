// Dev helper: seed a "succeeded" Model3dGeneration for the JASON pendant using a
// local .glb file, so the 3D viewer can be tested without calling the Rodin API.
import { PrismaClient } from "@prisma/client";
import { loadEnvLocal } from "./env-local.mjs";
import fs from "node:fs";
import path from "node:path";

Object.assign(process.env, loadEnvLocal());
const prisma = new PrismaClient();

const SRC_GLB = process.argv[2] ?? "/home/rox/Downloads/1.glb";
const TEXT = process.argv[3] ?? "JASON";
const GENERATED_DIR = process.env.GENERATED_IMAGE_DIR ?? path.join(process.cwd(), "public", "generated");

try {
  if (!fs.existsSync(SRC_GLB)) {
    console.error(`GLB not found: ${SRC_GLB}`);
    process.exit(1);
  }

  const result = await prisma.result.findFirst({
    where: {
      status: "succeeded",
      imageUrl: { not: null },
      request: { text: { equals: TEXT, mode: "insensitive" }, productType: "name" }
    },
    orderBy: { createdAt: "desc" },
    include: { request: { select: { text: true } } }
  });

  if (!result) {
    console.error(`No succeeded "${TEXT}" name-pendant result found.`);
    process.exit(1);
  }

  console.log("Target result:", {
    id: result.id,
    variant: result.variant,
    text: result.request.text,
    accountId: result.accountId,
    imageUrl: result.imageUrl,
    createdAt: result.createdAt
  });

  let model = await prisma.model3dGeneration.findFirst({
    where: { sourceResultId: result.id, modelId: "manual-seed" }
  });

  if (!model) {
    model = await prisma.model3dGeneration.create({
      data: {
        accountId: result.accountId,
        requestId: result.requestId,
        sourceResultId: result.id,
        sourceImageUrl: result.imageUrl,
        prompt: "manual test seed",
        format: "glb",
        modelId: "manual-seed",
        status: "succeeded",
        startedAt: new Date(),
        completedAt: new Date(),
        durationMs: 0
      }
    });
  }

  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  const destFile = path.join(GENERATED_DIR, `${model.id}.glb`);
  fs.copyFileSync(SRC_GLB, destFile);
  const modelUrl = `/generated/${model.id}.glb`;

  await prisma.model3dGeneration.update({
    where: { id: model.id },
    data: { modelUrl, status: "succeeded", error: null, completedAt: new Date() }
  });

  console.log("\n✅ Seeded Model3dGeneration:", model.id);
  console.log("   GLB copied to:", destFile);
  console.log("   Open the viewer at:  /owner/models/" + model.id);
} finally {
  await prisma.$disconnect();
}
