import "./globals.css";
import { Suspense } from "react";
import localFont from "next/font/local";
import ThemeSwitcher from "./ThemeSwitcher";
import ThemeStyles from "./ThemeStyles";
import GuidedTour from "./components/GuidedTour";

const figtree = localFont({ src: "../public/fonts/google/figtree/Regular.ttf", weight: "300 900", display: "swap", variable: "--font-figtree" });
const plusJakarta = localFont({ src: "../public/fonts/google/plusjakartasans/Regular.ttf", weight: "700", display: "swap", variable: "--font-plus-jakarta" });
const instrumentSans = localFont({ src: "../public/fonts/google/instrumentsans/Regular.ttf", weight: "400 700", display: "swap", variable: "--font-instrument-sans" });
const archivoNarrow = localFont({ src: "../public/fonts/google/archivonarrow/Regular.ttf", weight: "400 700", display: "swap", variable: "--font-archivo-narrow" });
const boldonse = localFont({
  src: "../public/fonts/google/boldonse/Regular.ttf",
  weight: "400",
  display: "swap",
  variable: "--font-boldonse",
  adjustFontFallback: false
});
const nostalgic = localFont({
  src: "../public/fonts/perfectly-nostalgic-bold-italic.ttf",
  variable: "--font-nostalgic"
});
const theShuffle = localFont({
  src: "../public/fonts/TheShuffle-Regular.ttf",
  variable: "--font-the-shuffle"
});

export const metadata = {
  title: "Grow Jewelry",
  description: "AI design studio for jewelers",
};

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
    <html
      lang="en"
      className={`${figtree.variable} ${plusJakarta.variable} ${instrumentSans.variable} ${archivoNarrow.variable} ${boldonse.variable} ${nostalgic.variable} ${theShuffle.variable}`}
    >
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
