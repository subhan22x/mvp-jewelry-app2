"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./StudioPage.module.css";
import ReelsCarousel, { GOLD, REELS, ReelVideo } from "./ReelsCarousel";

const BRAND_WORD = "Brand";
const POSTS_PER_MONTH = 30;
const CTA_SUB = "Your first week of reels is free. No filming, no editing, no contracts.";

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

// The studio landing body: hero carousel through the closing CTA. Rendered
// standalone at /studio (wrapped by StudioPage) and embedded inside the merged
// landing page's second pillar.
export default function StudioContent({ embedded = false }: { embedded?: boolean }) {
  return (
    <>
      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            {!embedded && (
              <div className={styles.eyebrow}>
                <span /> flawless · video engine
              </div>
            )}
            {!embedded && (
              <h1>
                Turn your
                <br />
                jewelry store
                <br />
                into a <span className={styles.script}>{BRAND_WORD}</span>
              </h1>
            )}
            <p className={styles.heroSub}>
              Studio-grade short-form videos, done for you. We turn amateur phone photos into scroll-stopping reels.
            </p>
            {!embedded && (
              <div className={styles.heroActions}>
                <Link href="/onboarding" className={styles.btnLg}>
                  Start free <span className={styles.arrow}>→</span>
                </Link>
                <a href="#how" className={styles.textLink}>
                  See how it works
                </a>
              </div>
            )}
            {!embedded && (
              <div className={styles.heroMeta}>
                <strong>{POSTS_PER_MONTH} posts / month</strong>
                <span>·</span>
                <span>0 hours editing</span>
              </div>
            )}
          </div>

          {/* Reels: infinite left-marching carousel */}
          <ReelsCarousel />
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
            Produce a month&apos;s content on autopilot and convert more through professional looking visuals.
          </p>
        </div>

        <div className={styles.transform}>
          {/* input */}
          <div className={styles.transformCol}>
            <div className={styles.productCard}>
              <Image
                src="/landing/product-photo-input.png"
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

      {/* CALENDAR (omitted in the embedded landing-page variant) */}
      {!embedded && (
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
      )}

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
    </>
  );
}
