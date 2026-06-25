import { z } from "zod";
import type { Emblem, Metal, PendantFinish, PlainChain, PlainColor, PlainKarat, PlainMetal } from "../styles/_types";
import { GEMINI_IMAGE_MODELS } from "./models";

export const LAB_FAMILIES = ["name", "bracelet", "picture", "logo"] as const;
export type LabFamily = (typeof LAB_FAMILIES)[number];

export const FAILURE_TAGS = [
  "bad_text",
  "bad_shape",
  "bad_composition",
  "bad_lighting",
  "wrong_background",
  "wrong_style",
  "bad_emblem",
  "bad_metal",
  "cropped",
  "provider_error"
] as const;
export type FailureTag = (typeof FAILURE_TAGS)[number];

export const REVIEW_STATUSES = ["unreviewed", "pass", "fail"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const CASE_STATUSES = ["pending", "running", "succeeded", "partial", "failed", "skipped"] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const RUN_STATUSES = ["draft", "running", "completed", "failed"] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export const MAX_GENERATION_CALLS_PER_RUN = 10;
export const LAB_IMAGE_MODELS = GEMINI_IMAGE_MODELS;
const ImageModelId = z.enum([
  "gemini-2.5-flash-image",
  "gemini-3.1-flash-image",
  "gemini-3-pro-image-preview"
]);
const ModelSelection = z.object({
  variant1: ImageModelId.optional(),
  variant2: ImageModelId.optional()
}).optional();

// ── Name pendant case config ──────────────────────────────────────
const NameConfig = z.object({
  family: z.literal("name"),
  styleId: z.string().min(1),
  text: z.string().min(1),
  pendantFinish: z.enum(["icedout", "plain"]).default("icedout"),
  twoTone: z.boolean().optional(),
  primaryMetal: z.enum(["rose_gold", "white_gold", "yellow_gold"]).optional(),
  secondaryMetal: z.enum(["rose_gold", "white_gold", "yellow_gold"]).nullish(),
  emblem: z.enum(["none", "crown", "heart", "spade", "butterfly", "moneybag"]).optional(),
  plainColor: z.enum(["gold", "silver", "rose_gold"]).optional(),
  plainMetal: z.enum(["gold_plated", "silver", "gold"]).optional(),
  plainKarat: z.enum(["10k", "14k", "18k"]).nullish(),
  plainChain: z.enum(["rope", "box", "snake", "cable", "station", "bar_link_tube_station", "figaro_oval_link"]).optional(),
  diamondQuality: z.enum(["vs", "vvs"]).optional(),
  promptMode: z.enum(["json", "natural_language"]).optional(),
  modelSelection: ModelSelection
});

// ── Bracelet case config ──────────────────────────────────────────
const BraceletConfig = z.object({
  family: z.literal("bracelet"),
  productLine: z.enum(["icedout", "womens"]).default("icedout"),
  text: z.string().min(1),
  styleId: z.enum(["style_1", "style_2", "style_3", "style_4", "womens_1", "womens_2"]),
  colorCombo: z.enum(["rose_gold", "yellow_gold", "white"]),
  stoneType: z.enum(["natural_diamonds", "lab_diamonds", "moissanite", "cz"]).optional(),
  diamondQuality: z.enum(["vs", "vvs"]).optional(),
  metalType: z.enum(["gold", "silver"]).default("gold"),
  modelSelection: ModelSelection
});

// ── Picture / Logo placeholders (not wired for v1) ────────────────
const PictureConfig = z.object({
  family: z.literal("picture"),
  styleId: z.string().min(1),
  primaryMetal: z.enum(["rose_gold", "white_gold", "yellow_gold"]),
  imageUploadKey: z.string().optional()
});

const LogoConfig = z.object({
  family: z.literal("logo"),
  shape: z.enum(["custom", "circle", "shield", "hexa", "diamond"]),
  colorCombo: z.enum(["YELLOW_WHITE", "ROSE_WHITE", "WHITE"])
});

export const CaseConfig = z.discriminatedUnion("family", [
  NameConfig,
  BraceletConfig,
  PictureConfig,
  LogoConfig
]);

export type NameCaseConfig = z.infer<typeof NameConfig>;
export type BraceletCaseConfig = z.infer<typeof BraceletConfig>;
export type PictureCaseConfig = z.infer<typeof PictureConfig>;
export type LogoCaseConfig = z.infer<typeof LogoConfig>;
export type LabCaseConfig = z.infer<typeof CaseConfig>;

// ── Run creation payload ──────────────────────────────────────────
export const CreateRunBody = z.object({
  label: z.string().min(1).max(120),
  notes: z.string().max(2000).optional(),
  cases: z.array(CaseConfig).min(1)
}).superRefine((body, ctx) => {
  const total = body.cases.reduce((sum, cfg) => sum + expectedGenerationsForFamily(cfg.family), 0);
  if (total > MAX_GENERATION_CALLS_PER_RUN) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["cases"],
      message: `Run would generate ${total} images. Max ${MAX_GENERATION_CALLS_PER_RUN} per run.`
    });
  }
});

export type CreateRunPayload = z.infer<typeof CreateRunBody>;

// ── Review patch payload ──────────────────────────────────────────
export const PatchReviewBody = z.object({
  status: z.enum(REVIEW_STATUSES).optional(),
  failureTags: z.array(z.enum(FAILURE_TAGS)).optional(),
  notes: z.string().max(2000).nullish()
});

// ── Case patch payload (editing a draft case) ─────────────────────
export const PatchCaseBody = z.object({
  config: CaseConfig.optional(),
  sortOrder: z.number().int().optional()
});

// ── Helpers ───────────────────────────────────────────────────────
export function expectedGenerationsForFamily(family: LabFamily): number {
  // name pendants produce 2 variants; bracelet produces 1.
  // picture/logo are not yet wired and contribute 0 to the budget.
  if (family === "name") return 2;
  if (family === "bracelet") return 1;
  return 0;
}

export function familyLabel(family: LabFamily): string {
  switch (family) {
    case "name": return "Name pendant";
    case "bracelet": return "Bracelet";
    case "picture": return "Picture pendant";
    case "logo": return "Logo pendant";
  }
}

export function familyIsWired(family: LabFamily): boolean {
  return family === "name" || family === "bracelet";
}

export function parseCaseConfig(configJson: string): LabCaseConfig {
  return CaseConfig.parse(JSON.parse(configJson));
}

export function parseCaseConfigOrNull(configJson: string): LabCaseConfig | null {
  try {
    return CaseConfig.parse(JSON.parse(configJson));
  } catch {
    return null;
  }
}

export type ResolvedNameInputs = {
  styleId: string;
  text: string;
  pendantFinish: PendantFinish;
  twoTone: boolean;
  primaryMetal: Metal;
  secondaryMetal: Metal | null;
  emblem: Emblem;
  plainColor?: PlainColor;
  plainMetal?: PlainMetal;
  plainKarat?: PlainKarat | null;
  plainChain?: PlainChain;
  diamondQuality?: "vs" | "vvs";
  promptMode?: "json" | "natural_language";
};
