"use client";

import { useEffect, useState } from "react";

const themes = [
  { key: "ice_blue", label: "Ice" },
  { key: "graphite_orange", label: "Graphite" },
  { key: "rose_luxe", label: "Rose" },
  { key: "velvet_blue", label: "Navy" }
];

const storageKey = "caratlabs-preview-theme";

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState("graphite_orange");

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey) ?? "graphite_orange";
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);

  const updateTheme = (nextTheme: string) => {
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(storageKey, nextTheme);
  };

  return (
    <div className="fixed bottom-3 left-1/2 z-[100] flex -translate-x-1/2 gap-1 rounded-full border border-[color:var(--theme-border)] bg-[var(--theme-surface-strong)] p-1 shadow-[0_18px_44px_rgba(0,0,0,0.38)] backdrop-blur">
      {themes.map(option => (
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
