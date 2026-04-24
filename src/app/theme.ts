export type ThemeMode = "dark" | "light";

export const themeStorageKey = "cm-mes-advisor:theme:v2";
export const defaultTheme: ThemeMode = "light";

export function normalizeThemeMode(
  value: string | null | undefined,
): ThemeMode {
  return value === "dark" ? "dark" : "light";
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
    document.documentElement.style.colorScheme = theme;
  } catch {
    document.documentElement.dataset.theme = defaultTheme;
    document.documentElement.style.colorScheme = defaultTheme;
  }
})();
`;
