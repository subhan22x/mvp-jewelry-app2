import type { GenerationLabCase, GenerationLabResultReview, Result } from "@prisma/client";
import { type LabCaseConfig } from "./types";

type ExportRow = {
  case: GenerationLabCase;
  config: LabCaseConfig | null;
  result: Pick<Result, "id" | "variant" | "status" | "imageUrl" | "prompt" | "modelId" | "error" | "durationMs" | "attachmentPathsJson">;
  review: Pick<GenerationLabResultReview, "status" | "failureTagsJson" | "notes"> | null;
};

function csvEscape(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildRunCsv(rows: ExportRow[], runLabel: string): string {
  const header = [
    "run_label",
    "case_id",
    "case_family",
    "case_status",
    "case_error",
    "case_style_id",
    "case_text",
    "case_pendant_finish",
    "case_two_tone",
    "case_primary_metal",
    "case_secondary_metal",
    "case_emblem",
    "case_diamond_quality",
    "case_prompt_mode",
    "case_source_style_path",
    "case_source_template_path",
    "case_rendered_config_json",
    "case_config_json",
    "result_id",
    "result_variant",
    "result_status",
    "result_image_url",
    "result_model_id",
    "result_error",
    "result_duration_ms",
    "result_prompt",
    "result_attachment_paths_json",
    "review_status",
    "review_failure_tags",
    "review_notes"
  ];

  const lines = [header.join(",")];

  for (const row of rows) {
    const cfg = row.config;
    const renderedConfig = row.case.renderedConfigJson ?? "";
    const sourceStylePath = row.case.sourceStylePath ?? "";
    const sourceTemplatePath = row.case.sourceTemplatePath ?? "";

    const commonCase = [
      csvEscape(runLabel),
      csvEscape(row.case.id),
      csvEscape(row.case.family),
      csvEscape(row.case.status),
      csvEscape(row.case.error),
      csvEscape(cfg?.family === "name" ? cfg.styleId : cfg?.family === "bracelet" ? cfg.styleId : ""),
      csvEscape(cfg?.family === "name" ? cfg.text : cfg?.family === "bracelet" ? cfg.text : ""),
      csvEscape(cfg?.family === "name" ? cfg.pendantFinish : ""),
      csvEscape(cfg?.family === "name" ? String(cfg.twoTone ?? "") : ""),
      csvEscape(cfg?.family === "name" ? cfg.primaryMetal ?? "" : cfg?.family === "bracelet" ? cfg.colorCombo : ""),
      csvEscape(cfg?.family === "name" ? cfg.secondaryMetal ?? "" : ""),
      csvEscape(cfg?.family === "name" ? cfg.emblem ?? "" : ""),
      csvEscape(cfg?.family === "name" || cfg?.family === "bracelet" ? cfg.diamondQuality ?? "" : ""),
      csvEscape(cfg?.family === "name" ? cfg.promptMode ?? "" : ""),
      csvEscape(sourceStylePath),
      csvEscape(sourceTemplatePath),
      csvEscape(renderedConfig),
      csvEscape(row.case.configJson)
    ];

    const resultFields = [
      csvEscape(row.result.id),
      csvEscape(String(row.result.variant)),
      csvEscape(row.result.status),
      csvEscape(row.result.imageUrl),
      csvEscape(row.result.modelId),
      csvEscape(row.result.error),
      csvEscape(row.result.durationMs === null ? "" : String(row.result.durationMs)),
      csvEscape(row.result.prompt),
      csvEscape(row.result.attachmentPathsJson)
    ];

    const reviewFields = [
      csvEscape(row.review?.status ?? ""),
      csvEscape(row.review?.failureTagsJson ?? ""),
      csvEscape(row.review?.notes ?? "")
    ];

    lines.push([...commonCase, ...resultFields, ...reviewFields].join(","));
  }

  return lines.join("\n");
}

export function parseFailureTags(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === "string") : [];
  } catch {
    return [];
  }
}
