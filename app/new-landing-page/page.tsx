import type { Metadata } from "next";
import localFont from "next/font/local";
import NewLandingPage from "./NewLandingPage";

const jakarta = localFont({
  src: "../../public/fonts/google/plusjakartasans/Regular.ttf",
  weight: "400 800",
  display: "swap",
  variable: "--font-jakarta"
});
const jbMono = localFont({
  src: "../../public/fonts/google/jetbrainsmono/Regular.ttf",
  weight: "400 500",
  display: "swap",
  variable: "--font-jbmono"
});
const shuffle = localFont({
  src: "../../public/landing/TheShuffle-Regular.ttf",
  variable: "--font-shuffle"
});

export const metadata: Metadata = {
  title: "Grow Jewelry | Design, film and grow",
  description:
    "Design custom jewelry orders, generate studio-grade reels, and grow organic leads with Grow Jewelry.",
  alternates: { canonical: "https://growjewelry.io" }
};

export default function Page() {
  return <NewLandingPage className={`${jakarta.variable} ${jbMono.variable} ${shuffle.variable}`} />;
}
