"use client";

import { useEffect, useRef } from "react";
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

// 6-position ring for the hero carousel: enter(off-right) → 4 visible staircase
// slots → exit(off-left). Cards keep stable DOM identity and are animated by
// direct style mutation so the conveyor reads as endless with no visible jump.
const POS = [
  { left: "100%", h: 0.5, op: 0 }, // 0 enter (off right, hidden)
  { left: "78%", h: 0.61, op: 1 }, // 1 slot 3 (shortest visible)
  { left: "52%", h: 0.69, op: 1 }, // 2 slot 2
  { left: "26%", h: 0.82, op: 1 }, // 3 slot 1
  { left: "0%", h: 1.0, op: 1 }, //   4 slot 0 (tallest, 9:16, lead)
  { left: "-24%", h: 1.0, op: 0 } // 5 exit (off left, hidden)
];
const N = 6;
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
export default function ReelsCarousel({ className }: { className?: string }) {
  const reelsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = reelsRef.current;
    if (!root) return;
    const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-reel-card]"));
    if (cards.length < N) return;

    let offset = 0;
    let containerH = 0;
    let lefts = POS.map((p) => p.left);

    const apply = (animate: boolean, wrapCard: number) => {
      cards.forEach((el, i) => {
        const p = (((i + offset) % N) + N) % N;
        const pos = POS[p];
        const isLead = p === 4;
        const frame = el.querySelector<HTMLElement>("[data-reel-frame]");
        el.style.transition = i === wrapCard || !animate ? "none" : SMOOTH;
        el.style.left = lefts[p];
        el.style.height = containerH * pos.h + "px";
        el.style.opacity = String(pos.op);
        el.style.zIndex = String(p === 5 ? 0 : p);
        if (frame) {
          frame.style.background = isLead ? GOLD_BG : NEUTRAL_BG;
          frame.style.boxShadow = isLead ? GOLD_SHADOW : NEUTRAL_SHADOW;
        }
      });
    };

    const sizeContainer = () => {
      const rawWidth = getComputedStyle(root).getPropertyValue("--reel-w").trim();
      const frac = rawWidth.endsWith("%") ? parseFloat(rawWidth) / 100 : 0.22;
      // Distribute the 4 visible staircase slots across the track so the
      // rightmost card stays flush with the right edge at any card width —
      // wider cards tighten the spacing instead of overflowing the padding.
      const f = frac * 100;
      const track = 100 - f;
      lefts = ["100%", `${track}%`, `${(track * 2) / 3}%`, `${track / 3}%`, "0%", `${-f}%`];
      const cardW = frac * root.clientWidth;
      containerH = (cardW * 16) / 9; // leftmost (slot 0) is a true 9:16
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
  }, []);

  return (
    <div ref={reelsRef} className={`${styles.reels} ${className ?? ""}`}>
      {POS.map((pos, i) => (
        <div
          key={i}
          data-reel-card
          className={styles.reelCard}
          style={{
            left: pos.left,
            height: `${pos.h * 100}%`,
            opacity: pos.op,
            zIndex: i === 5 ? 0 : i
          }}
        >
          <div
            data-reel-frame
            className={styles.reelFrame}
            style={{
              background: i === 4 ? GOLD_BG : NEUTRAL_BG,
              boxShadow: i === 4 ? GOLD_SHADOW : NEUTRAL_SHADOW
            }}
          >
            <ReelVideo src={REELS[i % REELS.length]} className={styles.reelMedia} />
          </div>
        </div>
      ))}
    </div>
  );
}
