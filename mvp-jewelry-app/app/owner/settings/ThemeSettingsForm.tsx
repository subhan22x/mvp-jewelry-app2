"use client";

import { useEffect, useState } from "react";
import { DEFAULT_THEME_KEY, THEME_OPTIONS, THEME_STORAGE_KEY, type ThemeKey } from "@/src/lib/theme/themes";

export default function ThemeSettingsForm() {
  const [theme, setTheme] = useState<ThemeKey>(DEFAULT_THEME_KEY);

  useEffect(() => {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeKey | null;
    const nextTheme = saved && THEME_OPTIONS.some(option => option.key === saved) ? saved : DEFAULT_THEME_KEY;
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  function updateTheme(nextTheme: ThemeKey) {
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }

  return (
    <section className="rounded-xl border border-white/5 bg-[#17191F] p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f7bc5f]">Theme</p>
        <h2 className="mt-3 text-2xl font-bold text-[#e1e2ec]">Design wizard theme</h2>
        <p className="mt-2 text-sm leading-6 text-[#c2c6d6]">
          Choose the visual theme owners use when opening the pendant design wizard.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {THEME_OPTIONS.map(option => {
          const active = theme === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => updateTheme(option.key)}
              className={`rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-[#f7bc5f] bg-[#f7bc5f]/10 shadow-[0_0_24px_rgba(247,188,95,0.18)]"
                  : "border-white/10 bg-[#101114] hover:border-[#f7bc5f]/60"
              }`}
            >
              <div className="flex gap-2">
                {option.colors.map(color => (
                  <span key={color} className="h-7 w-7 rounded-full border border-white/10" style={{ backgroundColor: color }} />
                ))}
              </div>
              <p className="mt-4 text-sm font-bold text-[#e1e2ec]">{option.label}</p>
              <p className="mt-1 text-xs text-[#8c909f]">{option.description}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
