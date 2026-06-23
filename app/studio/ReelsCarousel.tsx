"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import styles from "./StudioPage.module.css";

export const GOLD = "#d4924a";

// Reel previews (9:16) reused for the hero carousel and the output cluster.
export const REELS = [
  "/landing/studio-preview-1.mp4",
  "/landing/studio-preview-2.mp4",
  "/landing/studio-preview-3.mp4",
  "/landing/studio-preview-4.mp4",
  "/landing/studio-preview-5.mp4",
  "/landing/studio-preview-6.mp4"
];

// Position rings for the hero carousel: enter(off-right) → visible staircase
// slots → exit(off-left). Cards keep stable DOM identity and are animated by
// direct style mutation so the conveyor reads as endless with no visible jump.
//
// POS_4 is the default (4 visible) used on /studio. POS_3 drops the rightmost
// slot and steps heights more gently, so the new landing-page banner shows
// three larger, clearer reels. The `lefts` values below are placeholders —
// sizeContainer() recomputes them from the real card width at runtime.
const POS_4 = [
  { left: "100%", h: 0.5, op: 0 }, // 0 enter (off right, hidden)
  { left: "78%", h: 0.61, op: 1 }, // 1 slot 3 (shortest visible)
  { left: "52%", h: 0.69, op: 1 }, // 2 slot 2
  { left: "26%", h: 0.82, op: 1 }, // 3 slot 1
  { left: "0%", h: 1.0, op: 1 }, //   4 slot 0 (tallest, 9:16, lead)
  { left: "-24%", h: 1.0, op: 0 } // 5 exit (off left, hidden)
];
const POS_3 = [
  { left: "100%", h: 0.62, op: 0 }, // 0 enter (off right, hidden)
  { left: "66%", h: 0.78, op: 1 }, //  1 slot 2 (shortest visible)
  { left: "33%", h: 0.89, op: 1 }, //  2 slot 1
  { left: "0%", h: 1.0, op: 1 }, //    3 slot 0 (tallest, 9:16, lead)
  { left: "-34%", h: 1.0, op: 0 } //   4 exit (off left, hidden)
];
const SMOOTH =
  "left .85s cubic-bezier(.65,0,.35,1), height .85s cubic-bezier(.65,0,.35,1), opacity .85s ease";

const GOLD_BG = `linear-gradient(160deg, ${GOLD}, rgba(232,176,106,0.25))`;
const NEUTRAL_BG = "linear-gradient(160deg, rgba(80,160,220,0.22), rgba(80,160,220,0.07))";
const GOLD_SHADOW = "0 22px 54px -18px rgba(212,146,74,0.55), 0 0 0 1px rgba(232,176,106,0.4)";
const NEUTRAL_SHADOW = "0 20px 50px -18px rgba(0,0,0,0.7)";

export function ReelVideo({ src, className }: { src: string; className: string }) {
  return (
    <video className={className} autoPlay loop muted playsInline preload="metadata">
      <source src={src} type="video/mp4" />
    </video>
  );
}

// Infinite left-marching staircase of reel previews. The leftmost (lead) slot is
// a true 9:16 with a gold frame; the rest step down in height to the right.
//
// `slots` picks the ring: 4 (default, /studio) or 3 (new landing-page banner,
// bigger reels). For a ring of length N the visible slots are indices 1..N-2,
// the lead (tallest, gold) slot is N-2, and N-1 is the off-screen exit.
export default function ReelsCarousel({
  className,
  slots = 4,
  reelWidth
}: {
  className?: string;
  slots?: 3 | 4;
  // Overrides the CSS --reel-w (card width as % of track). Set on .reels itself
  // so it wins over the module's default; inheriting from a parent would not.
  reelWidth?: string;
}) {
  const reelsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = reelsRef.current;
    if (!root) return;
    const POS = slots === 3 ? POS_3 : POS_4;
    const N = POS.length;
    const LEAD = N - 2; // tallest gold-framed slot
    const EXIT = N - 1; // off-screen recycling slot
    const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-reel-card]"));
    if (cards.length < N) return;

    let offset = 0;
    let containerH = 0;
    let lefts = POS.map((p) => p.left);

    const apply = (animate: boolean, wrapCard: number) => {
      cards.forEach((el, i) => {
        const p = (((i + offset) % N) + N) % N;
        const pos = POS[p];
        const isLead = p === LEAD;
        const frame = el.querySelector<HTMLElement>("[data-reel-frame]");
        el.style.transition = i === wrapCard || !animate ? "none" : SMOOTH;
        el.style.left = lefts[p];
        el.style.height = containerH * pos.h + "px";
        el.style.opacity = String(pos.op);
        el.style.zIndex = String(p === EXIT ? 0 : p);
        if (frame) {
          frame.style.background = isLead ? GOLD_BG : NEUTRAL_BG;
          frame.style.boxShadow = isLead ? GOLD_SHADOW : NEUTRAL_SHADOW;
        }
      });
    };

    const sizeContainer = () => {
      const rawWidth = getComputedStyle(root).getPropertyValue("--reel-w").trim();
      const frac = rawWidth.endsWith("%") ? parseFloat(rawWidth) / 100 : 0.22;
      // Distribute the visible staircase slots evenly across the track so the
      // rightmost card stays flush with the right edge at any card width —
      // wider cards tighten the spacing instead of overflowing the padding.
      const f = frac * 100;
      const track = 100 - f;
      const visible = N - 2; // slots 1..N-2 march left to the lead
      lefts = POS.map((_, p) => {
        if (p === 0) return "100%"; // enter
        if (p === EXIT) return `${-f}%`; // exit
        // visible slots: index 1 is rightmost, LEAD is leftmost (0%)
        return `${(track * (LEAD - p)) / (visible - 1)}%`;
      });
      const cardW = frac * root.clientWidth;
      containerH = (cardW * 16) / 9; // leftmost (lead) is a true 9:16
      root.style.height = containerH + "px";
      apply(false, -1);
    };

    sizeContainer();
    const onResize = () => sizeContainer();
    window.addEventListener("resize", onResize);

    const timer = window.setInterval(() => {
      offset++;
      // The recycling exit→enter card teleports across the row, but does so
      // off-screen (opacity 0), so skip its slide transition.
      const wrapCard = (((-offset) % N) + N) % N;
      apply(true, wrapCard);
    }, 2200);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [slots]);

  const POS = slots === 3 ? POS_3 : POS_4;
  const EXIT = POS.length - 1;
  const LEAD = POS.length - 2;
  return (
    <div
      ref={reelsRef}
      className={`${styles.reels} ${className ?? ""}`}
      style={reelWidth ? ({ ["--reel-w" as string]: reelWidth } as CSSProperties) : undefined}
    >
      {POS.map((pos, i) => (
        <div
          key={i}
          data-reel-card
          className={styles.reelCard}
          style={{
            left: pos.left,
            height: `${pos.h * 100}%`,
            opacity: pos.op,
            zIndex: i === EXIT ? 0 : i
          }}
        >
          <div
            data-reel-frame
            className={styles.reelFrame}
            style={{
              background: i === LEAD ? GOLD_BG : NEUTRAL_BG,
              boxShadow: i === LEAD ? GOLD_SHADOW : NEUTRAL_SHADOW
            }}
          >
            <ReelVideo src={REELS[i % REELS.length]} className={styles.reelMedia} />
          </div>
        </div>
      ))}
    </div>
  );
}
