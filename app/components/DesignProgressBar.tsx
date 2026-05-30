const DESIGN_STEPS = ["Style", "Customize", "Review", "Quote"] as const;

type DesignProgressBarProps = {
  current: number;
  className?: string;
};

export default function DesignProgressBar({ current, className = "" }: DesignProgressBarProps) {
  const activeIndex = Math.max(0, Math.min(current, DESIGN_STEPS.length - 1));

  return (
    <div className={`flex w-[212px] flex-col gap-1.5 ${className}`}>
      <div className="grid grid-cols-4 items-center justify-items-center">
        {DESIGN_STEPS.map((label, index) => {
          const isActive = index === activeIndex;
          const isComplete = index < activeIndex;

          return (
            <div key={index} className="relative flex h-4 w-full items-center justify-center">
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute right-1/2 top-1/2 h-px w-full -translate-y-1/2"
                  style={{
                    background: index <= activeIndex ? "var(--theme-script)" : "var(--theme-text)",
                    opacity: index <= activeIndex ? 0.8 : 0.72
                  }}
                />
              )}
              <span
                aria-hidden="true"
                data-design-progress-step={label}
                data-active={isActive ? "true" : "false"}
                className="relative z-10 block rounded-full border"
                style={{
                  width: isActive ? 26 : 9,
                  height: 9,
                  background: isActive || isComplete ? "var(--theme-script)" : "var(--theme-text)",
                  borderColor: isActive || isComplete ? "var(--theme-script)" : "var(--theme-text)",
                  boxShadow: isActive ? "0 0 16px var(--theme-selected-glow)" : "none"
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-4 text-center">
        {DESIGN_STEPS.map((label, index) => (
          <span
            key={label}
            className="text-[10px] font-semibold leading-tight"
            style={{
              color: index === activeIndex ? "var(--theme-script)" : "var(--theme-text)"
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
