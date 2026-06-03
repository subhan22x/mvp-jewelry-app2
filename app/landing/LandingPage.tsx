"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./LandingPage.module.css";

const features = [
  {
    title: <>let customers <strong>design their dream piece</strong> in minutes - not weeks</>,
    body: "An interactive configurator walks them through stone, metal, setting, and engraving with a photoreal preview at every step. They submit a complete spec; you reply with a quote."
  },
  {
    title: <><strong>realistic, personalized designs</strong> that remove the guesswork</>,
    body: "Customers choose from premade styles or remix the pieces they already love. Our jewelry-trained AI renders every variation in photoreal detail, so they see exactly what they are buying before they ask."
  },
  {
    title: <><strong>automated follow-up</strong> that turns interest into orders</>,
    body: "Send price quotes the moment a design is submitted, then keep warm leads moving toward the close without losing track of the conversation."
  }
];

const deployWays = [
  ["01", "Put it in your Store", "Customers scan one QR code, design their piece on the spot, and get a fully specced prototype before they walk out.", "qr"],
  ["02", "Add it to your IG bio", "Visitors who would otherwise bounce can design their own piece while you capture a complete lead.", "laptop"],
  ["03", "Run it alongside your Meta Ads", "Send ad traffic to an interactive design tool and receive warm leads who have already chosen what they want.", "phone"]
] as const;

const studioSteps = [
  ["Step 01", "Shoot", "Studio-quality video, zero hassle.", "Snap your piece on any surface. The model reads the metal, stones, and setting from a single frame and builds a complete studio brief."],
  ["Step 02", "Generate", "Premium reel in minutes.", "Choose a cinematic theme. The model renders every variation in studio-grade detail for social-ready output."],
] as const;

function Arrow() {
  return <span aria-hidden className={styles.arrow}>-&gt;</span>;
}

function DeployIcon({ type }: { type: "qr" | "laptop" | "phone" }) {
  if (type === "qr") {
    return <svg viewBox="0 0 64 64"><rect x="8" y="8" width="19" height="19" /><rect x="37" y="8" width="19" height="19" /><rect x="8" y="37" width="19" height="19" /><path d="M38 38h6v6h-6zm12 0h6v6h-6zM38 50h6v6h-6zm12 0h6v6h-6z" /></svg>;
  }
  if (type === "laptop") {
    return <svg viewBox="0 0 64 64"><rect x="7" y="11" width="50" height="32" rx="3" /><path d="M3 46h58l-4 6H7l-4-6Z" /><path d="M14 18h20M14 24h14M39 20h11v14H39z" /></svg>;
  }
  return <svg viewBox="0 0 64 64"><rect x="19" y="5" width="26" height="54" rx="5" /><path d="M26 11h12M24 17h16v23H24zm4 29h8" /></svg>;
}

