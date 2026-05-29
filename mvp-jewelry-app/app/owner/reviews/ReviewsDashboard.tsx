"use client";

import { useMemo, useState } from "react";

type ReviewStatus = "published" | "pending" | "hidden";

type Review = {
  id: string;
  reviewerName: string;
  reviewerPhone: string | null;
  reviewerEmail: string | null;
  reviewerInstagram: string | null;
  rating: number;
  text: string;
  status: ReviewStatus;
  createdAt: string;
};

const STATUS_FILTERS: Array<{ value: "all" | ReviewStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "pending", label: "Pending" },
  { value: "hidden", label: "Hidden" },
];
const RATING_FILTERS = [5, 4, 3, 2, 1];

function countByStatus(reviews: Review[], status: "all" | ReviewStatus) {
  if (status === "all") return reviews.length;
  return reviews.filter(review => review.status === status).length;
}

function averageRating(reviews: Review[]) {
  if (!reviews.length) return 0;
  return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
}

function reviewUrl(accountSlug: string) {
  if (typeof window === "undefined") return `https://www.vvslink.com/${accountSlug}/review`;
  return `${window.location.origin}/s/${accountSlug}/review`;
}

function whatsappMessage(url: string, clientName: string) {
  const greeting = clientName.trim() ? `Hey ${clientName.trim()}!` : "Hey!";
  return `${greeting} I'd love to hear your feedback. Leave a review here: ${url} - takes 30 seconds 🙏`;
}

