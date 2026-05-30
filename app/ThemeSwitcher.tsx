"use client";

import { useEffect, useState } from "react";
import { DEFAULT_THEME_KEY, THEME_OPTIONS, THEME_STORAGE_KEY, type ThemeKey } from "@/src/lib/theme/themes";

export default function ThemeSwitcher() {
  const [, setTheme] = useState<ThemeKey>(DEFAULT_THEME_KEY);

  useEffect(() => {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeKey | null;
    const nextTheme = saved && THEME_OPTIONS.some(option => option.key === saved) ? saved : DEFAULT_THEME_KEY;
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  return null;
}
