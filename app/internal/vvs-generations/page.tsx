import { redirect } from "next/navigation";
import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { canManageVvsPipelineSettings } from "@/src/lib/vvs-studio/pipeline-settings";
import { createPresignedR2GetUrl, parseR2Key } from "@/src/lib/storage/r2";
import {
  deriveElapsedMs,
  distinctProviders,
  distinctStages,
  filterVvsGenerations,
  formatDuration,
  formatProviderPayloadJson,
  isDisplayableImageUrl,
  normalizeFilter,
  resolveDisplayablePreviewUrl,
  summarizeVvsStatuses,
  type VvsMonitorFilters,
  type VvsStatusSummary
} from "@/src/lib/vvs-generations-monitor/filters";

export const dynamic = "force-dynamic";

type SearchParams = {
  status?: string;
  stage?: string;
  provider?: string;
  model?: string;
  q?: string;
};

const JOB_LIMIT = 100;

function formatDate(value: Date | null | undefined) {
  if (!value) return "n/a";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}

function shortId(id: string) {
  return id.slice(0, 8);
}

function statusBadgeClass(status: string) {
  if (status === "succeeded") return "bg-emerald-400/15 text-emerald-200";
  if (status === "failed") return "bg-red-400/15 text-red-200";
  return "bg-amber-400/15 text-amber-200";
}

function shootStatusBadgeClass(status: string) {
  if (status === "image_succeeded" || status === "image_finalized" || status === "video_succeeded") {
    return "bg-emerald-400/15 text-emerald-200";
  }
  if (status === "failed") return "bg-red-400/15 text-red-200";
  if (status === "archived") return "bg-zinc-400/15 text-zinc-300";
  return "bg-amber-400/15 text-amber-200";
}

function filterChipClass(active: boolean) {
  return `rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
    active
      ? "border-amber-300/50 bg-amber-300/15 text-amber-100"
      : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-100"
  }`;
}

function selectClass() {
  return "w-full rounded border border-white/10 bg-[#17191f] px-3 py-2 text-sm text-zinc-100";
}

function inputClass() {
  return "w-full rounded border border-white/10 bg-[#17191f] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600";
}

function MetaItem({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  const display = value == null || value === "" || value === false ? "—" : value;
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <span className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</span>
      <span className={`text-right text-[11px] text-zinc-200 ${mono ? "font-mono" : ""}`}>{display}</span>
    </div>
  );
}

type MonitorUpload = { imageUrl: string };

type MonitorJob = {
  shoot: { Uploads: MonitorUpload[] };
};

async function resolveR2UploadPreviewUrls(jobs: MonitorJob[]): Promise<Map<string, string>> {
  const r2Refs = new Set<string>();
  for (const job of jobs) {
    for (const upload of job.shoot.Uploads) {
      if (parseR2Key(upload.imageUrl)) r2Refs.add(upload.imageUrl);
    }
  }
  if (r2Refs.size === 0) return new Map();

  const entries = await Promise.all(
    [...r2Refs].map(async ref => {
      const key = parseR2Key(ref);
      if (!key) return [ref, null] as const;
      try {
        return [ref, await createPresignedR2GetUrl({ key })] as const;
      } catch {
        return [ref, null] as const;
      }
    })
  );
  const map = new Map<string, string>();
  for (const [ref, url] of entries) {
    if (url) map.set(ref, url);
  }
  return map;
}

function PageHeader({ adminAllowed, summary }: { adminAllowed: boolean; summary: VvsStatusSummary | null }) {
  return (
    <header className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Internal</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">VVS Studio Image Generations</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Read-only monitor of the latest {JOB_LIMIT} VVS Studio image generation jobs, with prompts, provider payloads, and source uploads.
        </p>
        <nav className="mt-5 flex flex-wrap gap-2">
          <a href="/internal/generations" className={filterChipClass(false)}>
            Generation Review
          </a>
          <a href="/internal/vvs-generations" className={filterChipClass(true)} aria-current="page">
            VVS Generations
          </a>
        </nav>
      </div>
      {adminAllowed && summary && (
        <div className="grid grid-cols-4 gap-2 text-center text-sm md:w-[460px]">
          <div className="rounded border border-white/10 bg-white/[0.03] px-3 py-2">
            <div className="text-lg font-semibold">{summary.total}</div>
            <div className="text-xs text-zinc-400">total</div>
          </div>
          <div className="rounded border border-emerald-400/20 bg-emerald-400/10 px-3 py-2">
            <div className="text-lg font-semibold">{summary.succeeded}</div>
            <div className="text-xs text-emerald-200/80">succeeded</div>
          </div>
          <div className="rounded border border-red-400/20 bg-red-400/10 px-3 py-2">
            <div className="text-lg font-semibold">{summary.failed}</div>
            <div className="text-xs text-red-200/80">failed</div>
          </div>
          <div className="rounded border border-amber-400/20 bg-amber-400/10 px-3 py-2">
            <div className="text-lg font-semibold">{summary.pending}</div>
            <div className="text-xs text-amber-200/80">pending</div>
          </div>
        </div>
      )}
    </header>
  );
}

