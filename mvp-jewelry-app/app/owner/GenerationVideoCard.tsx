import GenerateVideoButton from "./GenerateVideoButton";

type GenerationVideoCardProps = {
  row: {
    id: string;
    variant: number;
    imageUrl: string | null;
    status: string;
    createdAt: Date;
    request: {
      text: string;
      productType: string;
      uploadFileName?: string | null;
      styleId: string;
      Videos: Array<{
        id: string;
        sourceResultId: string | null;
        status: string;
      }>;
    };
  };
};

function formatDate(value: Date | null) {
  if (!value) return "n/a";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

function statusClass(status: string) {
  if (status === "sent") return "border-emerald-300/30 bg-emerald-400/10 text-emerald-200";
  if (status === "failed") return "border-red-300/30 bg-red-400/10 text-red-200";
  if (status === "succeeded") return "border-blue-300/30 bg-blue-400/10 text-blue-200";
  return "border-[#f7bc5f]/40 bg-[#1D120C]/90 text-[#f7bc5f]";
}

export default function GenerationVideoCard({ row }: GenerationVideoCardProps) {
  const videoJobsForImage = row.request.Videos.filter(video => video.sourceResultId === row.id);
  const completedCount = videoJobsForImage.filter(video => video.status === "succeeded").length;
  const title = row.request.productType === "picture" ? row.request.uploadFileName ?? row.request.text : row.request.text;

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-white/5 bg-[#17191F] p-3 transition hover:bg-white/[0.02]">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black">
          {row.imageUrl ? (
            <img src={row.imageUrl} alt={`${row.request.text} generation`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-white/30">No image</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h4 className="truncate text-[15px] font-semibold text-[#e1e2ec]">{title}</h4>
            <span className={`flex-shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium ${statusClass(row.status)}`}>{row.status}</span>
          </div>
          <p className="mt-1 truncate text-[12px] text-[#8c909f]">
            Style: {row.request.styleId} / Draft {row.variant} / {formatDate(row.createdAt)}
          </p>
        </div>
        {row.imageUrl ? (
          <a
            href={row.imageUrl}
            target="_blank"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/5 bg-[#1d2027] text-[#e1e2ec] transition hover:bg-white/10"
            aria-label="View generation"
          >
            &gt;
          </a>
        ) : (
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/5 bg-[#1d2027] text-[#8c909f]">-</span>
        )}
      </div>
      <GenerateVideoButton
        resultId={row.id}
        attemptCount={videoJobsForImage.length}
        completedCount={completedCount}
        disabled={!row.imageUrl || row.status !== "succeeded"}
      />
    </div>
  );
}
