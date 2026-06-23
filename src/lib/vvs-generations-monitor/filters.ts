export type VvsMonitorFilterRow = {
  id: string;
  status: string;
  stage: string | null;
  provider: string;
  modelId: string | null;
  prompt: string;
  shootId: string;
  jobId?: string | null;
  styleKey: string | null;
  sourceImageGenerationId: string | null;
  shoot: {
    engravingText: string | null;
    pieceType: string | null;
    visualStyle: string | null;
    caption: string | null;
  };
};

export type VvsMonitorFilters = {
  status?: string;
  stage?: string;
  provider?: string;
  model?: string;
  q?: string;
};

export type VvsStatusSummary = {
  succeeded: number;
  failed: number;
  pending: number;
  total: number;
};

export function normalizeFilter(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

const ALL = "all";

export function filterVvsGenerations<T extends VvsMonitorFilterRow>(
  rows: T[],
  filters: VvsMonitorFilters
): T[] {
  const status = normalizeFilter(filters.status);
  const stage = normalizeFilter(filters.stage);
  const provider = normalizeFilter(filters.provider);
  const model = normalizeFilter(filters.model);
  const q = normalizeFilter(filters.q);

  return rows.filter(row => {
    if (status && status !== ALL && row.status.toLowerCase() !== status) return false;
    if (stage && stage !== ALL) {
      const rowStage = (row.stage ?? "").toLowerCase();
      if (rowStage !== stage) return false;
    }
    if (provider && provider !== ALL && row.provider.toLowerCase() !== provider) return false;
    if (model && !(row.modelId ?? "").toLowerCase().includes(model)) return false;
    if (q) {
      const haystack = [
        row.id,
        row.shootId,
        row.jobId ?? "",
        row.prompt,
        row.styleKey ?? "",
        row.modelId ?? "",
        row.sourceImageGenerationId ?? "",
        row.shoot.engravingText ?? "",
        row.shoot.pieceType ?? "",
        row.shoot.visualStyle ?? "",
        row.shoot.caption ?? ""
      ].join("\n").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function summarizeVvsStatuses(rows: { status: string }[]): VvsStatusSummary {
  const summary: VvsStatusSummary = { succeeded: 0, failed: 0, pending: 0, total: rows.length };
  for (const row of rows) {
    if (row.status === "succeeded") summary.succeeded += 1;
    else if (row.status === "failed") summary.failed += 1;
    else summary.pending += 1;
  }
  return summary;
}

const SECRET_KEY_PATTERNS = [
  "authorization",
  "apikey",
  "api_key",
  "token",
  "secret",
  "password",
  "cookie",
  "accesskey",
  "access_key",
  "privatekey",
  "private_key",
  "credential"
];

function isSecretKey(key: string): boolean {
  const lower = key.toLowerCase();
  const normalized = lower.replace(/-/g, "_");
  return SECRET_KEY_PATTERNS.some(
    pattern => lower.includes(pattern) || normalized.includes(pattern)
  );
}

export function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSecrets);
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = isSecretKey(key) ? "[REDACTED]" : redactSecrets(val);
    }
    return result;
  }
  return value;
}

export function formatProviderPayloadJson(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(redactSecrets(parsed), null, 2);
  } catch {
    return value;
  }
}

export function isDisplayableImageUrl(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("//")) return false;
  if (trimmed.startsWith("/")) {
    return trimmed.length > 1 && trimmed[1] !== "\\";
  }
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function resolveDisplayablePreviewUrl(
  storedUrl: string | null | undefined,
  r2Resolution: Map<string, string>
): string | null {
  if (!storedUrl) return null;
  if (isDisplayableImageUrl(storedUrl)) return storedUrl;
  return r2Resolution.get(storedUrl) ?? null;
}

export function deriveElapsedMs(startedAt: Date | null, now: Date): number | null {
  if (!startedAt) return null;
  const ms = now.getTime() - startedAt.getTime();
  return ms > 0 ? ms : 0;
}

export function formatDuration(ms: number | null | undefined): string {
  if (typeof ms !== "number") return "n/a";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function distinctStages(rows: { stage: string | null }[]): string[] {
  const seen = new Set<string>();
  for (const row of rows) {
    if (row.stage) seen.add(row.stage);
  }
  return [...seen].sort();
}

export function distinctProviders(rows: { provider: string }[]): string[] {
  const seen = new Set<string>();
  for (const row of rows) {
    if (row.provider) seen.add(row.provider);
  }
  return [...seen].sort();
}
