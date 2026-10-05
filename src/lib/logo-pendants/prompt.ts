import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { z } from "zod";
import { renderTemplate } from "../styles/utils";
import { LOGO_COLOR_COMBOS, LOGO_SHAPES, type LogoColorCombo, type LogoShape } from "./config";

export const LogoSettingsSchema = z.object({
  shape: z.enum(LOGO_SHAPES),
  colorCombo: z.enum(["YELLOW_WHITE", "ROSE_WHITE", "WHITE"]),
  additionalText: z.string().trim().max(2000).default(""),
  size: z.enum(["small", "medium", "large", "xl"]),
  stoneType: z.enum(["natural", "lab", "moissanite", "cz"]),
  diamondQuality: z.enum(["vs", "vvs"]),
  metalType: z.enum(["gold", "silver", "platinum"])
});

export function buildLogoPendantPrompt(input: { shape: LogoShape; colorCombo: LogoColorCombo; additionalText?: string }) {
  const template = fs.readFileSync(path.join(process.cwd(), "src/lib/logo-pendants/pendant.prompt"), "utf8");
  const snippets = z.object({
    shapeContext: z.string(),
    shapes: z.object({ custom: z.string(), circle: z.string(), shield: z.string(), hexa: z.string(), diamond: z.string() }),
    aboutLogo: z.string()
  }).parse(YAML.parse(fs.readFileSync(path.join(process.cwd(), "src/lib/logo-pendants/snippets.yml"), "utf8")));

  // Render the optional text separately so customer text cannot create template placeholders.
  const text = input.additionalText?.trim();
  return renderTemplate(template, {
    SHAPE_CONTEXT: input.shape === "custom" ? "" : snippets.shapeContext,
    SHAPE_CLAUSE: snippets.shapes[input.shape],
    METAL_COLOR: LOGO_COLOR_COMBOS[input.colorCombo].label,
    ABOUT_LOGO: text ? renderTemplate(snippets.aboutLogo, { TEXT: text }) : ""
  }).trim();
}
