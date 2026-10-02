"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function SignupCreditRefresh({ remaining, pending }: { remaining: number; pending: number }) {
  const router = useRouter();
  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    const check = async () => {
      if (running || document.hidden) return;
      running = true;
      try {
        const response = await fetch("/api/billing/signup-credits", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        if (data.remaining !== remaining || data.pending !== pending) router.refresh();
      } catch { /* Retry on the next visible poll. */ }
      finally { running = false; }
    };
    const timer = setInterval(check, 3000);
    return () => { clearInterval(timer); controller.abort(); };
  }, [remaining, pending, router]);
  return null;
}
