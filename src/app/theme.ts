export type ThemeMode = "dark" | "light";

export const themeStorageKey = "cm-mes-advisor:theme";
export const defaultTheme: ThemeMode = "dark";

export function normalizeThemeMode(
  value: string | null | undefined,
): ThemeMode {
  return value === "light" ? "light" : "dark";
}

export const themeInitScript = `
(() => {
  const storageKey = ${JSON.stringify(themeStorageKey)};
  const defaultTheme = ${JSON.stringify(defaultTheme)};
  try {
    const storedTheme = window.localStorage.getItem(storageKey);
    const theme = storedTheme === "light" || storedTheme === "dark"
      ? storedTheme
      : defaultTheme;
    document.documentElement.dataset.theme = theme;
  } catch {
    document.documentElement.dataset.theme = defaultTheme;
  }
})();
`;
