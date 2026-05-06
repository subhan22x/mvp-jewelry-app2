'use client';

import { useState } from 'react';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';

type Props = {
  requestId: string | null;
  onSubmitted: (lead: { leadId: string; name: string; phone: string; email: string }) => void;
};

export default function LeadCaptureModal({ requestId, onSubmitted }: Props) {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: requestId ?? undefined, name, email, phone }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Something went wrong. Please try again.');
      }
      const data = await res.json().catch(() => ({}));
      onSubmitted({ leadId: data.leadId, name, phone, email });
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
    >
      <div className="w-full max-w-sm rounded-3xl border border-[#C9943B]/60 bg-black/90 px-6 py-8 shadow-[0_32px_64px_rgba(0,0,0,0.7)]">
        <h2 id="lead-modal-title" className="mb-1 text-center text-xl font-semibold text-white">
          To continue, please enter
        </h2>
        <p className="mb-6 text-center text-sm text-white/50">Your designs will be ready in moments</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="lead-name" className="text-xs font-medium uppercase tracking-wider text-white/60">
              Name
            </label>
            <input
              id="lead-name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              className="rounded-2xl border border-white/15 bg-black/45 px-4 py-3 text-base text-white placeholder-white/30 outline-none transition focus:border-white/40"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="lead-phone" className="text-xs font-medium uppercase tracking-wider text-white/60">
              Phone number
            </label>
            <PhoneInput
              inputProps={{ id: 'lead-phone', required: true, autoComplete: 'tel' }}
              defaultCountry="us"
              value={phone}
              onChange={setPhone}
              style={
                {
                  '--react-international-phone-background-color': 'rgba(0,0,0,0.45)',
                  '--react-international-phone-border-color': 'rgba(255,255,255,0.15)',
                  '--react-international-phone-text-color': '#ffffff',
                  '--react-international-phone-selected-dropdown-item-background-color': 'rgba(255,255,255,0.1)',
                  '--react-international-phone-dropdown-item-background-color': '#111111',
                  '--react-international-phone-flag-width': '20px',
                  '--react-international-phone-flag-height': '16px',
                  width: '100%',
                  borderRadius: '1rem',
                  overflow: 'hidden',
                } as React.CSSProperties
              }
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="lead-email" className="text-xs font-medium uppercase tracking-wider text-white/60">
              Email address
            </label>
            <input
              id="lead-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="rounded-2xl border border-white/15 bg-black/45 px-4 py-3 text-base text-white placeholder-white/30 outline-none transition focus:border-white/40"
            />
          </div>

          {error && (
            <p role="alert" className="text-center text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-2xl bg-[#C9943B] px-5 py-3 text-base font-semibold text-black transition hover:bg-[#F1B45A] disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'submit'}
          </button>
        </form>
      </div>
    </div>
  );
}
