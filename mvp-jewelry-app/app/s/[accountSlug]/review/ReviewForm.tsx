"use client";

import { useState } from "react";

export default function ReviewForm({ accountSlug }: { accountSlug: string }) {
  const [reviewerName, setReviewerName] = useState("");
  const [contactMode, setContactMode] = useState<"phone" | "instagram">("instagram");
  const [contactValue, setContactValue] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setSubmitting(true);

    const response = await fetch(`/api/storefront/${accountSlug}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reviewerName,
        reviewerPhone: contactMode === "phone" ? contactValue : "",
        reviewerInstagram: contactMode === "instagram" ? contactValue : "",
        rating,
        reviewText,
      }),
    });
    const json = await response.json().catch(() => ({}));
    setSubmitting(false);
    if (!response.ok) {
      setError(json.error ?? "Unable to submit review.");
      return;
    }

    setStatus("Thank you. Your review has been submitted.");
    setReviewerName("");
    setContactValue("");
    setRating(5);
    setReviewText("");
  }

  return (
    <form onSubmit={submit} className="mt-7 grid gap-6">
      <div className="rounded-3xl bg-[#211D18] p-5">
        <span className="text-[10px] font-black uppercase tracking-[0.28em] text-[#D3A84F]">Your rating</span>
        <div className="mt-5 flex justify-between gap-2">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
              onClick={() => setRating(star)}
              className={`flex h-11 w-11 items-center justify-center transition ${
                star <= rating
                  ? "text-[#D3A84F] drop-shadow-[0_0_12px_rgba(211,168,79,0.28)]"
                  : "text-[#4B4238] hover:text-[#8D8377]"
              }`}
            >
              <StarIcon filled={star <= rating} />
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs font-bold text-[#8D8377]">{rating} out of 5 stars</p>
      </div>

      <Field label="Your name" value={reviewerName} onChange={setReviewerName} placeholder="Enter your name" required />

      <div className="rounded-3xl bg-[#211D18] p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#D3A84F]">Contact</p>
        <p className="mt-2 text-xs leading-5 text-[#8D8377]">Enter your phone number or Instagram username.</p>
        <div className="mt-4 flex h-12 overflow-hidden rounded-2xl border border-[#342E26] bg-[#0E0C09]">
          <button
            type="button"
            aria-label="Use phone number"
            onClick={() => {
              setContactMode("phone");
              setContactValue("");
            }}
            className={`flex h-full w-12 items-center justify-center border-r border-[#342E26] transition ${contactMode === "phone" ? "bg-[#D3A84F] text-black" : "text-[#6F6559] hover:text-[#D3A84F]"}`}
          >
            <PhoneIcon />
          </button>
          <button
            type="button"
            aria-label="Use Instagram username"
            onClick={() => {
              setContactMode("instagram");
              setContactValue("");
            }}
            className={`flex h-full w-12 items-center justify-center border-r border-[#342E26] transition ${contactMode === "instagram" ? "bg-[#D3A84F] text-black" : "text-[#6F6559] hover:text-[#D3A84F]"}`}
          >
            <InstagramIcon />
          </button>
          <input
            value={contactValue}
            onChange={event => setContactValue(event.target.value)}
            placeholder={contactMode === "instagram" ? "@yourusername" : "+1 (555) 555-0123"}
            type={contactMode === "phone" ? "tel" : "text"}
            className="h-full min-w-0 flex-1 bg-transparent px-4 text-sm text-[#F5F0E8] outline-none placeholder:text-[#6F6559]"
          />
        </div>
      </div>

      <label>
        <span className="text-[10px] font-black uppercase tracking-[0.28em] text-[#D3A84F]">Your review</span>
        <textarea
          value={reviewText}
          onChange={event => setReviewText(event.target.value)}
          required
          rows={6}
          placeholder="Tell us about your experience..."
          className="mt-3 w-full resize-none rounded-2xl border border-[#342E26] bg-[#0E0C09] px-4 py-4 text-sm text-[#F5F0E8] outline-none placeholder:text-[#6F6559] focus:border-[#D3A84F]"
        />
      </label>

      {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p>}
      {status && <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{status}</p>}
      <button disabled={submitting} className="h-14 rounded-full bg-[#D3A84F] text-sm font-black uppercase tracking-[0.2em] text-black hover:bg-[#f1c96c] disabled:opacity-60">
        {submitting ? "Sending..." : "Send review"}
      </button>
    </form>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-10 w-10">
      <path
        d="m12 2.8 2.8 5.7 6.3.9-4.55 4.44 1.07 6.27L12 17.15 6.38 20.1l1.07-6.27L2.9 9.4l6.3-.9L12 2.8Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; required?: boolean }) {
  return (
    <label>
      <span className="text-[10px] font-black uppercase tracking-[0.28em] text-[#D3A84F]">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-3 h-12 w-full rounded-2xl border border-[#342E26] bg-[#0E0C09] px-4 text-sm text-[#F5F0E8] outline-none placeholder:text-[#6F6559] focus:border-[#D3A84F]"
      />
    </label>
  );
}

function PhoneIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" d="M6.6 3.8 9.2 3l2 4.8-1.7 1.1c.9 1.9 2.4 3.4 4.5 4.6l1.2-1.7 4.8 2.1-.8 2.7c-.3 1-1.2 1.6-2.2 1.5C9.5 17.5 4.8 12.8 4.2 5.3c-.1-1 .5-1.9 1.4-2.2Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5">
      <rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16.7" cy="7.3" r="1" fill="currentColor" />
    </svg>
  );
}
