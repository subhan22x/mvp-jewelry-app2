"use client";

const STEPS = ["Capture", "Details", "Theme", "Image", "Video"];

export default function StepProgress({ current }: { current: number }) {
  const clampedCurrent = Math.max(0, Math.min(current, STEPS.length - 1));

  return (
    <div className="mx-auto flex w-[230px] flex-col gap-1.5">
      <div className="grid grid-cols-5 items-center justify-items-center">
        {STEPS.map((_, index) => (
          <div key={index} className="relative flex h-3 w-full items-center justify-center">
            {index > 0 && (
              <span
                aria-hidden="true"
                className="absolute right-1/2 top-1/2 h-px w-full -translate-y-1/2"
                style={{
                  background: index <= clampedCurrent ? "#D4A85366" : "#35353d",
                }}
              />
            )}
            <span
              aria-hidden="true"
              className="relative z-10 block h-2 rounded-full"
              style={{
                width: index === clampedCurrent ? 28 : 8,
                background: index <= clampedCurrent ? "#D4A853" : "#35353d",
                transition: "background-color 160ms ease",
              }}
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-5 text-center">
        {STEPS.map((label, index) => (
          <span
            key={label}
            style={{
              color: index === clampedCurrent ? "#D4A853" : "#606068",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 11,
              lineHeight: "14px",
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
