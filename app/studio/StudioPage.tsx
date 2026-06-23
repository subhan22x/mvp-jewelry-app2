"use client";

import Image from "next/image";
import Link from "next/link";
import StudioContent from "./StudioContent";
import styles from "./StudioPage.module.css";

export default function StudioPage({ className }: { className?: string }) {
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

      <StudioContent />

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
