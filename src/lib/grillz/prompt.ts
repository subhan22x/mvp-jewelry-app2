import fs from "node:fs/promises";
import path from "node:path";

type GrillzPromptInput = {
  styleLabel: string;
  teethSummary: string;
  goldColor: string;
  stoneType: string;
  diamondQuality: string;
  inspiration: string;
};

const TEMPLATE_PATH = path.join(process.cwd(), "src/lib/grillz/grillz-product-photo.prompt");

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function buildGrillzPrompt(input: GrillzPromptInput) {
  const template = await fs.readFile(TEMPLATE_PATH, "utf8");
  const values: Record<string, string> = {
    STYLE_LABEL: input.styleLabel,
    TEETH_SUMMARY: input.teethSummary,
    GOLD_COLOR: input.goldColor,
    STONE_TYPE: input.stoneType,
    DIAMOND_QUALITY: input.diamondQuality,
    INSPIRATION: input.inspiration || "none provided"
  };

  return Object.entries(values).reduce(
    (prompt, [key, value]) => prompt.replace(new RegExp(`{{${escapeRegExp(key)}}}`, "g"), value),
    template
  );
}

