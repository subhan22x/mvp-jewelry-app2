import "./globals.css";
import { Figtree } from "next/font/google";
import localFont from "next/font/local";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });
const nostalgic = localFont({
  src: "../public/fonts/perfectly-nostalgic-bold-italic.ttf",
  variable: "--font-nostalgic"
});

export const metadata = { title: "Pendant MVP", description: "Custom pendant ideation" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${figtree.variable} ${nostalgic.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
