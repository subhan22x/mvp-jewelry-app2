"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export default function BillingActionForm({ action, className, fields = {}, children }: {
  action: "/api/billing/checkout" | "/api/billing/portal";
  className?: string;
  fields?: Record<string, string>;
  children: ReactNode;
}) {
  const router = useRouter();
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(action, {
        method: "POST", body: new FormData(event.currentTarget),
        headers: { Accept: "application/json" }, signal: AbortSignal.timeout(40_000),
      });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error ?? "Unable to open billing. Please try again.");
      window.location.assign(data.url);
    } catch (cause) {
      setError(cause instanceof Error && cause.name === "Error" ? cause.message : "Unable to connect to billing. Please try again.");
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <form action={action} method="post" onSubmit={submit} className={className} aria-busy={pending}>
      {Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      <fieldset disabled={pending} className="min-w-0 border-0 p-0 disabled:opacity-60">{children}</fieldset>
      {pending && <p role="status" className="mt-2 text-xs text-[#AEB8D8]">Opening secure billing…</p>}
      {error && <div role="alert" className="mt-3 text-sm text-red-200">
        <p>{error}</p>
        <button type="button" onClick={() => router.refresh()} className="mt-2 underline">Refresh account</button>
      </div>}
    </form>
  );
}
