import { describe, expect, it } from "vitest";
import {
  deriveElapsedMs,
  distinctProviders,
  distinctStages,
  filterVvsGenerations,
  formatDuration,
  formatProviderPayloadJson,
  isDisplayableImageUrl,
  normalizeFilter,
  redactSecrets,
  resolveDisplayablePreviewUrl,
  summarizeVvsStatuses,
  type VvsMonitorFilterRow
} from "../filters";

function row(overrides: Partial<VvsMonitorFilterRow> = {}): VvsMonitorFilterRow {
  return {
    id: "gen-1",
    status: "pending",
    stage: "studio_post",
    provider: "openai",
    modelId: "gpt-image-1",
    prompt: "A luxury pendant on velvet",
    shootId: "shoot-1",
    jobId: null,
    styleKey: "dark",
    sourceImageGenerationId: null,
    shoot: {
      engravingText: "LUXE",
      pieceType: "pendant",
      visualStyle: "dark",
      caption: "iced out"
    },
    ...overrides
  };
}

describe("normalizeFilter", () => {
  it("trims and lowercases", () => {
    expect(normalizeFilter("  OpenAI ")).toBe("openai");
  });

  it("returns empty string for undefined", () => {
    expect(normalizeFilter(undefined)).toBe("");
  });
});

describe("filterVvsGenerations", () => {
  const rows = [
    row({ id: "a", status: "succeeded", stage: "studio_post", provider: "openai", modelId: "gpt-image-1", shootId: "s1", prompt: "velvet" }),
    row({ id: "b", status: "failed", stage: "style_composite", provider: "gemini", modelId: "gemini-3", shootId: "s2", prompt: "marble" }),
    row({ id: "c", status: "pending", stage: "studio_post", provider: "openai", modelId: "gpt-image-1", shootId: "s3", prompt: "ice" })
  ];

  it("returns all rows when filters are empty", () => {
    expect(filterVvsGenerations(rows, {})).toHaveLength(3);
  });

  it("returns all rows when status is all", () => {
    expect(filterVvsGenerations(rows, { status: "all" })).toHaveLength(3);
  });

  it("filters by status", () => {
    expect(filterVvsGenerations(rows, { status: "succeeded" })).toHaveLength(1);
    expect(filterVvsGenerations(rows, { status: "succeeded" })[0].id).toBe("a");
  });

  it("filters by stage", () => {
    expect(filterVvsGenerations(rows, { stage: "style_composite" })).toHaveLength(1);
    expect(filterVvsGenerations(rows, { stage: "style_composite" })[0].id).toBe("b");
  });

  it("filters by provider", () => {
    expect(filterVvsGenerations(rows, { provider: "gemini" })).toHaveLength(1);
  });

  it("filters by model substring (case-insensitive)", () => {
    expect(filterVvsGenerations(rows, { model: "GEMINI" })).toHaveLength(1);
  });

  it("free-text q matches job id, shoot id, prompt, engraving", () => {
    expect(filterVvsGenerations(rows, { q: "s1" })[0].id).toBe("a");
    expect(filterVvsGenerations(rows, { q: "velvet" })[0].id).toBe("a");
    expect(filterVvsGenerations(rows, { q: "marble" })[0].id).toBe("b");
    expect(filterVvsGenerations(rows, { q: "luxe" })[0].id).toBe("a");
  });

  it("combines multiple filters", () => {
    expect(filterVvsGenerations(rows, { status: "succeeded", provider: "openai" })).toHaveLength(1);
    expect(filterVvsGenerations(rows, { status: "failed", provider: "openai" })).toHaveLength(0);
  });

  it("matches rows whose stage is null against empty stage filter only", () => {
    const withNullStage = [row({ id: "z", stage: null })];
    expect(filterVvsGenerations(withNullStage, { stage: "studio_post" })).toHaveLength(0);
    expect(filterVvsGenerations(withNullStage, { stage: "all" })).toHaveLength(1);
  });
});

describe("summarizeVvsStatuses", () => {
  it("counts each status and total", () => {
    const summary = summarizeVvsStatuses([
      { status: "succeeded" },
      { status: "succeeded" },
      { status: "failed" },
      { status: "pending" },
      { status: "queued" }
    ]);
    expect(summary).toEqual({ succeeded: 2, failed: 1, pending: 2, total: 5 });
  });

  it("returns zeros for empty input", () => {
    expect(summarizeVvsStatuses([])).toEqual({ succeeded: 0, failed: 0, pending: 0, total: 0 });
  });
});