export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [yearly, setYearly] = useState(true);
  const featureRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveFeature(Number((visible.target as HTMLElement).dataset.feature));
      },
      { rootMargin: "-34% 0px -34% 0px", threshold: [0, 0.2, 0.6] }
    );
    featureRefs.current.forEach(element => element && observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo}><Image src="/landing/vvs-design-logo.png" alt="VVS Design" width={150} height={74} priority /></Link>
        <div className={styles.navActions}>
          <Link href="/login" className={styles.login}>Log in</Link>
          <Link href="/onboarding" className={styles.primaryButton}>Start free <Arrow /></Link>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <h1>Design Custom<br />Jewelry orders <em>in minutes</em></h1>
          <p>The Jewelry Design Software that turns curiosity into sales. Give your customers a design to say yes to, in minutes.</p>
        </div>
        <div className={styles.heroImage}>
          <Image src="/landing/hero-bg-transparent-5.png" alt="Custom pendant design app displayed in a jewelry studio case" fill sizes="(max-width: 880px) 100vw, 55vw" priority />
        </div>
      </section>

      <aside className={styles.orderBanner}>
        <p>Book <em>3x</em> more custom orders using AI</p>
      </aside>
      <p className={styles.howIntro}>
        <span>here&apos;s how</span>
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M12 4v14m-5-5 5 5 5-5" />
        </svg>
      </p>

      <section id="features" className={styles.features}>
        <div className={styles.phoneWrap}>
          <div className={styles.phone}>
            <div className={styles.island} />
            {[0, 1, 2].map(index => (
              <Image
                key={index}
                src={`/landing/screen-${index}.png`}
                alt=""
                fill
                sizes="280px"
                className={`${styles.phoneScreen} ${activeFeature === index ? styles.phoneScreenActive : ""}`}
              />
            ))}
          </div>
        </div>
        <div>
          {features.map((feature, index) => (
            <article
              key={index}
              ref={element => { featureRefs.current[index] = element; }}
              data-feature={index}
              className={`${styles.feature} ${activeFeature === index ? styles.featureActive : ""}`}
            >
              <h2>{feature.title}</h2>
              <p>{feature.body}</p>
              {index === 2 ? <div className={styles.inlineActions}><Link href="/onboarding" className={styles.primaryButtonLarge}>Start free <Arrow /></Link><a href="mailto:hello@flawless.design" className={styles.textLink}>Book a demo</a></div> : null}
            </article>
          ))}
        </div>
        <div className={styles.timeline} aria-hidden>
          {features.map((_, index) => <span key={index} className={activeFeature === index ? styles.dotActive : ""} />)}
        </div>
      </section>

      <section className={styles.stats}>
        {[["3", "x", "higher close rate on custom orders"], ["35", "%", "higher average order value"], ["2", "min", "average design session time"], ["0", "", "leads lost to \"I'll think about it\""]].map(([value, unit, label]) => (
          <div key={label}><strong>{value}<em>{unit}</em></strong><span>{label}</span></div>
        ))}
      </section>

      <section className={styles.deploy}>
        <div className={styles.sectionInner}>
          <div className={styles.deployGrid}>
            {deployWays.map(([num, title, body, icon]) => (
              <article key={num} className={styles.deployCard}>
                <div className={styles.deployVisual}><DeployIcon type={icon} /></div>
                <span>{num}</span><h2>{title}</h2><p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.studios}>
        <div className={styles.sectionInner}>
          <div className={styles.studiosGrid}>
            <div>
              <p className={styles.sectionLabel}>VVS Design Studios</p>
              <h2 className={styles.studiosTitle}>Turn your jewelry store into a <em>Brand</em></h2>
              <p className={styles.studiosBody}>One photo in, a month of <b>studio-grade video</b> out. flawless.design generates the b-roll, hooks, and product reels your jewelry store needs to post daily.</p>
              <div className={styles.inlineActions}><Link href="/onboarding" className={styles.primaryButtonLarge}>Generate your first reel <Arrow /></Link><Link href="/owner/vvs-studio" className={styles.outlineButton}>Open studio</Link></div>
            </div>
            <div className={styles.studioPhones} aria-hidden>
              {[
                "/landing/studio-preview-1.mp4",
                "/landing/studio-preview-2.mp4",
                "/landing/studio-preview-3.mp4",
                "/landing/studio-preview-4.mp4",
                "/landing/studio-preview-5.mp4",
              ].map((videoSrc, index) => (
                <div key={index} className={styles.studioPhone}>
                  <video autoPlay loop muted playsInline preload="metadata">
                    <source src={videoSrc} type="video/mp4" />
                  </video>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.how}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionLabel}>How it works</p>
          <h2 className={styles.sectionTitle}>One photo in. <em>Studio reels</em> out.</h2>
          <div className={styles.howGrid}>
            {studioSteps.map(([step, label, title, body]) => <article key={step}><div><span>{step}</span><small>{label}</small></div><h3>{title}</h3><p>{body}</p></article>)}
          </div>
          <div className={styles.publish}><span>Step 03 - Publish</span><p>Export native 9:16 video to Reels, TikTok, Shorts, and Pinterest. A few photos become a month of content.</p></div>
        </div>
      </section>

      <section className={styles.pricing}>
        <div className={styles.sectionInner}>
          <div className={styles.pricingHead}>
            <h2 className={styles.sectionTitle}>Plans priced like <em>software</em>, not like an agency.</h2>
            <div className={styles.toggle}><button onClick={() => setYearly(false)} className={!yearly ? styles.toggleActive : ""}>Monthly</button><button onClick={() => setYearly(true)} className={yearly ? styles.toggleActive : ""}>Yearly <span>-20%</span></button></div>
          </div>
          <div className={styles.priceGrid}>
            {[
              ["Counter", "For single boutiques", 79, 63, "20 generations / mo", "12 formats", "1 brand kit"],
              ["Atelier", "Most chosen - best value", 279, 219, "200 generations / mo", "30+ formats", "Priority render queue"],
              ["Maison", "For multi-location stores", 899, 729, "Unlimited generations", "Custom format training", "Dedicated stylist call"]
            ].map(([name, tag, monthly, annual, ...items], index) => <article key={String(name)} className={`${styles.priceCard} ${index === 1 ? styles.priceFeatured : ""}`}>{index === 1 ? <b>Most chosen</b> : null}<small>{tag}</small><h3>{name}</h3><div><strong>${yearly ? annual : monthly}</strong><span>/ month</span></div><ul>{items.map(item => <li key={String(item)}>{item}</li>)}</ul><Link href="/onboarding" className={index === 1 ? styles.primaryButton : styles.outlineButton}>Start with {name} <Arrow /></Link></article>)}
          </div>
        </div>
      </section>

      <section className={styles.finalCta}>
        <h2>Your next big order is<br /><em>walking in the door.</em></h2>
        <p>Give customers a reason to say yes today. Set up flawless.design in your store in under 10 minutes.</p>
        <div className={styles.inlineActions}><Link href="/onboarding" className={styles.primaryButtonLarge}>Start free <Arrow /></Link><a href="mailto:hello@flawless.design" className={styles.outlineButton}>Book a demo</a></div>
      </section>

      <footer className={styles.footer}><Image src="/landing/vvs-design-logo.png" alt="VVS Design" width={120} height={60} /><span>© 2026 flawless.design - All rights reserved</span></footer>
    </main>
  );
}
