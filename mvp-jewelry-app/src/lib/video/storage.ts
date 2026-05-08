import fs from "node:fs/promises";
import path from "node:path";

const GENERATED_DIR = process.env.GENERATED_IMAGE_DIR ?? path.join(process.cwd(), "public", "generated");

function extensionFromContentType(contentType: string | null) {
  if (!contentType) return null;
  if (contentType.includes("mp4")) return ".mp4";
  if (contentType.includes("quicktime")) return ".mov";
  if (contentType.includes("webm")) return ".webm";
  return null;
}

function extensionFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    const ext = path.extname(parsed.pathname).toLowerCase();
    if ([".mp4", ".mov", ".webm"].includes(ext)) return ext;
  } catch {
    return null;
  }
  return null;
}

export async function saveRemoteVideoLocally(remoteVideoUrl: string, videoId: string) {
  const response = await fetch(remoteVideoUrl);
  if (!response.ok) {
    throw new Error(`Unable to download generated video. HTTP ${response.status}.`);
  }

  const contentType = response.headers.get("content-type");
  const ext = extensionFromContentType(contentType) ?? extensionFromUrl(remoteVideoUrl) ?? ".mp4";
  const fileName = `${videoId}${ext}`;
  const filePath = path.join(GENERATED_DIR, fileName);
  const buffer = Buffer.from(await response.arrayBuffer());

  await fs.mkdir(GENERATED_DIR, { recursive: true });
  await fs.writeFile(filePath, buffer);

  return `/generated/${fileName}`;
}

export function localGeneratedHref(fileUrl: string | null | undefined) {
  if (!fileUrl) return null;
  return fileUrl.startsWith("/generated/") ? fileUrl : null;
}