describe("formatProviderPayloadJson", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(formatProviderPayloadJson(null)).toBe("");
    expect(formatProviderPayloadJson(undefined)).toBe("");
    expect(formatProviderPayloadJson("")).toBe("");
  });

  it("pretty-prints valid JSON without secrets", () => {
    expect(formatProviderPayloadJson('{"a":1,"b":2}')).toBe('{\n  "a": 1,\n  "b": 2\n}');
  });

  it("returns raw value when JSON is invalid", () => {
    expect(formatProviderPayloadJson("not-json")).toBe("not-json");
  });

  it("redacts top-level secret keys", () => {
    const out = formatProviderPayloadJson('{"apiKey":"sk-123","model":"gpt-1"}');
    expect(out).toContain('"apiKey": "[REDACTED]"');
    expect(out).toContain('"model": "gpt-1"');
    expect(out).not.toContain("sk-123");
  });

  it("redacts nested object secret keys", () => {
    const input = JSON.stringify({
      headers: { Authorization: "Bearer xyz", "Content-Type": "application/json" },
      body: { text: "hello" }
    });
    const out = formatProviderPayloadJson(input);
    expect(out).toContain('"Authorization": "[REDACTED]"');
    expect(out).not.toContain("Bearer xyz");
    expect(out).toContain('"Content-Type": "application/json"');
    expect(out).toContain('"text": "hello"');
  });

  it("redacts secret keys inside arrays", () => {
    const input = JSON.stringify({
      items: [
        { token: "abc", label: "a" },
        { token: "def", label: "b" }
      ]
    });
    const out = formatProviderPayloadJson(input);
    const parsed = JSON.parse(out);
    expect(parsed.items[0].token).toBe("[REDACTED]");
    expect(parsed.items[1].token).toBe("[REDACTED]");
    expect(parsed.items[0].label).toBe("a");
    expect(parsed.items[1].label).toBe("b");
  });

  it("matches secret key names case-insensitively and by substring", () => {
    const input = JSON.stringify({
      "X-API-KEY": "k1",
      MyAuthorizationToken: "k2",
      PASSWORD: "k3",
      "x-secret-value": "k4"
    });
    const out = formatProviderPayloadJson(input);
    expect(out).not.toContain("k1");
    expect(out).not.toContain("k2");
    expect(out).not.toContain("k3");
    expect(out).not.toContain("k4");
    const parsed = JSON.parse(out);
    expect(parsed["X-API-KEY"]).toBe("[REDACTED]");
    expect(parsed.MyAuthorizationToken).toBe("[REDACTED]");
    expect(parsed.PASSWORD).toBe("[REDACTED]");
    expect(parsed["x-secret-value"]).toBe("[REDACTED]");
  });

  it("preserves array and object structure after redaction", () => {
    const input = JSON.stringify({
      nested: { deep: { secret: "s", keep: 1 } },
      list: [1, { token: "t" }, "x"]
    });
    const parsed = JSON.parse(formatProviderPayloadJson(input) as string);
    expect(Array.isArray(parsed.list)).toBe(true);
    expect(parsed.list[0]).toBe(1);
    expect(parsed.list[1].token).toBe("[REDACTED]");
    expect(parsed.list[2]).toBe("x");
    expect(typeof parsed.nested).toBe("object");
    expect(parsed.nested.deep.keep).toBe(1);
    expect(parsed.nested.deep.secret).toBe("[REDACTED]");
  });
});

describe("redactSecrets", () => {
  it("redacts direct secret keys", () => {
    expect(redactSecrets({ apiKey: "x", ok: 1 })).toEqual({ apiKey: "[REDACTED]", ok: 1 });
  });

  it("redacts recursively in nested objects", () => {
    expect(redactSecrets({ a: { b: { password: "p", c: 2 } } }))
      .toEqual({ a: { b: { password: "[REDACTED]", c: 2 } } });
  });

  it("redacts inside arrays", () => {
    expect(redactSecrets([{ token: "t" }, { ok: 1 }]))
      .toEqual([{ token: "[REDACTED]" }, { ok: 1 }]);
  });

  it("leaves primitives untouched", () => {
    expect(redactSecrets("hello")).toBe("hello");
    expect(redactSecrets(42)).toBe(42);
    expect(redactSecrets(null)).toBe(null);
    expect(redactSecrets(true)).toBe(true);
  });

  it("does not redact non-secret keys containing similar substrings", () => {
    expect(redactSecrets({ modelId: "gpt", provider: "openai" }))
      .toEqual({ modelId: "gpt", provider: "openai" });
  });
});

