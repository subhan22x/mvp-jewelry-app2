import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { z } from "zod";
import type { LogoShape } from "./config";

const AssetsSchema = z.object({
  shapeReferences: z.object({
    custom: z.null(),
    circle: z.string().min(1),
    shield: z.string().min(1),
    hexa: z.string().min(1),
    diamond: z.string().min(1)
  })
});

export function buildLogoPendantAttachments(logoPath: string, shape: LogoShape): string[] {
  const assets = AssetsSchema.parse(YAML.parse(fs.readFileSync(
    path.join(process.cwd(), "src/lib/logo-pendants/assets.yml"), "utf8"
  )));
  const reference = assets.shapeReferences[shape];
  return reference ? [logoPath, path.join(process.cwd(), reference)] : [logoPath];
}