function AccessDeniedPanel({ email }: { email: string | null }) {
  return (
    <section className="mt-6 rounded border border-amber-400/30 bg-amber-400/10 p-6 text-sm text-amber-100">
      <h2 className="text-base font-semibold text-amber-50">Admin access required</h2>
      <p className="mt-2 max-w-2xl leading-relaxed text-amber-100/90">
        You are signed in as <span className="font-mono">{email ?? "unknown"}</span>, but this monitor is restricted to emails listed in <span className="font-mono">VVS_INTERNAL_ADMIN_EMAILS</span>. Contact an administrator to be added.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a href="/owner" className="rounded border border-amber-300/40 bg-amber-300/10 px-4 py-2 text-xs font-semibold text-amber-100 hover:border-amber-200">
          Back to owner dashboard
        </a>
        <a href="/internal/generations" className="rounded border border-white/10 bg-black/20 px-4 py-2 text-xs font-semibold text-zinc-300 hover:border-white/25">
          Generation Review
        </a>
      </div>
    </section>
  );
}

export default async function VvsGenerationsMonitorPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const owner = await getOwnerContext();
  if (!owner) redirect("/login?next=/internal/vvs-generations");

  if (!canManageVvsPipelineSettings(owner.email)) {
    return (
      <main className="min-h-dvh bg-[#101114] px-5 py-6 text-zinc-100 md:px-8">
        <div className="mx-auto max-w-7xl">
          <PageHeader adminAllowed={false} summary={null} />
          <AccessDeniedPanel email={owner.email} />
        </div>
      </main>
    );
  }

  const filters = await searchParams;
  const jobs = await prisma.vvsStudioImageGeneration.findMany({
    orderBy: [{ createdAt: "desc" }, { variant: "asc" }],
    take: JOB_LIMIT,
    include: {
      account: { select: { id: true, name: true, slug: true } },
      shoot: {
        select: {
          id: true,
          pieceType: true,
          visualStyle: true,
          mood: true,
          aspectRatio: true,
          metalType: true,
          goldColor: true,
          diamondWeight: true,
          engravingText: true,
          priceLabel: true,
          stoneSetting: true,
          caption: true,
          status: true,
          createdAt: true,
          Uploads: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              angle: true,
              imageUrl: true,
              width: true,
              height: true,
              fileSize: true,
              normalizedContentType: true,
              originalContentType: true,
              createdAt: true
            }
          }
        }
      }
    }
  });

  const stages = distinctStages(jobs);
  const providers = distinctProviders(jobs);
  const summary = summarizeVvsStatuses(jobs);

  const monitorFilters: VvsMonitorFilters = {
    status: filters.status,
    stage: filters.stage,
    provider: filters.provider,
    model: filters.model,
    q: filters.q
  };
  const filteredJobs = filterVvsGenerations(jobs, monitorFilters);
  const now = new Date();

  const r2PreviewUrls = await resolveR2UploadPreviewUrls(filteredJobs);

  const activeStatus = normalizeFilter(filters.status) || "all";
  const activeStage = normalizeFilter(filters.stage) || "all";
  const activeProvider = normalizeFilter(filters.provider) || "all";

  return (
    <main className="min-h-dvh bg-[#101114] px-5 py-6 text-zinc-100 md:px-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader adminAllowed summary={summary} />

        <form className="mt-5 grid gap-3 rounded border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[150px_160px_140px_1fr_1fr_auto]">
          <label className="text-sm text-zinc-300">
            <span className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">Status</span>
            <select name="status" defaultValue={activeStatus} className={selectClass()}>
              <option value="all">All</option>
              <option value="succeeded">Succeeded</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </label>
          <label className="text-sm text-zinc-300">
            <span className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">Stage</span>
            <select name="stage" defaultValue={activeStage} className={selectClass()}>
              <option value="all">All</option>
              {stages.map(stage => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
          </label>
          <label className="text-sm text-zinc-300">
            <span className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">Provider</span>
            <select name="provider" defaultValue={activeProvider} className={selectClass()}>
              <option value="all">All</option>
              {providers.map(provider => (
                <option key={provider} value={provider}>{provider}</option>
              ))}
            </select>
          </label>
          <label className="text-sm text-zinc-300">
            <span className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">Model contains</span>
            <input
              name="model"
              defaultValue={filters.model ?? ""}
              placeholder="gpt-image-1"
              className={inputClass()}
            />
          </label>
          <label className="text-sm text-zinc-300">
            <span className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">Search (id, shoot, prompt, engraving)</span>
            <input
              name="q"
              defaultValue={filters.q ?? ""}
              placeholder="gen id / shoot id / text"
              className={inputClass()}
            />
          </label>
          <button className="self-end rounded bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-white">
            Apply
          </button>
        </form>

        {filteredJobs.length === 0 ? (
          <div className="mt-6 rounded border border-white/10 bg-white/[0.03] p-8 text-center text-zinc-400">
            No VVS image generation jobs match the current filters.
          </div>
        ) : (
          <section className="mt-6 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {filteredJobs.map(job => {
              const elapsedMs = job.status === "pending" ? deriveElapsedMs(job.startedAt, now) : null;
              const payloadFormatted = formatProviderPayloadJson(job.providerPayloadJson);
              const inputManifestFormatted = formatProviderPayloadJson(job.inputManifestJson);
              const hasImage = isDisplayableImageUrl(job.imageUrl);
              return (
                <article key={job.id} className="flex flex-col rounded border border-white/10 bg-[#17191f] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusBadgeClass(job.status)}`}>
                        {job.status}
                      </span>
                      {job.stage && (
                        <span className="rounded bg-white/5 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-300">
                          {job.stage}
                        </span>
                      )}
                      <span className="rounded bg-white/5 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                        v{job.variant}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500">{formatDate(job.createdAt)}</span>
                  </div>

                  <div className="mt-3 aspect-square overflow-hidden rounded bg-black/40">
                    {hasImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={job.imageUrl!} alt={`VVS generation ${shortId(job.id)}`} className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex h-full items-center justify-center px-5 text-center text-xs text-zinc-500">
                        {job.imageUrl ? "Image URL unavailable" : "No image for this job"}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 divide-y divide-white/5 text-[11px] leading-snug text-zinc-300">
                    <MetaItem label="Job id" value={shortId(job.id)} mono />
                    <MetaItem label="Pipeline run" value={job.jobId ? shortId(job.jobId) : null} mono />
                    <MetaItem label="Shoot id" value={shortId(job.shootId)} mono />
                    <MetaItem label="Account" value={job.account ? `${job.account.name} / ${job.account.slug}` : job.accountId} />
                    <MetaItem label="Style key" value={job.styleKey} mono />
                    <MetaItem label="Provider" value={job.provider} />
                    <MetaItem label="Model" value={job.modelId} mono />
                    <MetaItem label="Profile" value={job.providerProfileId ? `${job.providerProfileId}${job.providerProfileVersion ? ` v${job.providerProfileVersion}` : ""}` : null} mono />
                    <MetaItem label="Provider job" value={job.providerJobId} mono />
                    <MetaItem label="Source gen" value={job.sourceImageGenerationId ? shortId(job.sourceImageGenerationId) : null} mono />
                    <MetaItem label="Output role" value={job.outputRole} mono />
                    <MetaItem label="Retain until" value={formatDate(job.retentionExpiresAt)} />
                    <MetaItem label="Prompt ver" value={job.promptVersion} mono />
                    <MetaItem label="Started" value={formatDate(job.startedAt)} />
                    <MetaItem label="Completed" value={formatDate(job.completedAt)} />
                    <MetaItem
                      label="Duration"
                      value={typeof job.durationMs === "number"
                        ? formatDuration(job.durationMs)
                        : elapsedMs !== null ? `${formatDuration(elapsedMs)} elapsed` : "n/a"}
                      mono
                    />
                  </div>

                  {hasImage && (
                    <a href={job.imageUrl!} target="_blank" rel="noopener noreferrer" className="mt-3 block truncate text-[11px] text-blue-300 hover:text-blue-200">
                      {job.imageUrl}
                    </a>
                  )}

                  {job.error && (
                    <div className="mt-3">
                      <div className="text-[10px] uppercase tracking-wide text-red-300/80">Error</div>
                      <pre className="mt-1 max-h-28 overflow-auto whitespace-pre-wrap rounded border border-red-400/20 bg-red-400/10 p-2 text-[10px] leading-snug text-red-100">{job.error}</pre>
                    </div>
                  )}

                  <details className="mt-3 rounded border border-white/10 bg-black/20">
                    <summary className="cursor-pointer px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 hover:text-zinc-200">
                      Prompt
                    </summary>
                    <pre className="max-h-[360px] select-text overflow-auto whitespace-pre-wrap border-t border-white/10 p-2 font-mono text-[10px] leading-[1.4] text-zinc-200">{job.prompt}</pre>
                  </details>

                  {payloadFormatted && (
                    <details className="mt-2 rounded border border-white/10 bg-black/20">
                      <summary className="cursor-pointer px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 hover:text-zinc-200">
                        Provider payload
                      </summary>
                      <pre className="max-h-[320px] select-text overflow-auto whitespace-pre-wrap border-t border-white/10 p-2 font-mono text-[10px] leading-[1.4] text-zinc-300">{payloadFormatted}</pre>
                    </details>
                  )}

                  {inputManifestFormatted && (
                    <details className="mt-2 rounded border border-white/10 bg-black/20">
                      <summary className="cursor-pointer px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 hover:text-zinc-200">
                        Step inputs
                      </summary>
                      <pre className="max-h-[320px] select-text overflow-auto whitespace-pre-wrap border-t border-white/10 p-2 font-mono text-[10px] leading-[1.4] text-zinc-300">{inputManifestFormatted}</pre>
                    </details>
                  )}

                  <details className="mt-2 rounded border border-white/10 bg-black/20" open>
                    <summary className="cursor-pointer px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 hover:text-zinc-200">
                      Shoot inputs
                    </summary>
                    <div className="divide-y divide-white/5 border-t border-white/10 px-2 py-1 text-[11px] text-zinc-300">
                      <MetaItem label="Shoot status" value={<span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${shootStatusBadgeClass(job.shoot.status)}`}>{job.shoot.status}</span>} />
                      <MetaItem label="Piece type" value={job.shoot.pieceType} />
                      <MetaItem label="Visual style" value={job.shoot.visualStyle} />
                      <MetaItem label="Mood" value={job.shoot.mood} />
                      <MetaItem label="Aspect ratio" value={job.shoot.aspectRatio} />
                      <MetaItem label="Metal" value={job.shoot.metalType} />
                      <MetaItem label="Gold color" value={job.shoot.goldColor} />
                      <MetaItem label="Diamond weight" value={job.shoot.diamondWeight} />
                      <MetaItem label="Stone setting" value={job.shoot.stoneSetting} />
                      <MetaItem label="Engraving" value={job.shoot.engravingText} mono />
                      <MetaItem label="Price label" value={job.shoot.priceLabel} />
                      <MetaItem label="Caption" value={job.shoot.caption} />
                      <MetaItem label="Shoot created" value={formatDate(job.shoot.createdAt)} />
                    </div>
                  </details>

                  {job.shoot.Uploads.length > 0 && (
                    <div className="mt-3">
                      <div className="mb-2 text-[10px] uppercase tracking-wide text-zinc-500">
                        Source uploads ({job.shoot.Uploads.length})
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {job.shoot.Uploads.map(upload => {
                          const previewUrl = resolveDisplayablePreviewUrl(upload.imageUrl, r2PreviewUrls);
                          const dimensions = upload.width && upload.height ? `${upload.width}×${upload.height}` : "—";
                          const sizeLabel = upload.fileSize ? ` · ${Math.round(upload.fileSize / 1024)}KB` : "";
                          if (previewUrl) {
                            return (
                              <a
                                key={upload.id}
                                href={previewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`${upload.angle} · ${dimensions}`}
                                className="group min-w-0 rounded border border-white/10 bg-black/25 p-1 transition hover:border-white/25"
                              >
                                <div className="aspect-square overflow-hidden rounded bg-black/50">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={previewUrl} alt={`${upload.angle} source`} className="h-full w-full object-contain" />
                                </div>
                                <div className="mt-1 truncate text-center text-[9px] uppercase tracking-wide text-zinc-500 group-hover:text-zinc-300">
                                  {upload.angle}
                                </div>
                                <div className="truncate text-center text-[9px] text-zinc-600">
                                  {dimensions}{sizeLabel}
                                </div>
                              </a>
                            );
                          }
                          return (
                            <div
                              key={upload.id}
                              className="group min-w-0 rounded border border-white/10 bg-black/25 p-1"
                              title={`${upload.angle} · ${dimensions}`}
                            >
                              <div className="flex aspect-square items-center justify-center rounded bg-black/50">
                                <span className="text-[9px] text-zinc-600">No preview</span>
                              </div>
                              <div className="mt-1 truncate text-center text-[9px] uppercase tracking-wide text-zinc-500">
                                {upload.angle}
                              </div>
                              <div className="truncate text-center text-[9px] text-zinc-600">
                                {dimensions}{sizeLabel}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
