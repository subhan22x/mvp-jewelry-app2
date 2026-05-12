"use client";

import { useEffect, useState } from "react";
import { DEFAULT_THEME_KEY, THEME_OPTIONS, THEME_STORAGE_KEY, type ThemeKey } from "@/src/lib/theme/themes";

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeKey>(DEFAULT_THEME_KEY);

  useEffect(() => {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeKey | null;
    const nextTheme = saved && THEME_OPTIONS.some(option => option.key === saved) ? saved : DEFAULT_THEME_KEY;
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  const updateTheme = (nextTheme: ThemeKey) => {
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  };

  return (
    <div className="fixed bottom-3 left-1/2 z-[100] flex -translate-x-1/2 gap-1 rounded-full border border-[color:var(--theme-border)] bg-[var(--theme-surface-strong)] p-1 shadow-[0_18px_44px_rgba(0,0,0,0.38)] backdrop-blur">
      {THEME_OPTIONS.map(option => (
        <button
          key={option.key}
          type="button"
          onClick={() => updateTheme(option.key)}
          className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
            theme === option.key
              ? "bg-[var(--theme-accent)] text-[var(--theme-accent-contrast)]"
              : "text-[var(--theme-text-soft)] hover:bg-white/10 hover:text-[var(--theme-text)]"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
