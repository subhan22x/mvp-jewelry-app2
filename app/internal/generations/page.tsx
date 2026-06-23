import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/server/db/client";
import { getDefaultAccountId } from "@/src/lib/account";
import { loadStyleOverride, type StyleTextReferenceOptions } from "@/src/lib/styles/style-overrides";
import * as registryModule from "@/src/lib/styles/registry";
import * as textReferenceModule from "@/src/lib/styles/text-reference";

export const dynamic = "force-dynamic";

type SearchParams = {
  tab?: string;
  status?: string;
  model?: string;
  request?: string;
  product?: string;
  style?: string;
  text?: string;
  fill?: string;
  fillColor?: string;
  outline?: string;
  outlineColor?: string;
  outlineWidth?: string;
  background?: string;
  backgroundColor?: string;
  error?: string;
};

const GENERATED_DIR = path.join(process.cwd(), "public", "generated");
const PUBLIC_DIR = path.join(process.cwd(), "public");

async function listGeneratedFiles() {
  try {
    const files = await fs.readdir(GENERATED_DIR);
    return files
      .filter(file => /\.(png|jpe?g|webp)$/i.test(file))
      .sort()
      .map(file => `/generated/${file}`);
  } catch {
    return [];
  }
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}

function seconds(durationMs: number | null) {
  return typeof durationMs === "number" ? `${(durationMs / 1000).toFixed(2)}s` : "n/a";
}

function shortId(id: string) {
  return id.slice(0, 8);
}

function isRemoteUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isInsideDir(filePath: string, dir: string) {
  const relative = path.relative(dir, filePath);
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function publicUrlForFile(filePath: string) {
  if (!isInsideDir(filePath, PUBLIC_DIR)) return null;
  const relative = path.relative(PUBLIC_DIR, filePath).split(path.sep).map(encodeURIComponent).join("/");
  return `/${relative}`;
}

async function imageSrcForLocalFile(filePath: string) {
  const publicUrl = publicUrlForFile(filePath);
  if (publicUrl) return publicUrl;

  return `/internal/generations/reference-image?p=${Buffer.from(filePath).toString("base64url")}`;
}

type ReviewAttachment = {
  kind: "pendant" | "emblem" | "typography" | "reference";
  label: string;
  filePath: string;
  src: string;
};

function attachmentKind(filePath: string): ReviewAttachment["kind"] {
  if (filePath.includes(`${path.sep}public${path.sep}pendants${path.sep}`)) return "pendant";
  if (filePath.includes(`${path.sep}public${path.sep}plain-pendants${path.sep}`)) return "pendant";
  if (filePath.includes(`${path.sep}public${path.sep}emblems${path.sep}`)) return "emblem";
  if (filePath.includes("flawless-style-text-references")) return "typography";
  return "reference";
}

function attachmentLabel(kind: ReviewAttachment["kind"]) {
  const labels: Record<ReviewAttachment["kind"], string> = {
    pendant: "Pendant reference",
    emblem: "Emblem reference",
    typography: "Font rendering",
    reference: "Reference"
  };
  return labels[kind];
}

function loadStyleReviewModules() {
  const registry = "getAllStyles" in registryModule
    ? registryModule
    : (registryModule as any).default;
  const textReference = "isTextReferenceDescriptorPath" in textReferenceModule
    ? textReferenceModule
    : (textReferenceModule as any).default;

  return {
    getAllStyles: registry.getAllStyles as typeof import("@/src/lib/styles/registry").getAllStyles,
    getTemplatePath: registry.getTemplatePath as typeof import("@/src/lib/styles/registry").getTemplatePath,
    getOptionalTemplatePath: registry.getOptionalTemplatePath as typeof import("@/src/lib/styles/registry").getOptionalTemplatePath,
    renderTextReferencePreview: textReference.renderTextReferencePreview as typeof import("@/src/lib/styles/text-reference").renderTextReferencePreview
  };
}

function tabLinkClass(active: boolean) {
  return `rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
    active
      ? "border-amber-300/50 bg-amber-300/15 text-amber-100"
      : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-100"
  }`;
}

function InternalTabs({ active }: { active: "review" | "text-renderer" | "style-editor" | "vvs" }) {
  return (
    <nav className="mt-5 flex flex-wrap gap-2">
      <a href="/internal/generations" className={tabLinkClass(active === "review")}>
        Generation Review
      </a>
      <a href="/internal/generations?tab=text-renderer" className={tabLinkClass(active === "text-renderer")}>
        Text Renderer
      </a>
      <a href="/internal/generations?tab=style-editor" className={tabLinkClass(active === "style-editor")}>
        Style Editor
      </a>
      <a href="/internal/vvs-generations" className={tabLinkClass(active === "vvs")}>
        VVS Generations
      </a>
    </nav>
  );
}

function hexParam(value: string | undefined, fallback: string) {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function numberParam(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(96, Math.round(parsed)));
}

const DEFAULT_TEXT_REFERENCE_OPTIONS = {
  fillColor: "#050505",
  outlineColor: "#b8924a",
  outlineWidth: 34,
  backgroundColor: "#ffffff"
};

function textReferenceOptionsWithDefaults(options?: StyleTextReferenceOptions | null) {
  return {
    fillColor: hexParam(options?.fillColor, DEFAULT_TEXT_REFERENCE_OPTIONS.fillColor),
    outlineColor: hexParam(options?.outlineColor, DEFAULT_TEXT_REFERENCE_OPTIONS.outlineColor),
    outlineWidth: numberParam(String(options?.outlineWidth ?? ""), DEFAULT_TEXT_REFERENCE_OPTIONS.outlineWidth),
    backgroundColor: hexParam(options?.backgroundColor, DEFAULT_TEXT_REFERENCE_OPTIONS.backgroundColor)
  };
}

async function latestStyleBackupExists(styleId: string) {
  try {
    const backupRoot = path.join(process.cwd(), ".style-editor-backups", styleId);
    const entries = await fs.readdir(backupRoot, { withFileTypes: true });
    return entries.some(entry => entry.isDirectory());
  } catch {
    return false;
  }
}

async function readTemplate(pathOrNull: string | null) {
  if (!pathOrNull) return "";
  try {
    return await fs.readFile(pathOrNull, "utf8");
  } catch {
    return "";
  }
}

async function renderTextRendererPage(filters: SearchParams) {
  const { getAllStyles, renderTextReferencePreview } = loadStyleReviewModules();
  const styles = getAllStyles().filter(style => style.fontReference);
  const selectedStyle = styles.find(style => style.id === filters.style)
    ?? styles.find(style => style.id === "samoa")
    ?? styles[0];
  const previewText = (filters.text ?? "SKY").slice(0, 32);
  const options = {
    fillColor: hexParam(filters.fill, "#050505"),
    outlineColor: hexParam(filters.outline, "#b8924a"),
    outlineWidth: numberParam(filters.outlineWidth, 34),
    backgroundColor: hexParam(filters.background, "#ffffff")
  };

  const previewEntries = await Promise.all(styles.map(async style => {
    const filePath = await renderTextReferencePreview({
      styleId: style.id,
      family: style.fontReference!.family,
      fontPath: path.join(process.cwd(), style.fontReference!.file),
      text: previewText,
      transform: style.fontReference!.transform,
      options
    });
    return {
      style,
      filePath,
      src: await imageSrcForLocalFile(filePath)
    };
  }));
  const selectedEntry = previewEntries.find(entry => entry.style.id === selectedStyle?.id) ?? previewEntries[0];

  return (
    <main className="min-h-dvh bg-[#101114] px-5 py-6 text-zinc-100 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-white/10 pb-5">
          <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Internal</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Text Renderer</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Preview each iced-out style font with adjustable outline settings. This does not change saved production prompt settings.
          </p>
          <InternalTabs active="text-renderer" />
        </header>

        <section className="mt-6 grid gap-5 lg:grid-cols-[380px_1fr]">
          <form className="rounded border border-white/10 bg-[#17191f] p-4">
            <input type="hidden" name="tab" value="text-renderer" />
            <div className="grid gap-4">
              <label className="text-sm text-zinc-300">
                <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-zinc-500">Style</span>
                <select
                  name="style"
                  defaultValue={selectedEntry?.style.id}
                  className="w-full rounded border border-white/10 bg-[#101114] px-3 py-2 text-sm text-zinc-100"
                >
                  {styles.map(style => (
                    <option key={style.id} value={style.id}>
                      {style.label} / {style.id}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-zinc-300">
                <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-zinc-500">Preview text</span>
                <input
                  name="text"
                  defaultValue={previewText}
                  placeholder="Type a name"
                  maxLength={32}
                  className="w-full rounded border border-white/10 bg-[#101114] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-zinc-300">
                  <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-zinc-500">Outline color</span>
                  <input
                    name="outline"
                    type="color"
                    defaultValue={options.outlineColor}
                    className="h-11 w-full rounded border border-white/10 bg-[#101114] p-1"
                  />
                </label>
                <label className="text-sm text-zinc-300">
                  <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-zinc-500">Fill color</span>
                  <input
                    name="fill"
                    type="color"
                    defaultValue={options.fillColor}
                    className="h-11 w-full rounded border border-white/10 bg-[#101114] p-1"
                  />
                </label>
              </div>

              <label className="text-sm text-zinc-300">
                <span className="mb-1 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Outline width
                  <span className="font-mono tracking-normal text-amber-200">{options.outlineWidth}px</span>
                </span>
                <div className="grid grid-cols-[1fr_74px] gap-3">
                  <input
                    name="outlineWidth"
                    type="range"
                    min="0"
                    max="96"
                    defaultValue={options.outlineWidth}
                    className="accent-amber-300"
                  />
                  <input
                    type="number"
                    min="0"
                    max="96"
                    defaultValue={options.outlineWidth}
                    readOnly
                    className="rounded border border-white/10 bg-[#101114] px-2 py-2 text-sm text-zinc-100"
                  />
                </div>
              </label>

              <label className="text-sm text-zinc-300">
                <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-zinc-500">Background</span>
                <input
                  name="background"
                  type="color"
                  defaultValue={options.backgroundColor}
                  className="h-11 w-full rounded border border-white/10 bg-[#101114] p-1"
                />
              </label>

              <button className="rounded bg-amber-300 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-200">
                Update preview
              </button>
            </div>
          </form>

          <div className="rounded border border-white/10 bg-[#17191f] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-amber-200/80">Selected style</p>
                <h2 className="mt-1 text-2xl font-semibold">{selectedEntry?.style.label ?? "No font styles found"}</h2>
                {selectedEntry?.style.fontReference && (
                  <p className="mt-1 text-xs text-zinc-500">
                    {selectedEntry.style.id} / {selectedEntry.style.fontReference.family}
                  </p>
                )}
              </div>
              {selectedEntry && (
                <a href={selectedEntry.src} target="_blank" rel="noopener noreferrer" className="rounded border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-white/25 hover:text-white">
                  Open PNG
                </a>
              )}
            </div>
            <div className="mt-4 overflow-hidden rounded border border-white/10 bg-black/40">
              {selectedEntry ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedEntry.src} alt={`${selectedEntry.style.label} text rendering`} className="block w-full" />
              ) : (
                <div className="p-8 text-center text-sm text-zinc-500">No styles with font references are configured.</div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="border-b border-white/10 pb-3">
            <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">All configured fonts</p>
            <h2 className="mt-1 text-xl font-semibold">Style comparison</h2>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {previewEntries.map(entry => (
              <a
                key={entry.style.id}
                href={`/internal/generations?tab=text-renderer&style=${encodeURIComponent(entry.style.id)}&text=${encodeURIComponent(previewText)}&fill=${encodeURIComponent(options.fillColor)}&outline=${encodeURIComponent(options.outlineColor)}&outlineWidth=${options.outlineWidth}&background=${encodeURIComponent(options.backgroundColor)}`}
                className={`rounded border bg-[#17191f] p-3 transition hover:border-amber-300/40 ${
                  entry.style.id === selectedEntry?.style.id ? "border-amber-300/40" : "border-white/10"
                }`}
              >
                <div className="aspect-[12/5] overflow-hidden rounded bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={entry.src} alt={`${entry.style.label} text rendering`} className="h-full w-full object-contain" />
                </div>
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-zinc-100">{entry.style.label}</div>
                    <div className="mt-1 text-[11px] text-zinc-500">{entry.style.id}</div>
                  </div>
                  <div className="max-w-[46%] truncate text-right text-[11px] text-zinc-400">
                    {entry.style.fontReference?.family}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

async function renderStyleEditorPage(filters: SearchParams) {
  const { getAllStyles, getOptionalTemplatePath, renderTextReferencePreview } = loadStyleReviewModules();
  const styles = getAllStyles().filter(style => !style.id.startsWith("plain_"));
  const selectedStyle = styles.find(style => style.id === filters.style)
    ?? styles.find(style => style.id === "samoa")
    ?? styles[0];

  if (!selectedStyle) {
    return (
      <main className="min-h-dvh bg-[#101114] px-5 py-6 text-zinc-100 md:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="border-b border-white/10 pb-5">
            <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Internal</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Style Editor</h1>
            <InternalTabs active="style-editor" />
          </header>
          <div className="mt-6 rounded border border-white/10 bg-white/[0.03] p-8 text-center text-zinc-400">
            No editable iced-out styles are configured.
          </div>
        </div>
      </main>
    );
  }

  const templatePath = getOptionalTemplatePath(selectedStyle.id, selectedStyle.templateKey);
  const naturalTemplatePath = selectedStyle.naturalLanguageTemplateKey
    ? getOptionalTemplatePath(selectedStyle.id, selectedStyle.naturalLanguageTemplateKey)
    : null;
  const [repoTemplateRaw, repoNaturalTemplateRaw, dbOverride, hasBackup] = await Promise.all([
    readTemplate(templatePath),
    readTemplate(naturalTemplatePath),
    loadStyleOverride(getDefaultAccountId(), selectedStyle.id),
    latestStyleBackupExists(selectedStyle.id)
  ]);
  const effectiveTemplateRaw = dbOverride?.templateRaw ?? repoTemplateRaw;
  const effectiveNaturalTemplateRaw = dbOverride?.naturalLanguageTemplateRaw ?? repoNaturalTemplateRaw;
  const savedAttachTextReference = dbOverride?.attachTextReference
    ?? selectedStyle.fontReference?.attachTextReference
    ?? true;
  const savedTextOptions = textReferenceOptionsWithDefaults(
    dbOverride?.textReferenceOptions ?? selectedStyle.fontReference?.renderOptions
  );
  const effectiveTextOptions = {
    fillColor: hexParam(filters.fillColor ?? filters.fill, savedTextOptions.fillColor),
    outlineColor: hexParam(filters.outlineColor ?? filters.outline, savedTextOptions.outlineColor),
    outlineWidth: numberParam(filters.outlineWidth, savedTextOptions.outlineWidth),
    backgroundColor: hexParam(filters.backgroundColor ?? filters.background, savedTextOptions.backgroundColor)
  };
  const previewText = (filters.text ?? "POMONA").slice(0, 32);
  const previewPath = selectedStyle.fontReference
    ? await renderTextReferencePreview({
        styleId: selectedStyle.id,
        family: selectedStyle.fontReference.family,
        fontPath: path.join(process.cwd(), selectedStyle.fontReference.file),
        text: previewText,
        transform: selectedStyle.fontReference.transform,
        options: effectiveTextOptions
      })
    : null;
  const previewSrc = previewPath ? await imageSrcForLocalFile(previewPath) : null;
  const statusMessages: Record<string, string> = {
    "db-saved": "Database override saved. Future generations for this account will use it.",
    "db-cleared": "Database override cleared. Future generations will use repo files.",
    "repo-saved": "Repo style files saved after creating a local backup. Any DB override for this style was cleared.",
    "repo-restored": "Latest repo backup restored."
  };
  const statusMessage = filters.status ? statusMessages[filters.status] : null;

  return (
    <main className="min-h-dvh bg-[#101114] px-5 py-6 text-zinc-100 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-white/10 pb-5">
          <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Internal</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Style Editor</h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-400">
            Edit iced-out prompt templates and text-renderer settings. Saves only affect future generation requests.
          </p>
          <InternalTabs active="style-editor" />
        </header>

        {(statusMessage || filters.error) && (
          <div className={`mt-5 rounded border px-4 py-3 text-sm ${
            filters.error
              ? "border-red-400/30 bg-red-400/10 text-red-100"
              : "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
          }`}>
            {filters.error ?? statusMessage}
          </div>
        )}

        <section className="mt-6 grid gap-5 lg:grid-cols-[320px_1fr]">
          <aside className="rounded border border-white/10 bg-[#17191f] p-4">
            <form>
              <input type="hidden" name="tab" value="style-editor" />
              <label className="text-sm text-zinc-300">
                <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-zinc-500">Style</span>
                <select
                  id="style-editor-style"
                  name="style"
                  defaultValue={selectedStyle.id}
                  className="w-full rounded border border-white/10 bg-[#101114] px-3 py-2 text-sm text-zinc-100"
                >
                  {styles.map(style => (
                    <option key={style.id} value={style.id}>
                      {style.label} / {style.id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-4 block text-sm text-zinc-300">
                <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-zinc-500">Preview text</span>
                <input
                  id="style-editor-preview-text"
                  name="text"
                  defaultValue={previewText}
                  maxLength={32}
                  className="w-full rounded border border-white/10 bg-[#101114] px-3 py-2 text-sm text-zinc-100"
                />
              </label>
              <button className="mt-4 w-full rounded bg-amber-300 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-200">
                Load style
              </button>
            </form>

            <div className="mt-5 space-y-3 rounded border border-white/10 bg-black/20 p-3 text-xs text-zinc-400">
              <div className="flex items-center justify-between gap-3">
                <span>DB override</span>
                <span className={dbOverride ? "text-amber-200" : "text-zinc-500"}>{dbOverride ? "active" : "inactive"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Effective source</span>
                <span className={dbOverride ? "text-amber-200" : "text-emerald-200"}>{dbOverride ? "database" : "repo files"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Text renderer</span>
                <span className={savedAttachTextReference ? "text-emerald-200" : "text-zinc-500"}>{savedAttachTextReference ? "attached" : "off"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Repo backup</span>
                <span className={hasBackup ? "text-emerald-200" : "text-zinc-500"}>{hasBackup ? "available" : "none"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Font</span>
                <span className="max-w-[150px] truncate text-right text-zinc-300">{selectedStyle.fontReference?.family ?? "none"}</span>
              </div>
            </div>

            {previewSrc && (
              <div className="mt-5 overflow-hidden rounded border border-white/10 bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewSrc} alt={`${selectedStyle.label} text renderer preview`} className="block w-full" />
              </div>
            )}
          </aside>

          <form action="/api/internal/style-editor" method="post" className="rounded border border-white/10 bg-[#17191f] p-4">
            <input type="hidden" name="styleId" value={selectedStyle.id} />

            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-amber-200/80">{selectedStyle.id}</p>
                <h2 className="mt-1 text-2xl font-semibold">{selectedStyle.label}</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Save to DB for a reversible account override, or save to repo files for source-controlled defaults.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  name="action"
                  value="save-db"
                  className="rounded bg-amber-300 px-4 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-amber-200"
                >
                  Save DB override
                </button>
                <button
                  name="action"
                  value="save-repo"
                  className="rounded border border-amber-300/40 bg-amber-300/10 px-4 py-2 text-xs font-semibold text-amber-100 transition hover:border-amber-200"
                >
                  Save repo files
                </button>
              </div>
            </div>

            <section className="mt-5 grid gap-4 md:grid-cols-4">
              <label className="flex min-h-[76px] items-center justify-between gap-4 rounded border border-white/10 bg-[#101114] px-3 py-2 text-sm text-zinc-300 md:col-span-4">
                <span>
                  <span className="block text-xs uppercase tracking-[0.2em] text-zinc-500">Attach text renderer</span>
                  <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
                    Include the generated font preview image as an API reference for future generations.
                  </span>
                </span>
                <input
                  name="attachTextReference"
                  type="checkbox"
                  value="true"
                  defaultChecked={savedAttachTextReference}
                  className="h-5 w-5 accent-amber-300"
                />
              </label>
              <label className="text-sm text-zinc-300">
                <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-zinc-500">Outline width</span>
                <input
                  id="style-editor-outline-width"
                  name="outlineWidth"
                  type="number"
                  min="0"
                  max="96"
                  defaultValue={effectiveTextOptions.outlineWidth}
                  className="w-full rounded border border-white/10 bg-[#101114] px-3 py-2 text-sm text-zinc-100"
                />
              </label>
              <label className="text-sm text-zinc-300">
                <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-zinc-500">Outline</span>
                <input
                  id="style-editor-outline-color"
                  name="outlineColor"
                  type="color"
                  defaultValue={effectiveTextOptions.outlineColor}
                  className="h-10 w-full rounded border border-white/10 bg-[#101114] p-1"
                />
              </label>
              <label className="text-sm text-zinc-300">
                <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-zinc-500">Fill</span>
                <input
                  id="style-editor-fill-color"
                  name="fillColor"
                  type="color"
                  defaultValue={effectiveTextOptions.fillColor}
                  className="h-10 w-full rounded border border-white/10 bg-[#101114] p-1"
                />
              </label>
              <label className="text-sm text-zinc-300">
                <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-zinc-500">Background</span>
                <input
                  id="style-editor-background-color"
                  name="backgroundColor"
                  type="color"
                  defaultValue={effectiveTextOptions.backgroundColor}
                  className="h-10 w-full rounded border border-white/10 bg-[#101114] p-1"
                />
              </label>
            </section>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded border border-amber-300/20 bg-amber-300/5 p-3">
              <p className="text-xs text-zinc-400">
                Change renderer values, then refresh the preview before saving.
              </p>
              <button
                type="button"
                id="style-editor-refresh-preview"
                className="rounded bg-amber-300 px-4 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-amber-200"
              >
                Refresh text renderer
              </button>
            </div>
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  (() => {
                    const button = document.getElementById("style-editor-refresh-preview");
                    if (!button) return;
                    button.addEventListener("click", () => {
                      const url = new URL(window.location.href);
                      url.pathname = "/internal/generations";
                      url.searchParams.set("tab", "style-editor");
                      const fields = [
                        ["style", "style-editor-style"],
                        ["text", "style-editor-preview-text"],
                        ["outlineWidth", "style-editor-outline-width"],
                        ["outlineColor", "style-editor-outline-color"],
                        ["fillColor", "style-editor-fill-color"],
                        ["backgroundColor", "style-editor-background-color"]
                      ];
                      for (const [param, id] of fields) {
                        const field = document.getElementById(id);
                        if (field && "value" in field) {
                          url.searchParams.set(param, field.value);
                        }
                      }
                      url.searchParams.delete("status");
                      url.searchParams.delete("error");
                      window.location.href = url.toString();
                    });
                  })();
                `
              }}
            />

            <section className="mt-5 grid gap-4">
              <label className="text-sm text-zinc-300">
                <span className="mb-1 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Base prompt template
                  <span className="font-mono tracking-normal text-zinc-600">{templatePath ? path.basename(templatePath) : "not found"}</span>
                </span>
                <textarea
                  name="templateRaw"
                  defaultValue={effectiveTemplateRaw}
                  spellCheck={false}
                  disabled={!templatePath}
                  placeholder={templatePath ? undefined : "This style does not have a base JSON/prompt template file. Use the natural-language template below."}
                  className="min-h-[260px] w-full rounded border border-white/10 bg-[#101114] px-3 py-2 font-mono text-xs leading-relaxed text-zinc-100 placeholder:text-zinc-600"
                />
              </label>

              {naturalTemplatePath && (
                <label className="text-sm text-zinc-300">
                  <span className="mb-1 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Natural-language prompt template
                    <span className="font-mono tracking-normal text-zinc-600">{path.basename(naturalTemplatePath)}</span>
                  </span>
                  <textarea
                    name="naturalLanguageTemplateRaw"
                    defaultValue={effectiveNaturalTemplateRaw}
                    spellCheck={false}
                    className="min-h-[300px] w-full rounded border border-white/10 bg-[#101114] px-3 py-2 font-mono text-xs leading-relaxed text-zinc-100 placeholder:text-zinc-600"
                  />
                </label>
              )}
            </section>

            <section className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <div className="text-xs text-zinc-500">
                Revert options are explicit. Clearing DB overrides does not touch repo files.
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  name="action"
                  value="clear-db"
                  className="rounded border border-white/10 bg-black/20 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:border-white/25"
                >
                  Clear DB override
                </button>
                <button
                  name="action"
                  value="restore-repo-backup"
                  className="rounded border border-red-300/30 bg-red-400/10 px-4 py-2 text-xs font-semibold text-red-100 transition hover:border-red-200/60 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!hasBackup}
                >
                  Restore repo backup
                </button>
              </div>
            </section>
          </form>
        </section>
      </div>
    </main>
  );
}

function parseStoredAttachmentPaths(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
  } catch {
    return [];
  }
}

async function buildStoredReviewAttachments(attachmentPathsJson: string | null) {
  const attachmentPaths = parseStoredAttachmentPaths(attachmentPathsJson);
  const attachments: Array<ReviewAttachment | null> = await Promise.all(attachmentPaths.map(async (filePath) => {
    const kind = attachmentKind(filePath);
    if (isRemoteUrl(filePath)) {
      return {
        kind,
        label: attachmentLabel(kind),
        filePath,
        src: filePath
      };
    }

    if (!(await fileExists(filePath))) return null;
    return {
      kind,
      label: attachmentLabel(kind),
      filePath,
      src: await imageSrcForLocalFile(filePath)
    };
  }));

  return attachments.filter((attachment): attachment is ReviewAttachment => Boolean(attachment));
}

export default async function InternalGenerationsPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const filters = await searchParams;
  if (filters.tab === "text-renderer") {
    return renderTextRendererPage(filters);
  }
  if (filters.tab === "style-editor") {
    return renderStyleEditorPage(filters);
  }

  const [rows, videos, quoteRequests, generatedFiles] = await Promise.all([
    prisma.result.findMany({
      orderBy: [{ createdAt: "desc" }, { variant: "asc" }],
      take: 100,
      include: {
        request: {
          select: {
            id: true,
            text: true,
            productType: true,
            uploadFileName: true,
            userId: true,
            pendantFinish: true,
            styleId: true,
            twoTone: true,
            primaryMetal: true,
            secondaryMetal: true,
            emblem: true,
            plainColor: true,
            plainMetal: true,
            plainKarat: true,
            plainChain: true,
            createdAt: true
          }
        }
      }
    }),
    prisma.videoGeneration.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 50,
      include: {
        request: {
          select: {
            id: true,
            text: true,
            productType: true,
            styleId: true,
            primaryMetal: true,
            secondaryMetal: true,
            emblem: true,
            createdAt: true
          }
        }
      }
    }),
    prisma.quoteRequest.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 50
    }),
    listGeneratedFiles()
  ]);

  const normalizedStatus = filters.status?.toLowerCase();
  const normalizedModel = filters.model?.toLowerCase();
  const normalizedRequest = filters.request?.toLowerCase();
  const normalizedProduct = filters.product?.toLowerCase();
  const fileSet = new Set(generatedFiles);
  const imageUrlsInDb = new Set(rows.map(row => row.imageUrl).filter(Boolean));
  const orphanFiles = generatedFiles.filter(file => !imageUrlsInDb.has(file));

  const filteredRows = rows.filter(row => {
    if (normalizedStatus && normalizedStatus !== "all" && row.status.toLowerCase() !== normalizedStatus) return false;
    if (normalizedProduct && normalizedProduct !== "all" && row.request.productType.toLowerCase() !== normalizedProduct) return false;
    if (normalizedModel && !(row.modelId ?? "").toLowerCase().includes(normalizedModel)) return false;
    if (normalizedRequest && !row.requestId.toLowerCase().includes(normalizedRequest)) return false;
    return true;
  });
  const attachmentEntries = await Promise.all(filteredRows.map(async row => [row.id, await buildStoredReviewAttachments(row.attachmentPathsJson)] as const));
  const attachmentsByResultId = new Map(attachmentEntries);

  const succeeded = rows.filter(row => row.status === "succeeded").length;
  const failed = rows.filter(row => row.status === "failed").length;
  const pending = rows.filter(row => row.status === "pending").length;

  return (
    <main className="min-h-dvh bg-[#101114] px-5 py-6 text-zinc-100 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Internal</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Generation Review</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Images from Prisma result URLs matched with generation prompts.
            </p>
            <InternalTabs active="review" />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm md:w-[360px]">
            <div className="rounded border border-emerald-400/20 bg-emerald-400/10 px-3 py-2">
              <div className="text-lg font-semibold">{succeeded}</div>
              <div className="text-xs text-emerald-200/80">succeeded</div>
            </div>
            <div className="rounded border border-red-400/20 bg-red-400/10 px-3 py-2">
              <div className="text-lg font-semibold">{failed}</div>
              <div className="text-xs text-red-200/80">failed</div>
            </div>
            <div className="rounded border border-amber-400/20 bg-amber-400/10 px-3 py-2">
              <div className="text-lg font-semibold">{pending}</div>
              <div className="text-xs text-amber-200/80">pending</div>
            </div>
          </div>
        </header>

        <form className="mt-5 grid gap-3 rounded border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[160px_160px_1fr_1fr_auto]">
          <label className="text-sm text-zinc-300">
            <span className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">Status</span>
            <select
              name="status"
              defaultValue={filters.status ?? "all"}
              className="w-full rounded border border-white/10 bg-[#17191f] px-3 py-2 text-sm text-zinc-100"
            >
              <option value="all">All</option>
              <option value="succeeded">Succeeded</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </label>
          <label className="text-sm text-zinc-300">
            <span className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">Product</span>
            <select
              name="product"
              defaultValue={filters.product ?? "all"}
              className="w-full rounded border border-white/10 bg-[#17191f] px-3 py-2 text-sm text-zinc-100"
            >
              <option value="all">All</option>
              <option value="name">Name</option>
              <option value="picture">Picture</option>
            </select>
          </label>
          <label className="text-sm text-zinc-300">
            <span className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">Model contains</span>
            <input
              name="model"
              defaultValue={filters.model ?? ""}
              placeholder="gemini-3"
              className="w-full rounded border border-white/10 bg-[#17191f] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
            />
          </label>
          <label className="text-sm text-zinc-300">
            <span className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">Request id contains</span>
            <input
              name="request"
              defaultValue={filters.request ?? ""}
              placeholder="cmom..."
              className="w-full rounded border border-white/10 bg-[#17191f] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
            />
          </label>
          <button className="self-end rounded bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-white">
            Apply
          </button>
        </form>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredRows.map(row => {
            const hasImage = Boolean(row.imageUrl && (isRemoteUrl(row.imageUrl) || fileSet.has(row.imageUrl)));
            const reviewAttachments = attachmentsByResultId.get(row.id) ?? [];
            return (
              <article key={row.id} className="flex flex-col rounded border border-white/10 bg-[#17191f] p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className={`rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                    row.status === "succeeded"
                      ? "bg-emerald-400/15 text-emerald-200"
                      : row.status === "failed"
                        ? "bg-red-400/15 text-red-200"
                        : "bg-amber-400/15 text-amber-200"
                  }`}>
                    {row.status}
                  </span>
                  <span className="text-[10px] text-zinc-500">{formatDate(row.createdAt)}</span>
                </div>

                <div className="mt-3 aspect-square overflow-hidden rounded bg-black/40">
                  {hasImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.imageUrl!} alt={`Generated draft ${row.variant}`} className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex h-full items-center justify-center px-5 text-center text-xs text-zinc-500">
                      {row.imageUrl ? "Image URL unavailable or local file missing" : "No image for this attempt"}
                    </div>
                  )}
                </div>

                <div className="mt-3 space-y-2 text-[11px] leading-snug text-zinc-300">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-zinc-100">{shortId(row.requestId)} / draft {row.variant}</span>
                    <span className="font-mono text-zinc-400">{seconds(row.durationMs)}</span>
                  </div>
                  <div className="truncate font-mono text-zinc-400" title={row.modelId ?? "n/a"}>{row.modelId || "n/a"}</div>
                  <div className="truncate text-zinc-300">
                    {row.request.productType} / {row.request.styleId} / {row.request.primaryMetal}
                    {row.request.secondaryMetal ? ` + ${row.request.secondaryMetal}` : ""} / {row.request.emblem}
                  </div>
                  {row.imageUrl && (
                    <a href={row.imageUrl} target="_blank" className="block truncate text-blue-300 hover:text-blue-200">
                      {row.imageUrl}
                    </a>
                  )}
                </div>

                <div className="mt-3">
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500">Customer Text</div>
                  <pre className="mt-1 max-h-20 overflow-auto whitespace-pre-wrap rounded bg-black/30 p-2 text-[11px] leading-snug text-zinc-100">{row.request.productType === "picture" ? row.request.uploadFileName ?? row.request.text : row.request.text}</pre>
                </div>

                {reviewAttachments.length > 0 && (
                  <div className="mt-3">
                    <div className="mb-2 text-[10px] uppercase tracking-wide text-zinc-500">Attached References</div>
                    <div className="grid grid-cols-3 gap-2">
                      {reviewAttachments.map(attachment => (
                        <a
                          key={`${attachment.kind}-${attachment.filePath}`}
                          href={attachment.src}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={attachment.filePath}
                          className="group min-w-0 rounded border border-white/10 bg-black/25 p-1 transition hover:border-white/25"
                        >
                          <div className="aspect-square overflow-hidden rounded bg-black/50">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={attachment.src} alt={attachment.label} className="h-full w-full object-contain" />
                          </div>
                          <div className="mt-1 truncate text-center text-[9px] uppercase tracking-wide text-zinc-500 group-hover:text-zinc-300">
                            {attachment.label}
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {row.error && (
                  <div className="mt-3">
                    <div className="text-[10px] uppercase tracking-wide text-red-300/80">Error</div>
                    <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap rounded border border-red-400/20 bg-red-400/10 p-2 text-[10px] leading-snug text-red-100">{row.error}</pre>
                  </div>
                )}

                <details className="mt-3 rounded border border-white/10 bg-black/20">
                  <summary className="cursor-pointer px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 hover:text-zinc-200">
                    Prompt
                  </summary>
                  <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap border-t border-white/10 p-2 font-mono text-[9px] leading-[1.35] text-zinc-300">{row.prompt}</pre>
                </details>
              </article>
            );
          })}
        </section>

        {filteredRows.length === 0 && (
          <div className="mt-6 rounded border border-white/10 bg-white/[0.03] p-8 text-center text-zinc-400">
            No generation rows match the current filters.
          </div>
        )}

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Internal</p>
              <h2 className="mt-1 text-xl font-semibold">Video Generations</h2>
            </div>
            <div className="text-xs text-zinc-500">{videos.length} recent videos</div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {videos.map(video => (
              <article key={video.id} className="rounded border border-white/10 bg-[#17191f] p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className={`rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                    video.status === "succeeded"
                      ? "bg-emerald-400/15 text-emerald-200"
                      : video.status === "failed"
                        ? "bg-red-400/15 text-red-200"
                        : "bg-amber-400/15 text-amber-200"
                  }`}>
                    {video.status}
                  </span>
                  <span className="text-[10px] text-zinc-500">{formatDate(video.createdAt)}</span>
                </div>

                <div className="mt-3 overflow-hidden rounded bg-black/40">
                  {video.videoUrl ? (
                    <video src={video.videoUrl} controls playsInline className="block w-full bg-black" />
                  ) : (
                    <div className="flex aspect-video items-center justify-center px-5 text-center text-xs text-zinc-500">
                      No video file yet
                    </div>
                  )}
                </div>

                <div className="mt-3 space-y-2 text-[11px] leading-snug text-zinc-300">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-zinc-100">{shortId(video.requestId)} / video</span>
                    <span className="font-mono text-zinc-400">{seconds(video.durationMs)}</span>
                  </div>
                  <div className="truncate font-mono text-zinc-400" title={video.modelId ?? "n/a"}>{video.modelId || "n/a"}</div>
                  <div className="truncate text-zinc-300">
                    {video.request.styleId} / {video.request.primaryMetal}
                    {video.request.secondaryMetal ? ` + ${video.request.secondaryMetal}` : ""} / {video.request.emblem}
                  </div>
                  <a href={video.sourceImageUrl} target="_blank" className="block truncate text-blue-300 hover:text-blue-200">
                    source: {video.sourceImageUrl}
                  </a>
                  {video.videoUrl && (
                    <a href={video.videoUrl} target="_blank" className="block truncate text-blue-300 hover:text-blue-200">
                      video: {video.videoUrl}
                    </a>
                  )}
                </div>

                {video.error && (
                  <div className="mt-3">
                    <div className="text-[10px] uppercase tracking-wide text-red-300/80">Error</div>
                    <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap rounded border border-red-400/20 bg-red-400/10 p-2 text-[10px] leading-snug text-red-100">{video.error}</pre>
                  </div>
                )}

                <details className="mt-3 rounded border border-white/10 bg-black/20">
                  <summary className="cursor-pointer px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 hover:text-zinc-200">
                    Video Prompt
                  </summary>
                  <pre className="max-h-[220px] overflow-auto whitespace-pre-wrap border-t border-white/10 p-2 font-mono text-[9px] leading-[1.35] text-zinc-300">{video.prompt}</pre>
                </details>
              </article>
            ))}
          </div>

          {videos.length === 0 && (
            <div className="mt-4 rounded border border-white/10 bg-white/[0.03] p-6 text-center text-zinc-400">
              No video generations yet.
            </div>
          )}
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Internal</p>
              <h2 className="mt-1 text-xl font-semibold">Quote Requests</h2>
            </div>
            <div className="text-xs text-zinc-500">{quoteRequests.length} recent quotes</div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {quoteRequests.map(quote => (
              <article key={quote.id} className="rounded border border-white/10 bg-[#17191f] p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded bg-blue-400/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-200">
                    {quote.status}
                  </span>
                  <span className="text-[10px] text-zinc-500">{formatDate(quote.createdAt)}</span>
                </div>

                <div className="mt-3 aspect-square overflow-hidden rounded bg-black/40">
                  {quote.designedImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={quote.designedImageUrl} alt={`Quote request ${shortId(quote.id)}`} className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex h-full items-center justify-center px-5 text-center text-xs text-zinc-500">
                      No designed image saved
                    </div>
                  )}
                </div>

                <div className="mt-3 space-y-2 text-[11px] leading-snug text-zinc-300">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-zinc-100">{shortId(quote.id)}</span>
                    <span className="text-zinc-400">{quote.generatedAt ? formatDate(quote.generatedAt) : "n/a"}</span>
                  </div>
                  <div className="rounded bg-black/25 p-2">
                    <div className="font-semibold text-zinc-100">{quote.customerName}</div>
                    <div className="text-zinc-400">{quote.customerPhone}</div>
                    <a href={`mailto:${quote.customerEmail}`} className="text-blue-300 hover:text-blue-200">{quote.customerEmail}</a>
                  </div>
                  <div className="text-zinc-300">
                    {quote.pendantFinish === "plain" ? (
                      <>
                        {quote.productType ?? "unknown"} / plain / {quote.styleId ?? "style n/a"} / {quote.plainColor ?? "color n/a"} / {quote.plainMetal ?? "metal n/a"}
                        {quote.plainKarat ? ` / ${quote.plainKarat}` : ""}
                        {quote.plainChain ? ` / ${quote.plainChain}` : ""}
                      </>
                    ) : (
                      <>
                        {quote.productType ?? "unknown"} / {quote.styleId ?? "style n/a"} / {quote.primaryMetal ?? "metal n/a"}
                        {quote.secondaryMetal ? ` + ${quote.secondaryMetal}` : ""} / {quote.emblem ?? "emblem n/a"} / {quote.diamondQuality ?? "diamond n/a"}
                        {quote.size ? ` / ${quote.size}` : ""}
                        {quote.metalType ? ` / ${quote.metalType}` : ""}
                        {quote.stoneType ? ` / ${quote.stoneType}` : ""}
                      </>
                    )}
                  </div>
                  {quote.text && (
                    <pre className="max-h-20 overflow-auto whitespace-pre-wrap rounded bg-black/30 p-2 text-[11px] leading-snug text-zinc-100">{quote.text}</pre>
                  )}
                  {quote.videoUrl && (
                    <a href={quote.videoUrl} target="_blank" className="block truncate text-blue-300 hover:text-blue-200">
                      video: {quote.videoUrl}
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>

          {quoteRequests.length === 0 && (
            <div className="mt-4 rounded border border-white/10 bg-white/[0.03] p-6 text-center text-zinc-400">
              No quote requests yet.
            </div>
          )}
        </section>

        {orphanFiles.length > 0 && (
          <section className="mt-8 rounded border border-white/10 bg-white/[0.03] p-4">
            <h2 className="text-sm font-semibold text-zinc-200">Files Without Matching Prisma Rows</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {orphanFiles.slice(0, 24).map(file => (
                <a key={file} href={file} target="_blank" className="group block">
                  <span className="block aspect-square overflow-hidden rounded bg-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={file} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                  </span>
                  <span className="mt-1 block truncate text-xs text-zinc-500">{path.basename(file)}</span>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
