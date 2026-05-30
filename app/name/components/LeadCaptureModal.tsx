'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'react-international-phone/style.css';

const PhoneInput = dynamic(
  () => import('react-international-phone').then(m => m.PhoneInput),
  { ssr: false }
);

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
  const [progress, setProgress] = useState(18);

  useEffect(() => {
    const id = window.setInterval(() => {
      setProgress(value => {
        if (value >= 88) return 88;
        const next = value + Math.round(3 + Math.random() * 7);
        return Math.min(next, 88);
      });
    }, 950);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const loadingSteps = [
    'Analyzing jewelry geometry',
    'Mapping pendant lettering',
    'Applying metal and stone details',
    'Rendering design drafts'
  ];
  const activeStepIndex = progress < 36 ? 0 : progress < 58 ? 1 : progress < 78 ? 2 : 3;

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
      aria-label="To continue, please enter"
      className="fixed inset-0 z-50 overflow-hidden bg-[#201006] text-white backdrop-blur-md"
    >
      <div className="min-h-dvh bg-[radial-gradient(circle_at_top,#b6782e_0%,#7a421b_44%,#210f07_100%)]">
        <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-4 sm:px-8 sm:py-10">
          <section className="flex flex-col items-center text-center">
            <div className="relative h-20 w-20 sm:h-36 sm:w-36">
              <div className="absolute inset-0 rounded-full border-[5px] border-[#f6bd4f]/25 sm:border-[7px]" />
              <div className="absolute inset-0 animate-spin rounded-full border-[5px] border-transparent border-r-[#f6bd4f] border-t-[#f6bd4f] sm:border-[7px]" />
              <div className="absolute inset-0 flex items-center justify-center text-3xl text-[#f6bd4f] sm:text-5xl">✦</div>
            </div>

            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:mt-10 sm:text-4xl">
              Generating...
            </h2>
            <p className="mt-1 text-base text-white/58 sm:mt-3 sm:text-xl">Creating your custom pendant design</p>

            <div className="mt-5 w-full sm:mt-10">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/18 sm:h-2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#f8c75b] via-[#f5b842] to-[#ffe08a] transition-[width] duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-left text-sm text-white/55 sm:mt-4 sm:text-lg">
                <span>Preparing pendant drafts</span>
                <span className="font-semibold text-[#f8c75b]">{progress}%</span>
              </div>
            </div>

            <div className="mt-4 w-full space-y-2 text-left sm:mt-9 sm:space-y-4">
              {loadingSteps.map((step, index) => {
                const complete = index < activeStepIndex;
                const active = index === activeStepIndex;
                return (
                  <div
                    key={step}
                    className={`flex items-center gap-3 text-base sm:gap-4 sm:text-xl ${complete ? 'text-white' : active ? 'text-[#f8c75b]' : 'text-white/35'}`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold sm:h-9 sm:w-9 sm:text-base ${
                        complete
                          ? 'bg-[#f6bd4f] text-[#241005]'
                          : active
                            ? 'border-4 border-[#f6bd4f]/40 bg-[#f6bd4f]/15 sm:border-[6px]'
                            : 'bg-white/15'
                      }`}
                    >
                      {complete ? '✓' : null}
                    </span>
                    <span>{step}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="-mx-5 mt-5 flex-1 rounded-t-[1.5rem] bg-black/58 px-5 pb-5 pt-5 shadow-[0_-24px_70px_rgba(0,0,0,0.42)] sm:-mx-8 sm:mt-12 sm:rounded-t-[2rem] sm:px-8 sm:pb-10 sm:pt-9">
            <h3 className="text-center text-2xl font-bold tracking-tight text-white sm:text-3xl">
              To continue, please enter
            </h3>
            <p className="mt-1 text-center text-sm text-white/58 sm:mt-3 sm:text-lg">Your designs will be ready in moments</p>

            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3 sm:mt-9 sm:gap-5">
              <div className="flex flex-col gap-1.5 sm:gap-2">
                <label htmlFor="lead-name" className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e7bd78] sm:text-sm">
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
                  className="rounded-2xl border border-[#b98038]/70 bg-black/70 px-4 py-3 text-base text-white placeholder-white/30 outline-none transition focus:border-[#f6bd4f] sm:px-5 sm:py-4 sm:text-lg"
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:gap-2">
                <label htmlFor="lead-phone" className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e7bd78] sm:text-sm">
                  Phone number
                </label>
                <PhoneInput
                  inputProps={{ id: 'lead-phone', required: true, autoComplete: 'tel' }}
                  defaultCountry="us"
                  value={phone}
                  onChange={setPhone}
                  style={
                    {
                      '--react-international-phone-background-color': 'rgba(0,0,0,0.7)',
                      '--react-international-phone-border-color': 'rgba(185,128,56,0.7)',
                      '--react-international-phone-text-color': '#ffffff',
                      '--react-international-phone-selected-dropdown-item-background-color': 'rgba(246,189,79,0.14)',
                      '--react-international-phone-dropdown-item-background-color': '#111111',
                      '--react-international-phone-country-selector-background-color-hover': 'rgba(246,189,79,0.14)',
                      '--react-international-phone-flag-width': '22px',
                      '--react-international-phone-flag-height': '16px',
                      width: '100%',
                      borderRadius: '1rem',
                      overflow: 'hidden',
                    } as React.CSSProperties
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:gap-2">
                <label htmlFor="lead-email" className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e7bd78] sm:text-sm">
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
                  className="rounded-2xl border border-[#b98038]/70 bg-black/70 px-4 py-3 text-base text-white placeholder-white/30 outline-none transition focus:border-[#f6bd4f] sm:px-5 sm:py-4 sm:text-lg"
                />
              </div>

              {error && (
                <p role="alert" className="text-center text-sm text-red-300">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 rounded-2xl bg-gradient-to-r from-[#f5b83f] to-[#e39b22] px-5 py-3 text-base font-bold text-[#201006] shadow-[0_10px_28px_rgba(0,0,0,0.28)] transition hover:from-[#ffd166] hover:to-[#f0ad2f] disabled:opacity-50 sm:mt-4 sm:py-4 sm:text-lg"
              >
                {submitting ? 'Submitting…' : 'submit'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
