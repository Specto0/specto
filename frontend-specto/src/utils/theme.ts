export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "tema";
export const THEME_EVENT_NAME = "app-theme-change";

const toThemeMode = (value: unknown): ThemeMode => {
  if (typeof value === "string") {
    return value.trim().toLowerCase() === "light" ? "light" : "dark";
  }
  if (typeof value === "boolean") {
    return value ? "dark" : "light";
  }
  return "dark";
};

export const coerceTheme = (value: unknown): ThemeMode => toThemeMode(value);

export const readTheme = (): ThemeMode => {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored) {
    return toThemeMode(stored);
  }
  localStorage.setItem(THEME_STORAGE_KEY, "dark");
  return "dark";
};

export const persistTheme = (mode: ThemeMode) => {
  const normalized = toThemeMode(mode);

  try {
    const current = localStorage.getItem(THEME_STORAGE_KEY);
    if (current !== normalized) {
      localStorage.setItem(THEME_STORAGE_KEY, normalized);
    }
  } catch {
    // ignore storage errors (private mode, etc.)
  }

  if (typeof window !== "undefined") {
    window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent<ThemeMode>(THEME_EVENT_NAME, { detail: normalized })
      );
    }, 0);
  }
};

export const applyTheme = (mode?: unknown): ThemeMode => {
  const normalized = toThemeMode(mode);
  persistTheme(normalized);
  return normalized;
};

export const subscribeTheme = (callback: (mode: ThemeMode) => void) => {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<ThemeMode>).detail;
    if (detail) {
      callback(detail);
    } else {
      callback(readTheme());
    }
  };
  window.addEventListener(THEME_EVENT_NAME, handler as EventListener);
  return () =>
    window.removeEventListener(THEME_EVENT_NAME, handler as EventListener);
};
