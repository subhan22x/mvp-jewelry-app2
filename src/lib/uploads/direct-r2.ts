"use client";

export type DirectUploadReference = {
  key: string;
  contentType: string;
  size: number;
  originalName: string;
};

type PresignResponse = DirectUploadReference & {
  uploadUrl: string;
};

export async function uploadFileDirectly(file: File, purpose: string): Promise<DirectUploadReference | null> {
  if (process.env.NODE_ENV === "test") return null;

  const response = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      purpose,
      fileName: file.name,
      contentType: file.type,
      size: file.size
    })
  });

  if (response.status === 503) return null;

  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error ?? "Unable to prepare file upload.");

  const upload = json as PresignResponse;
  const putResponse = await fetch(upload.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": upload.contentType,
      "Cache-Control": "public, max-age=31536000, immutable"
    },
    body: file
  });
  if (!putResponse.ok) throw new Error("Unable to upload file to media storage.");

  return {
    key: upload.key,
    contentType: upload.contentType,
    size: upload.size,
    originalName: upload.originalName
  };
}
