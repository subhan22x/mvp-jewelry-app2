import fs from "node:fs/promises";
import path from "node:path";
import mime from "mime";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { isR2Configured, uploadToR2 } from "../storage/r2";
import type { VvsGenerateImageInput, VvsGenerateImageResult } from "./types";

const OUTPUT_DIR = process.env.GENERATED_IMAGE_DIR ?? path.join(process.cwd(), "public", "generated");
const TIMEOUT_MS = Number(process.env.VVS_GENERATION_TIMEOUT_MS ?? 120_000);

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let t: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    t = setTimeout(() => reject(new Error(`VVS generation timed out after ${ms / 1000}s`)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(t!);
  }
}

async function saveBuffer(buffer: Buffer, mimeType: string, generationId: string): Promise<string> {
  const ext = mime.getExtension(mimeType) ?? "jpg";
  const fileName = `vvs-${generationId}.${ext}`;

  if (isR2Configured()) {
    return uploadToR2({ key: `vvs-studio/${fileName}`, body: buffer, contentType: mimeType });
  }

  const dir = path.join(OUTPUT_DIR, "vvs-studio");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, fileName), buffer);
  return `/generated/vvs-studio/${fileName}`;
}

async function generateWithGemini(input: VvsGenerateImageInput): Promise<{ buffer: Buffer; mimeType: string }> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const client = new GoogleGenAI({ apiKey });

  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
    { text: input.prompt },
  ];

  for (const attachment of input.attachments) {
    parts.push({ inlineData: { data: attachment.buffer.toString("base64"), mimeType: attachment.mimeType } });
  }

  const response = await client.models.generateContent({
    model: input.modelId,
    contents: [{ role: "user", parts }],
    config: { responseModalities: ["IMAGE"] },
  });

  const inlineParts = (response.candidates ?? [])
    .flatMap(c => c.content?.parts ?? [])
    .filter((p): p is { inlineData: { data: string; mimeType?: string } } => Boolean(p.inlineData?.data));

  if (!inlineParts.length) throw new Error("Gemini did not return image data");

  return {
    buffer: Buffer.from(inlineParts[0].inlineData.data, "base64"),
    mimeType: inlineParts[0].inlineData.mimeType ?? "image/png",
  };
}

async function generateWithOpenAI(input: VvsGenerateImageInput): Promise<{ buffer: Buffer; mimeType: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const client = new OpenAI({ apiKey });

  // Use images.edit when reference attachments exist, images.generate otherwise
  if (input.attachments.length > 0) {
    const imageFiles = await Promise.all(
      input.attachments.map(async (attachment) =>
        new File([attachment.buffer], attachment.fileName, {
          type: attachment.mimeType as "image/jpeg" | "image/png" | "image/webp",
        })
      )
    );

    const response = await client.images.edit({
      model: input.modelId as "gpt-image-1",
      image: imageFiles[0],
      prompt: input.prompt,
      response_format: "b64_json",
    });

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) throw new Error("OpenAI images.edit did not return image data");
    return { buffer: Buffer.from(b64, "base64"), mimeType: "image/png" };
  }

  const response = await client.images.generate({
    model: input.modelId as "gpt-image-1",
    prompt: input.prompt,
    response_format: "b64_json",
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI images.generate did not return image data");
  return { buffer: Buffer.from(b64, "base64"), mimeType: "image/png" };
}

export async function generateVvsImage(input: VvsGenerateImageInput): Promise<VvsGenerateImageResult> {
  const generate = input.provider === "openai" ? generateWithOpenAI : generateWithGemini;
  const { buffer, mimeType } = await withTimeout(generate(input), TIMEOUT_MS);
  const imageUrl = await saveBuffer(buffer, mimeType, input.generationId);
  return { imageUrl, modelId: input.modelId };
}
