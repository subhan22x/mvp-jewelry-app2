"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import styles from "./StudioPage.module.css";

const GOLD = "#d4924a";
const BRAND_WORD = "Brand";
const POSTS_PER_MONTH = 30;
const CTA_SUB = "Your first week of reels is free. No filming, no editing, no contracts.";

// Reel previews (9:16) reused for the hero carousel and the output cluster.
const REELS = [
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

const REEL_TIMES = ["0:09", "0:08", "0:11", "0:12", "0:10", "0:07"];

const GOLD_BG = `linear-gradient(160deg, ${GOLD}, rgba(232,176,106,0.25))`;
const NEUTRAL_BG = "linear-gradient(160deg, rgba(80,160,220,0.22), rgba(80,160,220,0.07))";
const GOLD_SHADOW = "0 22px 54px -18px rgba(212,146,74,0.55), 0 0 0 1px rgba(232,176,106,0.4)";
const NEUTRAL_SHADOW = "0 20px 50px -18px rgba(0,0,0,0.7)";

function buildCalendar() {
  // 5-week grid (35 cells): blank lead-in, then days 1..30. Most days carry a
  // scheduled post (gold dot/fill); a few are emphasized "hero" reel days.
  const lead = 2;
  const daysInMonth = 30;
  const highlight = new Set([3, 9, 16, 23, 28]);
  const cells: { label: string; bg: string; fg: string; border: string }[] = [];
  for (let i = 0; i < 35; i++) {
    const day = i - lead + 1;
    if (day < 1 || day > daysInMonth) {
      cells.push({ label: "", bg: "transparent", fg: "transparent", border: "1px solid transparent" });
      continue;
    }
    const scheduled = day <= POSTS_PER_MONTH;
    if (highlight.has(day)) {
      cells.push({ label: "●", bg: GOLD, fg: "#030d1e", border: `1px solid ${GOLD}` });
    } else if (scheduled) {
      cells.push({
        label: "●",
        bg: "rgba(212,146,74,0.14)",
        fg: GOLD,
        border: "1px solid rgba(212,146,74,0.3)"
      });
    } else {
      cells.push({
        label: String(day),
        bg: "rgba(40,100,160,0.12)",
        fg: "#3a6a8a",
        border: "1px solid rgba(40,100,160,0.2)"
      });
    }
  }
  return cells;
}

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const CAL_CELLS = buildCalendar();

const STATS: { num: string; unit: string; label: string }[] = [
  { num: String(POSTS_PER_MONTH), unit: "", label: "reels published every month, on autopilot" },
  { num: "4", unit: "×", label: "more reach than a static photo feed" },
  { num: "0", unit: "hrs", label: "spent filming, editing or scheduling" },
  { num: "48", unit: "h", label: "from sign-up to your first posts going live" }
];

function ReelVideo({ src, className }: { src: string; className: string }) {
  return (
    <video className={className} autoPlay loop muted playsInline preload="metadata">
      <source src={src} type="video/mp4" />
    </video>
  );
}

export default function StudioPage({ className }: { className?: string }) {
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
    <main className={`${styles.page} ${className ?? ""}`}>
      {/* NAV */}
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo}>
          <Image src="/landing/vvs-design-logo.png" alt="VVS Design" width={148} height={40} priority />
        </Link>
        <div className={styles.navActions}>
          <Link href="/login" className={styles.login}>
            Log in
          </Link>
          <Link href="/onboarding" className={styles.btn}>
            Start free <span className={styles.arrow}>→</span>
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>
              <span /> flawless · video engine
            </div>
            <h1>
              Turn your
              <br />
              jewelry store
              <br />
              into a <span className={styles.script}>{BRAND_WORD}</span>
            </h1>
            <p className={styles.heroSub}>
              Studio-grade short-form video, done for you. We turn a single product photo into a month of
              scroll-stopping reels — and book them straight into your content calendar.
            </p>
            <div className={styles.heroActions}>
              <Link href="/onboarding" className={styles.btnLg}>
                Start free <span className={styles.arrow}>→</span>
              </Link>
              <a href="#how" className={styles.textLink}>
                See how it works
              </a>
            </div>
            <div className={styles.heroMeta}>
              <strong>{POSTS_PER_MONTH} posts / month</strong>
              <span>·</span>
              <span>0 hours editing</span>
            </div>
          </div>

          {/* Reels: infinite left-marching carousel */}
          <div ref={reelsRef} className={styles.reels}>
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
                <div className={styles.reelTime}>▶ {REEL_TIMES[i]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BAND 1 */}
      <section className={styles.band1}>
        <p>30 done-for-you IG creatives a month</p>
      </section>

      {/* HOW / TRANSFORM */}
      <section id="how" className={styles.how}>
        <div className={styles.howHead}>
          <div className={styles.eyebrow}>
            <span /> one photo in · a feed out
          </div>
          <h2>
            Post studio-grade media&nbsp;<span className={styles.script}>consistently</span>
          </h2>
          <p>
            Drop in a single product shot. Our jewelry-trained engine spins it into a week of motion — multiple
            hooks, angles, and edits, all on-brand.
          </p>
        </div>

        <div className={styles.transform}>
          {/* input */}
          <div className={styles.transformCol}>
            <div className={styles.productCard}>
              <Image
                src="/landing/hero-bg.jpg"
                alt="A single product photo"
                width={460}
                height={460}
                className={styles.productMedia}
              />
            </div>
            <span className={styles.colLabel}>1 product photo</span>
          </div>

          {/* arrow */}
          <div className={styles.transformArrow}>
            <svg width="64" height="22" viewBox="0 0 64 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M2 11 H56 M48 4 L58 11 L48 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* output cluster */}
          <div className={styles.transformCol}>
            <div className={styles.outCluster}>
              <div className={`${styles.outReel} ${styles.outLeft}`}>
                <ReelVideo src={REELS[0]} className={styles.outMedia} />
              </div>
              <div className={`${styles.outReel} ${styles.outRight}`}>
                <ReelVideo src={REELS[2]} className={styles.outMedia} />
              </div>
              <div className={`${styles.outReel} ${styles.outCenter}`}>
                <ReelVideo src={REELS[1]} className={styles.outMedia} />
                <div className={styles.outTime}>▶ live</div>
              </div>
            </div>
            <span className={styles.colLabel}>a week of reels</span>
          </div>
        </div>
      </section>

      {/* BAND 2 */}
      <section className={styles.band2}>
        <p>Post consistently, keep your growth on track</p>
      </section>

      {/* CALENDAR */}
      <section className={styles.calendar}>
        <div className={styles.calGrid}>
          <div className={styles.calCopy}>
            <div className={styles.eyebrow}>
              <span /> fully managed
            </div>
            <h2>
              We book your content <span className={styles.script}>calendar</span> for you
            </h2>
            <p>
              No more guessing what to post or when. We plan every slot, schedule it to the optimal time, and keep
              your feed alive — 30 days mapped out before the month even starts.
            </p>
            <div className={styles.calStats}>
              <div className={styles.calStat}>
                <strong>
                  {POSTS_PER_MONTH}
                  <em>×</em>
                </strong>
                <span>slots planned monthly</span>
              </div>
              <div className={styles.calStat}>
                <strong>
                  0<em>hrs</em>
                </strong>
                <span>of work on your end</span>
              </div>
            </div>
          </div>

          {/* calendar card */}
          <div className={styles.calCard}>
            <div className={styles.calCardHead}>
              <strong>This Month</strong>
              <span>● scheduled</span>
            </div>
            <div className={styles.calWeekdays}>
              {WEEKDAYS.map((d, i) => (
                <div key={i}>{d}</div>
              ))}
            </div>
            <div className={styles.calDays}>
              {CAL_CELLS.map((cell, i) => (
                <div
                  key={i}
                  className={styles.calCell}
                  style={{ background: cell.bg, color: cell.fg, border: cell.border }}
                >
                  {cell.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className={styles.stats}>
        <div className={styles.statsGrid}>
          {STATS.map((s, i) => (
            <div key={i} className={styles.stat}>
              <strong>
                {s.num}
                <em>{s.unit}</em>
              </strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <h2>
          Ready to turn your store into a <span className={styles.script}>{BRAND_WORD}</span>?
        </h2>
        <p>{CTA_SUB}</p>
        <div className={styles.ctaActions}>
          <Link href="/onboarding" className={styles.btnLg}>
            Start free <span className={styles.arrow}>→</span>
          </Link>
          <a href="mailto:hello@flawless.design" className={styles.textLink}>
            Book a demo
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <Link href="/" className={styles.footerLogo}>
          <Image src="/landing/vvs-design-logo.png" alt="VVS Design" width={130} height={35} />
        </Link>
        <div className={styles.footerCopy}>© 2026 flawless.design · All rights reserved</div>
      </footer>
    </main>
  );
}
