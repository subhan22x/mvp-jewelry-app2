import Link from "next/link";
import DesignProgressBar from "./DesignProgressBar";

type DesignStepHeaderProps = {
  current: number;
  /** Render a back link to this href. */
  backHref?: string;
  /** Render a back button that calls this handler (for in-page step flows). */
  onBack?: () => void;
};

function BackArrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

const backButtonClass =
  "absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/35 text-[var(--theme-text)] transition hover:border-white/45";

/**
 * Shared design-wizard header: back control pinned top-left, with the progress
 * bar and store logo centered in the full width so they stay aligned across
 * screen sizes regardless of whether a back button is present.
 */
export default function DesignStepHeader({ current, backHref, onBack }: DesignStepHeaderProps) {
  return (
    <div className="relative mb-8 flex min-h-10 w-full flex-col items-center">
      {backHref ? (
        <Link href={backHref} aria-label="Back" className={backButtonClass}>
          <BackArrow />
        </Link>
      ) : onBack ? (
        <button type="button" onClick={onBack} aria-label="Back" className={backButtonClass}>
          <BackArrow />
        </button>
      ) : null}
      <DesignProgressBar current={current} />
    </div>
  );
}
