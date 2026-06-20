"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TOUR_STEPS, TOUR_STEP_EVENT, TOUR_STORAGE_KEY } from "@/src/lib/tour/steps";
import TourBubble from "./TourBubble";

type TourState = number | "done" | null;

function parseStoredStep(raw: string | null): TourState {
  if (raw === null) return null;
  if (raw === "done") return "done";
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 && parsed < TOUR_STEPS.length ? parsed : null;
}

function broadcastStep(step: number | "done") {
  window.dispatchEvent(new CustomEvent(TOUR_STEP_EVENT, { detail: step }));
}

export default function GuidedTour() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState<TourState>(null);

  useEffect(() => {
    if (searchParams?.get("tour") !== "1") return;
    localStorage.setItem(TOUR_STORAGE_KEY, "0");
    setStepIndex(0);
    broadcastStep(0);
    router.replace(pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    setStepIndex(parseStoredStep(localStorage.getItem(TOUR_STORAGE_KEY)));
  }, [pathname]);

  function writeStep(next: number | "done") {
    localStorage.setItem(TOUR_STORAGE_KEY, String(next));
    setStepIndex(next);
    broadcastStep(next);
  }

  if (stepIndex === null || stepIndex === "done") return null;
  const step = TOUR_STEPS[stepIndex];
  if (!step) return null;

  const routeMatch = pathname === step.route || pathname.startsWith(`${step.route}/`);
  if (!routeMatch) return null;

  function advance() {
    if (typeof stepIndex !== "number") return;
    const next = stepIndex + 1;
    if (next >= TOUR_STEPS.length) {
      writeStep("done");
      return;
    }
    const nextStep = TOUR_STEPS[next];
    writeStep(next);
    if (nextStep.route !== step.route) router.push(nextStep.route);
  }

  function back() {
    if (typeof stepIndex !== "number") return;
    const previous = Math.max(0, stepIndex - 1);
    const previousStep = TOUR_STEPS[previous];
    writeStep(previous);
    if (previousStep.route !== step.route) router.push(previousStep.route);
  }

  function skip() {
    writeStep("done");
  }

  function finish() {
    writeStep("done");
  }

  return (
    <TourBubble
      body={step.body}
      placement={step.placement}
      isLast={step.isLast}
      onNext={step.isLast ? finish : advance}
      onBack={back}
      onSkip={skip}
      stepIndex={stepIndex}
      totalSteps={TOUR_STEPS.length}
    />
  );
}
