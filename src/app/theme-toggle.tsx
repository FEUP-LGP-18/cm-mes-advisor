"use client";

import { useEffect, useState } from "react";
import {
  defaultTheme,
  normalizeThemeMode,
  themeStorageKey,
  type ThemeMode,
} from "./theme";

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(themeStorageKey, theme);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>(defaultTheme);
  const resolvedTheme =
    typeof window === "undefined"
      ? theme
      : normalizeThemeMode(
          document.documentElement.dataset.theme ||
            window.localStorage.getItem(themeStorageKey) ||
            theme,
        );

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  function handleThemeChange(nextTheme: ThemeMode) {
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <div aria-label="Theme" className="theme-toggle-shell" role="group">
      <button
        type="button"
        aria-pressed={resolvedTheme === "dark"}
        className="theme-toggle-option"
        data-theme-option="dark"
        onClick={() => handleThemeChange("dark")}
      >
        Dark
      </button>
      <button
        type="button"
        aria-pressed={resolvedTheme === "light"}
        className="theme-toggle-option"
        data-theme-option="light"
        onClick={() => handleThemeChange("light")}
      >
        Light
      </button>
    </div>
  );
}
