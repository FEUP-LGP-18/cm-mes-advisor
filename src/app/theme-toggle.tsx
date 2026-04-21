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

  const isDark = resolvedTheme === "dark";
  const nextTheme: ThemeMode = isDark ? "light" : "dark";

  return (
    <button
      type="button"
      aria-label={`Switch to ${nextTheme} mode`}
      className="focus-premium theme-toggle-icon"
      onClick={() => handleThemeChange(nextTheme)}
      title={`Switch to ${nextTheme} mode`}
    >
      <span className="theme-toggle-icon-frame" aria-hidden="true">
        {isDark ? (
          <svg
            className="theme-toggle-glyph"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 3.5V5.5M12 18.5V20.5M5.99 5.99L7.4 7.4M16.6 16.6L18.01 18.01M3.5 12H5.5M18.5 12H20.5M5.99 18.01L7.4 16.6M16.6 7.4L18.01 5.99M15.5 12C15.5 13.933 13.933 15.5 12 15.5C10.067 15.5 8.5 13.933 8.5 12C8.5 10.067 10.067 8.5 12 8.5C13.933 8.5 15.5 10.067 15.5 12Z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        ) : (
          <svg
            className="theme-toggle-glyph"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M20.2 14.16C19.35 14.53 18.4 14.74 17.4 14.74C13.54 14.74 10.41 11.61 10.41 7.75C10.41 6.74 10.63 5.79 11.01 4.93C7.2 5.4 4.25 8.64 4.25 12.58C4.25 16.84 7.71 20.3 11.97 20.3C15.95 20.3 19.21 17.31 19.66 13.48C19.84 13.7 20.02 13.93 20.2 14.16Z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        )}
      </span>
      <span className="sr-only">{`Switch to ${nextTheme} mode`}</span>
    </button>
  );
}
