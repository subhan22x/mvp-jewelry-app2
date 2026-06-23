"use client";

type Props = {
  body: string;
  placement: "top" | "bottom" | "center";
  isLast?: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  stepIndex: number;
  totalSteps: number;
};

export default function TourBubble({ body, placement, isLast, onNext, onBack, onSkip, stepIndex, totalSteps }: Props) {
  return (
    <div className="tour-root" role="dialog" aria-modal="true" aria-label={`Product tour step ${stepIndex + 1} of ${totalSteps}`}>
      <div className="tour-backdrop" />
      <div className={`tour-container tour-${placement}`}>
        <div className={`tour-bubble tour-tail-${placement}`}>
          <p>{body}</p>
        </div>
        <div className="tour-controls">
          <button type="button" className={`tour-back ${stepIndex === 0 ? "tour-control-hidden" : ""}`} onClick={onBack}>
            ← Back
          </button>
          <span className="tour-progress">{stepIndex + 1} / {totalSteps}</span>
          <button type="button" className="tour-next" onClick={onNext}>
            {isLast ? "Go to dashboard →" : "Next →"}
          </button>
        </div>
        {!isLast && <button type="button" className="tour-skip" onClick={onSkip}>Skip tour</button>}
      </div>
      <style>{`
        .tour-backdrop{position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,.5);backdrop-filter:saturate(.8)}
        .tour-container{position:fixed;z-index:9999;width:min(88vw,330px);display:flex;flex-direction:column;align-items:stretch;font-family:var(--font-figtree),sans-serif}
        .tour-top{top:max(80px,calc(env(safe-area-inset-top) + 54px));left:50%;transform:translateX(-50%)}
        .tour-bottom{bottom:max(120px,calc(env(safe-area-inset-bottom) + 94px));left:50%;transform:translateX(-50%)}
        .tour-center{top:50%;left:50%;transform:translate(-50%,-50%)}
        .tour-bubble{position:relative;align-self:center;width:min(100%,280px);padding:20px 24px;border-radius:18px;background:#2196f3;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.3)}
        .tour-bubble p{margin:0;font-size:20px;font-weight:700;line-height:1.4;letter-spacing:-.015em}
        .tour-tail-bottom:after{content:"";position:absolute;left:18px;bottom:-13px;border-top:16px solid #2196f3;border-right:17px solid transparent}
        .tour-tail-top:before{content:"";position:absolute;left:18px;top:-13px;border-bottom:16px solid #2196f3;border-right:17px solid transparent}
        .tour-controls{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;margin-top:18px}
        .tour-controls button,.tour-skip{font-family:inherit;cursor:pointer}
        .tour-back{justify-self:start;border:0;background:none;padding:9px 0;color:rgba(255,255,255,.72);font-size:14px;font-weight:700}
        .tour-next{justify-self:end;white-space:nowrap;border:0;border-radius:999px;background:#fff;padding:11px 17px;color:#14202a;font-size:14px;font-weight:800;box-shadow:0 5px 15px rgba(0,0,0,.24)}
        .tour-progress{color:rgba(255,255,255,.55);font-size:11px;font-weight:700;letter-spacing:.08em}
        .tour-skip{align-self:center;margin-top:8px;border:0;background:none;padding:5px;color:rgba(255,255,255,.58);font-size:12px;font-weight:600;text-decoration:underline;text-underline-offset:3px}
        .tour-control-hidden{visibility:hidden}
        @media(max-width:420px){.tour-container{width:calc(100vw - 40px)}.tour-bubble{width:100%;max-width:280px}.tour-bubble p{font-size:18px}.tour-next{padding:10px 14px;font-size:13px}}
      `}</style>
    </div>
  );
}
