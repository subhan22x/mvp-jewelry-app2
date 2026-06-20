import "./globals.css";
import { Suspense } from "react";
import { Figtree } from "next/font/google";
import localFont from "next/font/local";
import ThemeSwitcher from "./ThemeSwitcher";
import ThemeStyles from "./ThemeStyles";
import GuidedTour from "./components/GuidedTour";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });
const nostalgic = localFont({
  src: "../public/fonts/perfectly-nostalgic-bold-italic.ttf",
  variable: "--font-nostalgic"
});
const theShuffle = localFont({
  src: "../public/fonts/TheShuffle-Regular.ttf",
  variable: "--font-the-shuffle"
});

export const metadata = { title: "Pendant MVP", description: "Custom pendant ideation" };

const browserPermissionErrorGuard = `
(() => {
  const ignoredMessages = [
    'Permission denied to access property "correspondingUseElement"',
    'Permission denied to access property "nodeType"'
  ];

  const shouldIgnore = (value) => {
    const message = typeof value === 'string'
      ? value
      : value && typeof value.message === 'string'
        ? value.message
        : '';

    return ignoredMessages.some((ignored) => message.includes(ignored));
  };

  window.addEventListener('error', (event) => {
    if (!shouldIgnore(event.error) && !shouldIgnore(event.message)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    if (!shouldIgnore(event.reason)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${figtree.variable} ${nostalgic.variable} ${theShuffle.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: browserPermissionErrorGuard }} />
        <ThemeStyles />
      </head>
      <body className="min-h-dvh">
        {children}
        <Suspense>
          <GuidedTour />
        </Suspense>
        <ThemeSwitcher />
      </body>
    </html>
  );
}
