import fs from "node:fs/promises";
import path from "node:path";
import { assertDurableMediaStorageConfigured, isR2Configured, uploadToR2 } from "@/src/lib/storage/r2";

const GENERATED_DIR = process.env.GENERATED_IMAGE_DIR ?? path.join(process.cwd(), "public", "generated");

const CONTENT_TYPES: Record<string, string> = {
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".usdz": "model/vnd.usdz+zip",
  ".obj": "model/obj",
  ".fbx": "application/octet-stream",
  ".stl": "model/stl"
};

function extensionFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    const ext = path.extname(parsed.pathname).toLowerCase();
    if (ext in CONTENT_TYPES) return ext;
  } catch {
    return null;
  }
  return null;
}

export async function saveRemoteModelLocally(remoteModelUrl: string, modelId: string, fallbackExt = ".glb") {
  const response = await fetch(remoteModelUrl);
  if (!response.ok) {
    throw new Error(`Unable to download generated 3D model. HTTP ${response.status}.`);
  }

  const ext = extensionFromUrl(remoteModelUrl) ?? fallbackExt;
  const contentType = response.headers.get("content-type") ?? CONTENT_TYPES[ext] ?? "application/octet-stream";
  const fileName = `${modelId}${ext}`;
  const buffer = Buffer.from(await response.arrayBuffer());

  if (isR2Configured()) {
    return uploadToR2({
      key: `generated/${fileName}`,
      body: buffer,
      contentType: CONTENT_TYPES[ext] ?? contentType
    });
  }

  assertDurableMediaStorageConfigured();
  const filePath = path.join(GENERATED_DIR, fileName);
  await fs.mkdir(GENERATED_DIR, { recursive: true });
  await fs.writeFile(filePath, buffer);

  return `/generated/${fileName}`;
}