export default function ReviewsDashboard({ accountSlug, reviews }: { accountSlug: string; reviews: Review[] }) {
  const [enabled, setEnabled] = useState(true);
  const [status, setStatus] = useState<"all" | ReviewStatus>("all");
  const [rating, setRating] = useState<number | "all">("all");
  const [query, setQuery] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);

  const filteredReviews = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return reviews.filter(review => {
      const statusMatch = status === "all" || review.status === status;
      const ratingMatch = rating === "all" || review.rating === rating;
      const queryMatch = !normalizedQuery || `${review.reviewerName} ${review.text} ${review.reviewerPhone ?? ""} ${review.reviewerEmail ?? ""} ${review.reviewerInstagram ?? ""}`.toLowerCase().includes(normalizedQuery);
      return statusMatch && ratingMatch && queryMatch;
    });
  }, [query, rating, reviews, status]);

  const avg = averageRating(reviews);
  const published = countByStatus(reviews, "published");
  const pending = countByStatus(reviews, "pending");
  const hidden = countByStatus(reviews, "hidden");

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[28px] font-black tracking-tight text-white md:text-[32px]">Reviews</h1>
        <button onClick={() => setRequestOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-[#f7bc5f] px-5 py-3 text-sm font-black text-black hover:bg-[#ffd88a]">
          <MessageIcon />
          Request a Review
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex min-h-28 items-center justify-between rounded-xl border border-white/5 bg-[#17191F] p-5">
          <div className="flex items-center gap-4">
            <IconBubble><StarIcon /></IconBubble>
            <div>
              <h2 className="font-bold text-white">Enable Reviews</h2>
              <p className="mt-1 text-sm text-[#8c909f]">Show the reviews section on your public page.</p>
            </div>
          </div>
          <button
            type="button"
            aria-pressed={enabled}
            onClick={() => setEnabled(value => !value)}
            className={`relative h-7 w-12 rounded-full transition ${enabled ? "bg-[#f7bc5f]" : "bg-white/10"}`}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-black transition ${enabled ? "right-1" : "left-1"}`} />
          </button>
        </div>

        <div className="flex min-h-28 items-center justify-between rounded-xl border border-white/5 bg-[#17191F] p-5">
          <div className="flex items-center gap-4">
            <IconBubble><ShieldIcon /></IconBubble>
            <div>
              <h2 className="font-bold text-white">Approve Before Publishing</h2>
              <p className="mt-1 text-sm text-[#8c909f]">Upgrade to PRO to moderate reviews.</p>
            </div>
          </div>
          <button className="rounded-full border border-[#f7bc5f]/40 px-4 py-2 text-xs font-black text-[#f7bc5f] hover:bg-[#f7bc5f]/10">
            PRO - Upgrade →
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-xl border border-[#f7bc5f]/25 bg-[#17191F] p-5">
          <div className="flex min-h-20 flex-col items-center justify-center text-center">
            <span className="text-4xl text-[#f7bc5f]">★</span>
            <p className="mt-2 text-sm text-[#8c909f]">{reviews.length ? `${avg.toFixed(1)} average rating` : "No reviews yet"}</p>
          </div>
          <div className="mt-5 grid gap-3">
            {RATING_FILTERS.map(star => {
              const count = reviews.filter(review => review.rating === star).length;
              const width = reviews.length ? `${(count / reviews.length) * 100}%` : "0%";
              return (
                <div key={star} className="grid grid-cols-[20px_1fr_24px] items-center gap-3 text-xs text-[#8c909f]">
                  <span>{star}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-[#f7bc5f]" style={{ width }} />
                  </div>
                  <span className="text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricCard value={reviews.length} label="Total" caption="All reviews" />
          <MetricCard value={published} label="Published" caption="Visible now" />
          <MetricCard value={hidden} label="Hidden" caption="Hidden from public" />
          <MetricCard value={pending} label="Pending" caption="Auto-publish off" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <label className="relative block">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8c909f]"><SearchIcon /></span>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search by reviewer or review text..."
            className="h-11 w-full rounded-xl border border-white/5 bg-[#17191F] pl-11 pr-4 text-sm text-white outline-none placeholder:text-[#8c909f] focus:border-[#f7bc5f]"
          />
        </label>
        <select className="h-11 rounded-xl border border-white/5 bg-[#17191F] px-4 text-sm text-white outline-none focus:border-[#f7bc5f]">
          <option>Newest first</option>
          <option>Oldest first</option>
          <option>Highest rated</option>
          <option>Lowest rated</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(filter => (
          <button
            key={filter.value}
            onClick={() => setStatus(filter.value)}
            className={`rounded-full px-4 py-2 text-xs font-bold ${status === filter.value ? "bg-[#f7bc5f] text-black" : "bg-[#17191F] text-[#8c909f]"}`}
          >
            {filter.label} ({countByStatus(reviews, filter.value)})
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setRating("all")} className={`rounded-full px-4 py-2 text-xs font-bold ${rating === "all" ? "bg-[#f7bc5f] text-black" : "bg-[#17191F] text-[#8c909f]"}`}>All</button>
        {RATING_FILTERS.map(star => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className={`rounded-full px-4 py-2 text-xs font-bold ${rating === star ? "bg-[#f7bc5f] text-black" : "bg-[#17191F] text-[#8c909f]"}`}
          >
            {star} <span className="text-[#f7bc5f]">★</span>
          </button>
        ))}
      </div>

      <div className="min-h-52">
        {filteredReviews.length > 0 ? (
          <div className="grid gap-3">
            {filteredReviews.map(review => (
              <article key={review.id} className="rounded-xl border border-white/10 bg-[#17191F] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-white">{review.reviewerName}</h3>
                    <p className="mt-1 text-sm text-[#f7bc5f]">{"★".repeat(review.rating)}<span className="text-[#383b44]">{"★".repeat(5 - review.rating)}</span></p>
                    <p className="mt-2 text-xs text-[#8c909f]">
                      {[review.reviewerPhone, review.reviewerEmail, review.reviewerInstagram ? `@${review.reviewerInstagram}` : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold capitalize text-[#999]">{review.status}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#c2c6d6]">{review.text}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex min-h-52 flex-col items-center justify-center text-center">
            <span className="text-5xl text-[#f7bc5f]">★</span>
            <p className="mt-4 text-sm text-[#8c909f]">No reviews match your filters.</p>
          </div>
        )}
      </div>

      {requestOpen && <RequestReviewPane accountSlug={accountSlug} onClose={() => setRequestOpen(false)} />}
    </section>
  );
}

function RequestReviewPane({ accountSlug, onClose }: { accountSlug: string; onClose: () => void }) {
  const [clientName, setClientName] = useState("");
  const [clientWhatsapp, setClientWhatsapp] = useState("");
  const url = reviewUrl(accountSlug);
  const message = whatsappMessage(url, clientName);
  const whatsappHref = `https://wa.me/${clientWhatsapp.replace(/[^\d]/g, "")}?text=${encodeURIComponent(message)}`;

  async function copyLink() {
    await navigator.clipboard?.writeText(url);
  }

  async function shareLink() {
    if (navigator.share) {
      await navigator.share({ title: "Review link", text: message, url });
      return;
    }
    await copyLink();
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-sm">
      <button aria-label="Close request review pane" onClick={onClose} className="absolute inset-0 cursor-default" />
      <div className="relative mx-auto w-full max-w-[680px] overflow-hidden rounded-2xl border border-[#f7bc5f]/20 bg-[#17191F] text-[#e1e2ec] shadow-2xl shadow-black/60">
        <div className="h-1.5 bg-gradient-to-r from-[#7b4a13] via-[#f7bc5f] to-[#7b4a13]" />
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full border border-white/10 px-3 py-1 text-xs text-[#8c909f] hover:bg-white/5 hover:text-white">Close</button>
        <div className="px-5 py-6 sm:px-8">
          <div className="mx-auto mb-6 h-1.5 w-24 rounded-full bg-white/10" />
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f7bc5f]">Review Link</p>
          <h2 className="mt-3 text-2xl font-bold text-white">Request a Review</h2>
          <p className="mt-2 text-sm text-[#8c909f]">Send your client a ready-to-share review link.</p>

          <div className="mt-8 grid gap-5">
            <Field label="Client Name" value={clientName} onChange={setClientName} placeholder="Optional" />
            <Field label="Client WhatsApp" value={clientWhatsapp} onChange={setClientWhatsapp} placeholder="Optional" />
            <ReadonlyField label="Review URL" value={url} />
            <label>
              <span className="text-sm font-semibold text-[#e1e2ec]">WhatsApp message preview</span>
              <textarea
                readOnly
                value={message}
                className="mt-3 min-h-28 w-full rounded-xl border border-white/10 bg-[#101114] px-3 py-3 text-sm leading-6 text-[#e1e2ec] outline-none"
              />
            </label>
          </div>

          <a href={whatsappHref} target="_blank" rel="noreferrer" className="mt-5 flex h-12 items-center justify-center gap-2 rounded-full bg-[#f7bc5f] text-sm font-black text-black hover:bg-[#ffd88a]">
            <MessageIcon />
            Send on WhatsApp
          </a>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <button onClick={copyLink} className="flex h-10 items-center justify-center gap-2 rounded-full border border-white/10 text-sm font-bold text-[#e1e2ec] hover:bg-white/5">
              <CopyIcon />
              Copy Link
            </button>
            <button onClick={shareLink} className="flex h-10 items-center justify-center gap-2 rounded-full border border-white/10 text-sm font-bold text-[#e1e2ec] hover:bg-white/5">
              <ShareIcon />
              Share Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ value, label, caption }: { value: number; label: string; caption: string }) {
  return (
    <div className="flex min-h-28 flex-col items-center justify-center rounded-xl border border-white/5 bg-[#17191F] p-4 text-center">
      <span className="text-2xl font-black text-white">{value || "0"}</span>
      <p className="mt-2 text-sm text-[#8c909f]">{label}</p>
      <p className="mt-1 text-xs text-[#8c909f]">{caption}</p>
    </div>
  );
}

function IconBubble({ children }: { children: React.ReactNode }) {
  return <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f7bc5f]/10 text-[#f7bc5f]">{children}</div>;
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label>
      <span className="text-sm font-semibold text-[#e1e2ec]">{label}</span>
      <input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="mt-3 h-11 w-full rounded-xl border border-white/10 bg-[#101114] px-3 text-sm text-[#e1e2ec] outline-none placeholder:text-[#8c909f] focus:border-[#f7bc5f]" />
    </label>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <label>
      <span className="text-sm font-semibold text-[#e1e2ec]">{label}</span>
      <input readOnly value={value} className="mt-3 h-11 w-full rounded-xl border border-white/10 bg-[#101114] px-3 text-sm text-[#e1e2ec] outline-none" />
    </label>
  );
}

function StarIcon() {
  return <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5"><path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9L12 3Z" /></svg>;
}

function ShieldIcon() {
  return <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5"><path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 3 5 6v5c0 4.5 2.7 8.3 7 10 4.3-1.7 7-5.5 7-10V6l-7-3Z" /></svg>;
}

function SearchIcon() {
  return <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4"><path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" /></svg>;
}

function MessageIcon() {
  return <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4"><path fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h6M6.5 19.5 4 21V5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H9l-2.5 3.5Z" /></svg>;
}

function CopyIcon() {
  return <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4"><path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M8 8h10v12H8zM6 16H4V4h12v2" /></svg>;
}

function ShareIcon() {
  return <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4"><path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M18 8a3 3 0 1 0-2.8-4M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm12 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM8.7 16.5l6.6-3.9M8.7 19.5l6.6 3.9" /></svg>;
}
