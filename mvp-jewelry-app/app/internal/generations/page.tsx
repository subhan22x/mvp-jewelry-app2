import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/server/db/client";

export const dynamic = "force-dynamic";

type SearchParams = {
  status?: string;
  model?: string;
  request?: string;
  product?: string;
};

const GENERATED_DIR = path.join(process.cwd(), "public", "generated");

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

export default async function InternalGenerationsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const [rows, generatedFiles] = await Promise.all([
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
            styleId: true,
            twoTone: true,
            primaryMetal: true,
            secondaryMetal: true,
            emblem: true,
            createdAt: true
          }
        }
      }
    }),
    listGeneratedFiles()
  ]);

  const normalizedStatus = searchParams.status?.toLowerCase();
  const normalizedModel = searchParams.model?.toLowerCase();
  const normalizedRequest = searchParams.request?.toLowerCase();
  const normalizedProduct = searchParams.product?.toLowerCase();
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
              Images from <code className="rounded bg-white/10 px-1.5 py-0.5">public/generated</code> matched with Prisma prompts.
            </p>
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
              defaultValue={searchParams.status ?? "all"}
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
              defaultValue={searchParams.product ?? "all"}
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
              defaultValue={searchParams.model ?? ""}
              placeholder="gemini-3"
              className="w-full rounded border border-white/10 bg-[#17191f] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
            />
          </label>
          <label className="text-sm text-zinc-300">
            <span className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">Request id contains</span>
            <input
              name="request"
              defaultValue={searchParams.request ?? ""}
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
            const hasImage = Boolean(row.imageUrl && fileSet.has(row.imageUrl));
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
                      {row.imageUrl ? "Image file missing from public/generated" : "No image for this attempt"}
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
