"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function BillingReturnStatus({ sessionId }: { sessionId?: string }) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [waiting, setWaiting] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let checks = 0;
    setWaiting(true);
    async function check() {
      try {
        const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : "";
        const response = await fetch(`/api/billing/status${query}`, { cache: "no-store", signal: controller.signal });
        if (response.ok && (await response.json()).ready) {
          router.replace("/owner/account");
          router.refresh();
          return;
        }
      } catch { /* Keep a bounded retry window for delayed webhook delivery. */ }
      if (controller.signal.aborted) return;
      if (++checks >= 30) { setWaiting(false); return; }
      timer = setTimeout(check, 2000);
    }
    void check();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [sessionId, attempt, router]);

  return <div role="status" className="mb-8 rounded-md border border-[#D1B873]/30 bg-[#2c2412] px-4 py-3 text-sm text-[#F4D38A]">
    <p>{waiting ? "Confirming your subscription. This page will update when your access is ready." : "Your subscription confirmation is taking longer than usual. Check again before starting another checkout, or contact support."}</p>
    {!waiting && <button type="button" onClick={() => setAttempt(value => value + 1)} className="mt-2 font-semibold underline">Check again</button>}
  </div>;
}
