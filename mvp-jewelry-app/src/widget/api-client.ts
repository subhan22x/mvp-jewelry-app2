import type {
  CreateNameRequestPayload,
  CreateLeadPayload,
  CreateQuotePayload,
  RequestStatusResponse
} from "./types";

function endpoint(apiBase: string, path: string): string {
  const base = apiBase.replace(/\/+$/, "");
  return `${base}${path}`;
}

export async function createNameRequest(
  apiBase: string,
  payload: CreateNameRequestPayload
): Promise<{ requestId: string }> {
  const res = await fetch(endpoint(apiBase, "/api/requests"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error((err as any).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getRequest(
  apiBase: string,
  requestId: string
): Promise<RequestStatusResponse> {
  const res = await fetch(endpoint(apiBase, `/api/requests/${requestId}`));
  if (!res.ok) throw new Error(`Request status fetch failed: ${res.status}`);
  return res.json();
}

export async function createPictureRequest(
  apiBase: string,
  formData: FormData
): Promise<{ requestId: string }> {
  const res = await fetch(endpoint(apiBase, "/api/picture-requests"), {
    method: "POST",
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error((err as any).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function createLead(
  apiBase: string,
  payload: CreateLeadPayload
): Promise<{ leadId: string }> {
  const res = await fetch(endpoint(apiBase, "/api/leads"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Lead submission failed" }));
    throw new Error((err as any).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function createQuoteRequest(
  apiBase: string,
  payload: CreateQuotePayload
): Promise<{ quoteRequestId: string }> {
  const res = await fetch(endpoint(apiBase, "/api/quote-requests"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Quote request failed" }));
    throw new Error((err as any).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function assetUrl(apiBase: string, path: string): string {
  if (!path || path.startsWith("http")) return path;
  const base = apiBase.replace(/\/+$/, "");
  return `${base}${path}`;
}
