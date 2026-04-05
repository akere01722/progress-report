export const COLOR_THEME_STORAGE_KEY = "app_color_theme";
export const DEFAULT_COLOR_THEME = "blue";

const normalizeTheme = (value) =>
  value === "emerald" || value === "blue" ? value : DEFAULT_COLOR_THEME;

export const getStoredColorTheme = () => {
  if (typeof window === "undefined") return DEFAULT_COLOR_THEME;
  return normalizeTheme(localStorage.getItem(COLOR_THEME_STORAGE_KEY));
};

export const applyColorTheme = (theme) => {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-color-theme", normalizeTheme(theme));
};

export const setColorTheme = (theme) => {
  const normalized = normalizeTheme(theme);
  if (typeof window !== "undefined") {
    localStorage.setItem(COLOR_THEME_STORAGE_KEY, normalized);
  }
  applyColorTheme(normalized);
  return normalized;
};
