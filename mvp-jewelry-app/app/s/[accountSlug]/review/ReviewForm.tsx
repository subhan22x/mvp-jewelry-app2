"use client";

import { useState } from "react";

export default function ReviewForm({ accountSlug }: { accountSlug: string }) {
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerPhone, setReviewerPhone] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [reviewerInstagram, setReviewerInstagram] = useState("");
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
      body: JSON.stringify({ reviewerName, reviewerPhone, reviewerEmail, reviewerInstagram, rating, reviewText }),
    });
    const json = await response.json().catch(() => ({}));
    setSubmitting(false);
    if (!response.ok) {
      setError(json.error ?? "Unable to submit review.");
      return;
    }

    setStatus("Thank you. Your review has been submitted.");
    setReviewerName("");
    setReviewerPhone("");
    setReviewerEmail("");
    setReviewerInstagram("");
    setRating(5);
    setReviewText("");
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-4">
      <Field label="Name" value={reviewerName} onChange={setReviewerName} placeholder="Your name" required />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Phone" value={reviewerPhone} onChange={setReviewerPhone} placeholder="Optional" />
        <Field label="Email" value={reviewerEmail} onChange={setReviewerEmail} placeholder="Optional" type="email" />
        <Field label="Instagram" value={reviewerInstagram} onChange={setReviewerInstagram} placeholder="Optional" />
      </div>
      <div>
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8D8377]">Rating</span>
        <div className="mt-2 flex gap-2">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`flex h-11 w-11 items-center justify-center rounded-full border text-lg ${star <= rating ? "border-[#D3A84F] bg-[#D3A84F] text-black" : "border-[#342E26] bg-[#211D18] text-[#8D8377]"}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      <label>
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8D8377]">Review</span>
        <textarea
          value={reviewText}
          onChange={event => setReviewText(event.target.value)}
          required
          rows={6}
          placeholder="Tell us about your experience..."
          className="mt-2 w-full rounded-2xl border border-[#342E26] bg-[#120B07] px-4 py-3 text-sm text-[#F5F0E8] outline-none placeholder:text-[#8D8377] focus:border-[#D3A84F]"
        />
      </label>
      <p className="text-xs leading-5 text-[#8D8377]">Enter at least one contact method: phone, email, or Instagram.</p>
      {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p>}
      {status && <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{status}</p>}
      <button disabled={submitting} className="h-12 rounded-full bg-[#D3A84F] text-sm font-black text-black hover:bg-[#f1c96c] disabled:opacity-60">
        {submitting ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; required?: boolean }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8D8377]">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-12 w-full rounded-2xl border border-[#342E26] bg-[#120B07] px-4 text-sm text-[#F5F0E8] outline-none placeholder:text-[#8D8377] focus:border-[#D3A84F]"
      />
    </label>
  );
}
