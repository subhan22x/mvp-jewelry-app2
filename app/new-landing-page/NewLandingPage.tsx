"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import StudioContent from "../studio/StudioContent";
import ReelsCarousel from "../studio/ReelsCarousel";
import studioStyles from "../studio/StudioPage.module.css";

export default function NewLandingPage({ className }: { className?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const featureRefs = useRef<Array<HTMLElement | null>>([]);

  // Scroll-driven feature phone screen (IntersectionObserver, mirrors old landing)
  useEffect(() => {
    if (open !== 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setStep(Number((visible.target as HTMLElement).dataset.feature));
      },
      { rootMargin: "-34% 0px -34% 0px", threshold: [0, 0.2, 0.6] }
    );
    featureRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [open]);

  const toggle = (i: number) => {
    setOpen((o) => (o === i ? null : i));
    setStep(0);
  };

  const rows = (i: number) => (open === i ? "1fr" : "0fr");

  // Per-pillar radial gradients (ported from the Figma stops: bright core →
  // dark mid at 23% → transparent at 80%, glowing up from the bottom-centre).
  // The horizontal radius is kept far larger than the vertical so the contour
  // stays a flat, wide glow band at any aspect ratio — on a narrow mobile box a
  // near-circular radial would otherwise read as a hard semicircle/dome edge.
  const pillarGradient = (core: string, mid: string) =>
    `radial-gradient(135% 78% at 50% 100%, ${core} 0%, ${mid} 23%, rgba(35,35,35,0) 80%)`;
  const GRAD_DESIGN = pillarGradient("#b86e32", "#462b16");
  const GRAD_VIDEO = pillarGradient("#3271b8", "#162146");
  const GRAD_GROWTH = pillarGradient("#32b8b1", "#16462e");

  const ctaBtn = (color: string, shadow: string, text: string, label: string) => (
    <button
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "inherit",
        fontWeight: 600,
        fontSize: 15,
        border: "none",
        cursor: "pointer",
        borderRadius: 999,
        padding: "13px 26px",
        color: text,
        background: color,
        boxShadow: shadow,
      }}
    >
      {label} <span>→</span>
    </button>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        html, body { margin: 0; padding: 0; }
        body { background: #0a0907; }
        *, *::before, *::after { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        ::selection { background: #d4924a; color: #1a0e04; }
        .nl-features-grid { display: grid; grid-template-columns: auto minmax(0,1fr) 34px; gap: clamp(22px,6vw,80px); align-items: start; max-width: 1240px; margin: 0 auto; padding: 40px clamp(20px,5vw,80px) 120px; }
        .nl-feature { display: flex; min-height: 76vh; max-width: 520px; flex-direction: column; justify-content: center; transition: opacity .4s ease; }
        .nl-timeline { display: flex; }
        .nl-pillar-inner { width: 100%; max-width: 1180px; margin: 0 auto; display: flex; align-items: center; gap: clamp(16px, 4vw, 48px); padding: clamp(24px, 4vw, 48px) clamp(20px, 5vw, 56px); text-align: left; }
        /* Desktop: show the whole product shot inside the centred band. Mobile:
           the box is tall and narrow, so cover (instead of contain) fills it,
           and negative margins (cancelling the band padding) let the image
           bleed to the section's right/top/bottom edges with no margin. The
           crop is anchored right so the tablet stays whole. */
        .nl-hero-imgbox { align-self: stretch; width: clamp(140px, 44%, 460px); }
        .nl-hero-img { object-fit: contain; object-position: right center; }
        @media (max-width: 700px) {
          .nl-hero-img { object-fit: cover; object-position: right center; }
          .nl-hero-imgbox {
            width: 56%;
            margin: calc(-1 * clamp(24px, 4vw, 48px)) calc(-1 * clamp(20px, 5vw, 56px)) calc(-1 * clamp(24px, 4vw, 48px)) 0;
          }
        }
        @media (max-width: 700px) {
          .nl-features-grid { grid-template-columns: auto minmax(0,1fr); gap: 22px; padding: 30px 20px 80px; }
          .nl-feature { min-height: 32vh; justify-content: flex-start; padding: 12px 0; opacity: 1 !important; }
          .nl-timeline { display: none !important; }
        }
      `}</style>

      <div
        className={className}
        style={{
          fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
          color: "#ede4d4",
          background: "#0a0907",
          lineHeight: 1.5,
          overflowX: "clip",
          containerType: "inline-size",
        }}
      >
        {/* NAV */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            minHeight: "clamp(120px, 18vh, 240px)",
            padding: "clamp(36px, 7vw, 80px) clamp(20px, 5cqw, 44px)",
            background: "#0a0907",
          }}
        >
          <Image
            src="/new-landing/logo.png"
            alt="VVS Design"
            width={160}
            height={44}
            style={{ height: 26, width: "auto", display: "block" }}
          />
        </nav>

        {/* PILLARS */}
        <section style={{ width: "100%", display: "flex", flexDirection: "column" }}>

          {/* PILLAR 01 · DESIGN */}
          <article>
            <button
              onClick={() => toggle(0)}
              style={{
                position: "relative",
                display: "flex",
                justifyContent: "center",
                width: "100%",
                minHeight: "clamp(240px, 23vw, 312px)",
                cursor: "pointer",
                border: "none",
                color: "inherit",
                fontFamily: "inherit",
                padding: 0,
                overflow: "hidden",
                background: GRAD_DESIGN,
              }}
            >
              <div className="nl-pillar-inner">
                <span
                  style={{
                    position: "relative",
                    zIndex: 2,
                    flex: "1 1 0",
                    minWidth: 0,
                    fontWeight: 800,
                    fontSize: "clamp(19px, 3.1vw, 38px)",
                    lineHeight: 1.14,
                    letterSpacing: "-0.02em",
                    color: "#fff",
                  }}
                >
                  Design Custom Jewelry and take orders &ndash; in minutes
                </span>
                <span
                  className="nl-hero-imgbox"
                  style={{
                    position: "relative",
                    zIndex: 1,
                    flex: "0 0 auto",
                  }}
                >
                  <Image
                    src="/new-landing/hero-jewelry.png"
                    alt="In-store design tablet on a jewelry case"
                    fill
                    sizes="(max-width: 700px) 52vw, 460px"
                    className="nl-hero-img"
                    style={{ pointerEvents: "none" }}
                  />
                </span>
              </div>
            </button>

            <div
              style={{
                display: "grid",
                gridTemplateRows: rows(0),
                transition: "grid-template-rows .5s cubic-bezier(.4,0,.2,1)",
                background: "#100b06",
              }}
            >
              <div style={{ overflow: "clip", minHeight: 0 }}>
                {/* ── Scroll-driven phone + features (mirrors old landing) ── */}
                <div className="nl-features-grid">
                  {/* Sticky phone */}
                  <div style={{ position: "sticky", top: 100 }}>
                    <div style={{
                      position: "relative",
                      width: "clamp(168px, 42vw, 280px)",
                      height: "clamp(348px, 86vw, 572px)",
                      overflow: "hidden",
                      border: "4px solid #050505",
                      borderRadius: "clamp(28px, 7vw, 44px)",
                      background: "#101010",
                      boxShadow: "0 0 0 1px rgba(255,255,255,0.16), 0 28px 70px -16px #000",
                    }}>
                      {/* Dynamic island */}
                      <div style={{
                        position: "absolute",
                        top: "clamp(9px, 2.5vw, 14px)",
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 3,
                        width: "clamp(65px, 17vw, 108px)",
                        height: "clamp(18px, 4.5vw, 30px)",
                        borderRadius: 99,
                        background: "#000",
                      }} />
                      {["/landing/screen-0.png", "/landing/screen-1.png", "/landing/screen-2.png"].map((src, i) => (
                        <Image
                          key={i}
                          src={src}
                          alt=""
                          fill
                          sizes="280px"
                          style={{
                            objectFit: "cover",
                            objectPosition: "top center",
                            opacity: step === i ? 1 : 0,
                            transition: "opacity .45s ease",
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Scrolling feature articles */}
                  <div>
                    {([
                      {
                        title: <>let customers <strong style={{ color: "#d4924a" }}>design their dream piece</strong> in minutes - not weeks</>,
                        body: "Customers choose stone, metal, setting, and engraving, then submit a complete spec you can quote.",
                        cta: null,
                      },
                      {
                        title: <><strong style={{ color: "#d4924a" }}>realistic, personalized designs</strong> that remove the guesswork</>,
                        body: "They start from proven styles or remix pieces they love, with AI previews before they ask.",
                        cta: null,
                      },
                      {
                        title: <><strong style={{ color: "#d4924a" }}>automated follow-up</strong> that turns interest into orders</>,
                        body: "Send quotes fast and keep every warm lead organized from design request to close.",
                        cta: true,
                      },
                    ] as const).map((feature, i) => (
                      <article
                        key={i}
                        ref={(el) => { featureRefs.current[i] = el; }}
                        data-feature={i}
                        className="nl-feature"
                        style={{
                          opacity: step === i ? 1 : 0.4,
                          ...(i > 0 ? { borderTop: "1px solid rgba(237,228,212,0.09)" } : {}),
                        }}
                      >
                        <h2 style={{
                          margin: 0,
                          color: "#fff",
                          fontSize: "clamp(17px, 4vw, 34px)",
                          lineHeight: 1.16,
                          fontWeight: 800,
                        }}>
                          {feature.title}
                        </h2>
                        <p style={{
                          margin: "14px 0 0",
                          color: "#91877b",
                          fontSize: "clamp(13px, 3vw, 15px)",
                          lineHeight: 1.65,
                        }}>
                          {feature.body}
                        </p>
                        {feature.cta && (
                          <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 26, flexWrap: "wrap" }}>
                            {ctaBtn(
                              "linear-gradient(165deg, #ebb467, #d4924a)",
                              "0 0 0 1px rgba(235,180,103,0.32), 0 10px 24px -12px rgba(212,146,74,0.8)",
                              "#1b1006",
                              "Start free →"
                            )}
                            <a href="mailto:hello@flawless.design" style={{ color: "#91877b", fontSize: 14, textDecoration: "underline", textUnderlineOffset: 4 }}>
                              Book a demo
                            </a>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>

                  {/* Timeline dots */}
                  <div className="nl-timeline" style={{
                    minHeight: "228vh",
                    flexDirection: "column",
                    justifyContent: "space-around",
                    alignItems: "center",
                    background: "linear-gradient(90deg, transparent calc(50% - 0.5px), rgba(237,228,212,0.18) 50%, transparent calc(50% + 0.5px))",
                  }}>
                    {[0, 1, 2].map((i) => (
                      <span key={i} style={{
                        width: 14,
                        height: 14,
                        border: "5px solid #050504",
                        borderRadius: "50%",
                        background: step === i ? "#d4924a" : "#6b6259",
                        boxSizing: "content-box" as const,
                        transition: "background .35s ease, box-shadow .35s ease",
                        boxShadow: step === i ? "0 0 14px rgba(212,146,74,0.8)" : "none",
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* PILLAR 02 · SOCIAL / VIDEO */}
          <article>
            <button
              onClick={() => toggle(1)}
              style={{
                position: "relative",
                display: "flex",
                justifyContent: "center",
                width: "100%",
                minHeight: "clamp(240px, 23vw, 312px)",
                cursor: "pointer",
                border: "none",
                color: "inherit",
                fontFamily: "inherit",
                padding: 0,
                overflow: "hidden",
                background: GRAD_VIDEO,
              }}
            >
              <div className="nl-pillar-inner">
                <span
                  style={{
                    position: "relative",
                    zIndex: 2,
                    flex: "1 1 0",
                    minWidth: 0,
                    fontWeight: 800,
                    fontSize: "clamp(19px, 3.1vw, 38px)",
                    lineHeight: 1.14,
                    letterSpacing: "-0.02em",
                    color: "#fff",
                  }}
                >
                  Create Stunning social media visuals for your Brand &ndash; in minutes
                </span>
                {/* Live marching reel carousel, shared with the /studio hero. */}
                <span
                  style={{
                    position: "relative",
                    zIndex: 1,
                    flex: "0 0 auto",
                    alignSelf: "center",
                    width: "clamp(140px, 42%, 430px)",
                  }}
                >
                  <ReelsCarousel />
                </span>
              </div>
            </button>

            <div
              style={{
                display: "grid",
                gridTemplateRows: rows(1),
                transition: "grid-template-rows .5s cubic-bezier(.4,0,.2,1)",
                background: "#0a121d",
              }}
            >
              <div style={{ overflow: "clip", minWidth: 0, minHeight: 0 }}>
                {/* Merged in: the full /studio landing body (hero reel carousel
                    through closing CTA). Its own .page wrapper supplies the blue
                    palette and the next/font CSS variables; the embedded
                    modifier drops the full-viewport sizing so it nests inside
                    the pillar. minWidth:0 on this grid row lets the studio body
                    shrink to viewport width on mobile instead of blowing out. */}
                <div className={`${studioStyles.page} ${studioStyles.embedded}`}>
                  <StudioContent embedded />
                </div>
              </div>
            </div>
          </article>

          {/* PILLAR 03 · GROWTH */}
          <article>
            <button
              onClick={() => toggle(2)}
              style={{
                position: "relative",
                display: "flex",
                justifyContent: "center",
                width: "100%",
                minHeight: "clamp(240px, 23vw, 312px)",
                cursor: "pointer",
                border: "none",
                color: "inherit",
                fontFamily: "inherit",
                padding: 0,
                overflow: "hidden",
                background: GRAD_GROWTH,
              }}
            >
              <div className="nl-pillar-inner">
                <span
                  style={{
                    position: "relative",
                    zIndex: 2,
                    maxWidth: "80%",
                    fontWeight: 800,
                    fontSize: "clamp(19px, 3.1vw, 38px)",
                    lineHeight: 1.14,
                    letterSpacing: "-0.02em",
                    color: "#fff",
                  }}
                >
                  Get 3&times; more Organic leads, Reviews and Social Media followers
                </span>
              </div>
            </button>

            <div
              style={{
                display: "grid",
                gridTemplateRows: rows(2),
                transition: "grid-template-rows .5s cubic-bezier(.4,0,.2,1)",
                background: "#08120c",
              }}
            >
              <div style={{ overflow: "clip", minHeight: 0 }}>
                <div
                  style={{
                    maxWidth: 940,
                    margin: "0 auto",
                    padding:
                      "clamp(24px, 5cqw, 40px) clamp(20px, 5cqw, 48px) clamp(34px, 5cqw, 52px)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "clamp(15px, 1.6cqw, 17px)",
                      lineHeight: 1.65,
                      color: "#9bb6a7",
                      maxWidth: 620,
                      margin: 0,
                    }}
                  >
                    Every design and every reel feeds one loop &mdash; automated follow-up, review
                    capture and reposts that compound your audience month after month.
                  </p>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      marginTop: "clamp(24px, 4cqw, 34px)",
                    }}
                  >
                    {[
                      {
                        n: "01",
                        title: "More leads",
                        desc: "Quotes and reminders fire automatically, so no warm lead ever goes cold.",
                        border: true,
                      },
                      {
                        n: "02",
                        title: "More reviews",
                        desc: "Happy customers get nudged for a review at the perfect moment — your rating climbs on autopilot.",
                        border: true,
                      },
                      {
                        n: "03",
                        title: "More followers",
                        desc: "Every reel posts native to Reels, TikTok & Shorts — turning one-time buyers into a following.",
                        border: false,
                      },
                    ].map((row, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          gap: 16,
                          padding: "20px 0",
                          ...(row.border
                            ? { borderBottom: "1px solid rgba(79,174,132,0.12)" }
                            : {}),
                        }}
                      >
                        <span
                          style={{
                            flexShrink: 0,
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#4f8c6a",
                            paddingTop: 3,
                          }}
                        >
                          {row.n}
                        </span>
                        <div>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: "clamp(16px, 2cqw, 19px)",
                              color: "#fff",
                            }}
                          >
                            {row.title}
                          </div>
                          <div
                            style={{
                              fontSize: 14,
                              color: "#8aa899",
                              marginTop: 5,
                              lineHeight: 1.55,
                            }}
                          >
                            {row.desc}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 14,
                      marginTop: "clamp(24px, 4cqw, 32px)",
                    }}
                  >
                    {[
                      { val: "3×", label: "more qualified leads" },
                      { val: "5×", label: "review velocity" },
                      { val: "0", label: "manual follow-ups" },
                    ].map((stat, i) => (
                      <div
                        key={i}
                        style={{
                          flex: "1 1 140px",
                          padding: 20,
                          borderRadius: 14,
                          background: "rgba(79,174,132,0.05)",
                          border: "1px solid rgba(79,174,132,0.16)",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: 30,
                            letterSpacing: "-0.04em",
                            color: "#fff",
                            lineHeight: 1,
                          }}
                        >
                          {stat.val.replace("×", "")}
                          {stat.val.includes("×") && (
                            <span style={{ color: "#6fd3a3" }}>×</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12.5, color: "#7d9a8a", marginTop: 8 }}>
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: "clamp(28px, 4cqw, 38px)" }}>
                    {ctaBtn(
                      "linear-gradient(170deg, #6fd3a3 0%, #3f9e72 100%)",
                      "0 8px 24px -8px rgba(79,174,132,0.5)",
                      "#042014",
                      "Start free"
                    )}
                  </div>
                </div>
              </div>
            </div>
          </article>
        </section>

        {/* FOOTER */}
        <footer
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            padding: "clamp(36px, 6cqw, 56px) 24px",
            borderTop: "1px solid rgba(237,228,212,0.07)",
          }}
        >
          <Image
            src="/new-landing/logo.png"
            alt="VVS Design"
            width={120}
            height={33}
            style={{ height: 22, width: "auto", opacity: 0.9 }}
          />
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.06em",
              color: "#58534d",
            }}
          >
            &copy; 2026 flawless.design &middot; All rights reserved
          </div>
        </footer>
      </div>
    </>
  );
}
