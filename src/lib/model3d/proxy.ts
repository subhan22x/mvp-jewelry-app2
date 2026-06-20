export const MODEL3D_CONTENT_TYPE = "model/gltf-binary";

export function proxiedOwnerModelUrl(modelId: string, hasModel: boolean) {
  return hasModel ? `/api/owner/model-jobs/${modelId}/file` : null;
}

export function proxiedPublicQuoteModelUrl(token: string, hasModel: boolean) {
  return hasModel ? `/api/quote-models/${encodeURIComponent(token)}/file` : null;
}

export async function fetchModelResponse(modelUrl: string, req: Request) {
  const sourceUrl = /^https?:\/\//i.test(modelUrl)
    ? modelUrl
    : new URL(modelUrl, req.url).toString();
  const upstream = await fetch(sourceUrl, { cache: "no-store" });

  if (!upstream.ok || !upstream.body) {
    return new Response("Model file unavailable.", { status: upstream.status || 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? MODEL3D_CONTENT_TYPE,
      "Cache-Control": "private, max-age=300",
      "Access-Control-Allow-Origin": new URL(req.url).origin
    }
  });
}
