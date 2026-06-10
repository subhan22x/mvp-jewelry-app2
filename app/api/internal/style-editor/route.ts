import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import YAML from "yaml";
import { getDefaultAccountId } from "@/src/lib/account";
import { clearStyleCache, getOptionalTemplatePath, getStyle } from "@/src/lib/styles/registry";
import {
  clearStyleOverride,
  normalizeTextReferenceOptions,
  saveStyleOverride,
  type StylePromptOverride
} from "@/src/lib/styles/style-overrides";

const BACKUP_ROOT = path.join(process.cwd(), ".style-editor-backups");

type BackupManifest = {
  styleId: string;
  createdAt: string;
  files: Array<{
    label: string;
    originalPath: string;
    backupFile: string;
  }>;
};

function redirectToEditor(req: Request, styleId: string, status: string) {
  const url = new URL("/internal/generations", req.url);
  url.searchParams.set("tab", "style-editor");
  url.searchParams.set("style", styleId);
  url.searchParams.set("status", status);
  return NextResponse.redirect(url);
}

function assertIcedOutStyle(styleId: string) {
  const style = getStyle(styleId);
  if (style.id.startsWith("plain_")) {
    throw new Error("Only iced-out pendant styles can be edited here.");
  }
  return style;
}

function optionalString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : undefined;
}

function normalizeMultiline(value: string | undefined) {
  return value?.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function checkboxValue(formData: FormData, name: string) {
  return formData.getAll(name).some(value => value === "true");
}

function buildOverrideFromForm(formData: FormData): StylePromptOverride {
  return {
    templateRaw: normalizeMultiline(optionalString(formData.get("templateRaw"))),
    naturalLanguageTemplateRaw: normalizeMultiline(optionalString(formData.get("naturalLanguageTemplateRaw"))),
    attachTextReference: checkboxValue(formData, "attachTextReference"),
    textReferenceOptions: normalizeTextReferenceOptions({
      backgroundColor: optionalString(formData.get("backgroundColor")),
      fillColor: optionalString(formData.get("fillColor")),
      outlineColor: optionalString(formData.get("outlineColor")),
      outlineWidth: optionalString(formData.get("outlineWidth"))
    })
  };
}

async function copyIfExists(originalPath: string, backupDir: string, label: string) {
  try {
    await fs.access(originalPath);
  } catch {
    return null;
  }

  const backupFile = `${label}${path.extname(originalPath) || ".txt"}`;
  await fs.copyFile(originalPath, path.join(backupDir, backupFile));
  return {
    label,
    originalPath,
    backupFile
  };
}

async function createRepoBackup(
  styleId: string,
  styleYmlPath: string,
  templatePath: string | null,
  naturalLanguageTemplatePath: string | null
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(BACKUP_ROOT, styleId, timestamp);
  await fs.mkdir(backupDir, { recursive: true });

  const files = (await Promise.all([
    copyIfExists(styleYmlPath, backupDir, "style"),
    templatePath ? copyIfExists(templatePath, backupDir, "template") : Promise.resolve(null),
    naturalLanguageTemplatePath ? copyIfExists(naturalLanguageTemplatePath, backupDir, "natural-language-template") : Promise.resolve(null)
  ])).filter((entry): entry is BackupManifest["files"][number] => Boolean(entry));

  const manifest: BackupManifest = {
    styleId,
    createdAt: new Date().toISOString(),
    files
  };
  await fs.writeFile(path.join(backupDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  return backupDir;
}

async function findLatestBackup(styleId: string) {
  const styleBackupRoot = path.join(BACKUP_ROOT, styleId);
  try {
    const entries = await fs.readdir(styleBackupRoot, { withFileTypes: true });
    const dirs = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort()
      .reverse();
    return dirs[0] ? path.join(styleBackupRoot, dirs[0]) : null;
  } catch {
    return null;
  }
}

async function restoreLatestRepoBackup(styleId: string) {
  const latest = await findLatestBackup(styleId);
  if (!latest) throw new Error("No style backup is available to restore.");

  const raw = await fs.readFile(path.join(latest, "manifest.json"), "utf8");
  const manifest = JSON.parse(raw) as BackupManifest;
  for (const file of manifest.files) {
    await fs.copyFile(path.join(latest, file.backupFile), file.originalPath);
  }
  clearStyleCache(styleId);
}

async function saveRepoFiles(styleId: string, override: StylePromptOverride) {
  const style = assertIcedOutStyle(styleId);
  const styleYmlPath = path.join(process.cwd(), "src", "lib", "styles", style.id, "style.yml");
  const templatePath = getOptionalTemplatePath(style.id, style.templateKey);
  const naturalLanguageTemplatePath = style.naturalLanguageTemplateKey
    ? getOptionalTemplatePath(style.id, style.naturalLanguageTemplateKey)
    : null;

  await createRepoBackup(styleId, styleYmlPath, templatePath, naturalLanguageTemplatePath);

  if (templatePath && override.templateRaw !== undefined) {
    await fs.writeFile(templatePath, override.templateRaw, "utf8");
  }
  if (naturalLanguageTemplatePath && override.naturalLanguageTemplateRaw !== undefined) {
    await fs.writeFile(naturalLanguageTemplatePath, override.naturalLanguageTemplateRaw, "utf8");
  }

  const styleYml = YAML.parse(await fs.readFile(styleYmlPath, "utf8")) as Record<string, any>;
  styleYml.fontReference = {
    ...(styleYml.fontReference ?? {}),
    attachTextReference: override.attachTextReference,
    renderOptions: override.textReferenceOptions
  };
  await fs.writeFile(styleYmlPath, YAML.stringify(styleYml), "utf8");
  clearStyleCache(styleId);
}

export async function POST(req: Request) {
  let styleId = "";
  try {
    const formData = await req.formData();
    styleId = optionalString(formData.get("styleId")) ?? "";
    const action = optionalString(formData.get("action")) ?? "";
    if (!styleId) throw new Error("Missing style id.");
    assertIcedOutStyle(styleId);

    if (action === "save-db") {
      await saveStyleOverride(getDefaultAccountId(), styleId, buildOverrideFromForm(formData));
      return redirectToEditor(req, styleId, "db-saved");
    }

    if (action === "clear-db") {
      await clearStyleOverride(getDefaultAccountId(), styleId);
      return redirectToEditor(req, styleId, "db-cleared");
    }

    if (action === "save-repo") {
      await saveRepoFiles(styleId, buildOverrideFromForm(formData));
      await clearStyleOverride(getDefaultAccountId(), styleId);
      return redirectToEditor(req, styleId, "repo-saved");
    }

    if (action === "restore-repo-backup") {
      await restoreLatestRepoBackup(styleId);
      return redirectToEditor(req, styleId, "repo-restored");
    }

    throw new Error("Unknown style editor action.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Style editor action failed.";
    const safeStyleId = styleId || "deja";
    const url = new URL("/internal/generations", req.url);
    url.searchParams.set("tab", "style-editor");
    url.searchParams.set("style", safeStyleId);
    url.searchParams.set("error", message);
    return NextResponse.redirect(url);
  }
}