describe("isDisplayableImageUrl", () => {
  it("accepts http and https URLs", () => {
    expect(isDisplayableImageUrl("http://example.com/img.png")).toBe(true);
    expect(isDisplayableImageUrl("https://example.com/img.png")).toBe(true);
  });

  it("accepts root-relative paths with a single leading slash", () => {
    expect(isDisplayableImageUrl("/generated/img.png")).toBe(true);
    expect(isDisplayableImageUrl("/pendants/style.png")).toBe(true);
  });

  it("rejects protocol-relative URLs", () => {
    expect(isDisplayableImageUrl("//evil.com/img.png")).toBe(false);
  });

  it("rejects backslash tricks after a leading slash", () => {
    expect(isDisplayableImageUrl("/\\evil.com/img.png")).toBe(false);
  });

  it("rejects a bare slash", () => {
    expect(isDisplayableImageUrl("/")).toBe(false);
  });

  it("rejects unsafe schemes", () => {
    expect(isDisplayableImageUrl("javascript:alert(1)")).toBe(false);
    expect(isDisplayableImageUrl("data:image/png;base64,abc")).toBe(false);
    expect(isDisplayableImageUrl("ftp://example.com/img.png")).toBe(false);
    expect(isDisplayableImageUrl("file:///etc/passwd")).toBe(false);
  });

  it("rejects relative paths without a leading slash", () => {
    expect(isDisplayableImageUrl("generated/img.png")).toBe(false);
    expect(isDisplayableImageUrl("img.png")).toBe(false);
  });

  it("rejects null, undefined, and empty strings", () => {
    expect(isDisplayableImageUrl(null)).toBe(false);
    expect(isDisplayableImageUrl(undefined)).toBe(false);
    expect(isDisplayableImageUrl("")).toBe(false);
    expect(isDisplayableImageUrl("   ")).toBe(false);
  });
});

describe("deriveElapsedMs", () => {
  it("returns null when startedAt is null", () => {
    expect(deriveElapsedMs(null, new Date(10000))).toBeNull();
  });

  it("returns positive elapsed milliseconds", () => {
    expect(deriveElapsedMs(new Date(1000), new Date(4000))).toBe(3000);
  });

  it("clamps negative values to zero", () => {
    expect(deriveElapsedMs(new Date(5000), new Date(1000))).toBe(0);
  });
});

describe("formatDuration", () => {
  it("returns n/a for non-numbers", () => {
    expect(formatDuration(null)).toBe("n/a");
    expect(formatDuration(undefined)).toBe("n/a");
  });

  it("renders milliseconds under one second", () => {
    expect(formatDuration(500)).toBe("500ms");
  });

  it("renders seconds with two decimals", () => {
    expect(formatDuration(2500)).toBe("2.50s");
  });
});

describe("distinctStages and distinctProviders", () => {
  it("collects unique sorted stages ignoring null", () => {
    expect(distinctStages([
      { stage: "studio_post" },
      { stage: null },
      { stage: "style_composite" },
      { stage: "studio_post" }
    ])).toEqual(["studio_post", "style_composite"]);
  });

  it("collects unique sorted providers", () => {
    expect(distinctProviders([
      { provider: "openai" },
      { provider: "gemini" },
      { provider: "openai" }
    ])).toEqual(["gemini", "openai"]);
  });
});

describe("resolveDisplayablePreviewUrl", () => {
  it("returns a directly displayable stored URL as-is", () => {
    expect(resolveDisplayablePreviewUrl("/generated/img.png", new Map())).toBe("/generated/img.png");
    expect(resolveDisplayablePreviewUrl("https://example.com/img.png", new Map())).toBe("https://example.com/img.png");
  });

  it("resolves an r2:// stored URL using the resolution map", () => {
    const map = new Map([["r2://key.jpg", "https://signed.example.com/key.jpg"]]);
    expect(resolveDisplayablePreviewUrl("r2://key.jpg", map)).toBe("https://signed.example.com/key.jpg");
  });

  it("returns null when an r2:// stored URL has no resolution", () => {
    expect(resolveDisplayablePreviewUrl("r2://missing.jpg", new Map())).toBeNull();
  });

  it("returns null for null/undefined/empty stored URLs", () => {
    expect(resolveDisplayablePreviewUrl(null, new Map())).toBeNull();
    expect(resolveDisplayablePreviewUrl(undefined, new Map())).toBeNull();
    expect(resolveDisplayablePreviewUrl("", new Map())).toBeNull();
  });

  it("prefers a directly displayable URL over any map entry for the same value", () => {
    const map = new Map([["/generated/img.png", "https://should-not-win.com"]]);
    expect(resolveDisplayablePreviewUrl("/generated/img.png", map)).toBe("/generated/img.png");
  });
});
