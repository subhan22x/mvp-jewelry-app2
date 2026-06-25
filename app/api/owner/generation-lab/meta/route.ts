import { NextResponse } from "next/server";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { getAllStyles } from "@/src/lib/styles/registry";
import { LAB_PRESETS } from "@/src/lib/generation-lab/presets";
import {
  FAILURE_TAGS,
  LAB_IMAGE_MODELS,
  LAB_FAMILIES,
  MAX_GENERATION_CALLS_PER_RUN,
  expectedGenerationsForFamily,
  familyIsWired,
  familyLabel
} from "@/src/lib/generation-lab/types";
import pictureStylesData from "@/data/picture-pendant-styles.json";

export const dynamic = "force-dynamic";

export async function GET() {
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const nameStyles = getAllStyles()
    .filter(style => !style.id.startsWith("plain_"))
    .map(style => ({
      id: style.id,
      label: style.label,
      templateKey: style.templateKey,
      emblemsAllowed: style.emblemsAllowed,
      hasNaturalLanguage: Boolean(style.naturalLanguageTemplateKey)
    }));

  const plainStyles = getAllStyles()
    .filter(style => style.id.startsWith("plain_"))
    .map(style => ({ id: style.id, label: style.label }));

  const pictureStyles = (pictureStylesData as Array<{ id: string; label: string; available?: boolean }>)
    .map(style => ({ id: style.id, label: style.label, available: style.available === true }));

  const braceletStyles = [
    { id: "style_1", label: "Icedout 1", productLine: "icedout" as const },
    { id: "style_2", label: "Icedout 2", productLine: "icedout" as const },
    { id: "style_3", label: "Icedout 3", productLine: "icedout" as const },
    { id: "style_4", label: "Icedout 4", productLine: "icedout" as const },
    { id: "womens_1", label: "Womens 1", productLine: "womens" as const },
    { id: "womens_2", label: "Womens 2", productLine: "womens" as const }
  ];

  return NextResponse.json({
    families: LAB_FAMILIES.map(family => ({
      id: family,
      label: familyLabel(family),
      wired: familyIsWired(family),
      generationsPerCase: expectedGenerationsForFamily(family)
    })),
    maxGenerationsPerRun: MAX_GENERATION_CALLS_PER_RUN,
    failureTags: FAILURE_TAGS,
    imageModels: LAB_IMAGE_MODELS,
    presets: LAB_PRESETS.map(preset => ({
      id: preset.id,
      label: preset.label,
      description: preset.description,
      caseCount: preset.cases.length
    })),
    nameStyles,
    plainStyles,
    pictureStyles,
    braceletStyles
  });
}
