import type { Metadata } from "next";
import localFont from "next/font/local";
import StudioPage from "./StudioPage";

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
  title: "flawless.design | Video engine",
  description:
    "Studio-grade short-form video, done for you. Turn a single product photo into a month of scroll-stopping reels and book them straight into your content calendar."
};

export default function Page() {
  return <StudioPage className={`${jakarta.variable} ${jbMono.variable} ${shuffle.variable}`} />;
}
