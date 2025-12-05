const stripTrailingSlash = (value: string): string =>
  value.replace(/\/+$/, "");

const resolveEnvBaseUrl = (): string | null => {
  const candidates = [
    import.meta.env.VITE_API_BASE_URL as string | undefined,
    import.meta.env.VITE_API_URL as string | undefined,
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed) {
        return stripTrailingSlash(trimmed);
      }
    }
  }

  return null;
};

const resolveBrowserBaseUrl = (): string | null => {
  if (typeof window === "undefined") return null;
  const { protocol, hostname } = window.location;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//${hostname}:8000`;
  }

  return stripTrailingSlash(window.location.origin);
};

export const API_BASE_URL =
  resolveEnvBaseUrl() ??
  resolveBrowserBaseUrl() ??
  "http://127.0.0.1:8000";

export const buildApiUrl = (path: string): string => {
  if (!path) return API_BASE_URL;
  const formattedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${formattedPath}`;
};

export const buildWsUrl = (path: string): string => {
  const base = API_BASE_URL.replace(/^http/, "ws");
  const formattedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${formattedPath}`;
};
