import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import NewLandingPage from "./new-landing-page/NewLandingPage";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta"
});
const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jbmono"
});
const shuffle = localFont({
  src: "../public/landing/TheShuffle-Regular.ttf",
  variable: "--font-shuffle"
});

export const metadata: Metadata = {
  title: "Grow Jewelry | Design, film and grow",
  description:
    "Design custom jewelry orders, generate studio-grade reels, and grow organic leads — all from one place."
};

export default function Page() {
  return <NewLandingPage className={`${jakarta.variable} ${jbMono.variable} ${shuffle.variable}`} />;
}
