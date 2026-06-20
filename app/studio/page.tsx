import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import StudioPage from "./StudioPage";

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
