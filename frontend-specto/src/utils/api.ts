const stripTrailingSlash = (value: string): string =>
  value.replace(/\/+$/, "");

const LOCAL_FALLBACK = "http://127.0.0.1:8000";
const PRODUCTION_URL = "https://specto-production.up.railway.app";

/**
 * Ensures HTTPS is used when the page is loaded over HTTPS.
 * This prevents Mixed Content errors in production.
 */
const ensureHttps = (url: string): string => {
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    url.startsWith("http://")
  ) {
    return url.replace("http://", "https://");
  }
  return url;
};

const resolveBaseUrl = (): string => {
  const envValue = typeof import.meta.env.VITE_API_BASE_URL === "string"
    ? import.meta.env.VITE_API_BASE_URL.trim()
    : "";

  if (envValue) {
    return ensureHttps(stripTrailingSlash(envValue));
  }

  // If we're in production (not localhost), use the production URL
  if (
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    return PRODUCTION_URL;
  }

  // Local development fallback
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")
  ) {
    return LOCAL_FALLBACK;
  }

  if (import.meta.env.PROD) {
    console.warn(
      "API_BASE_URL indefinido em produção. A usar fallback de produção.",
    );
    return PRODUCTION_URL;
  }

  return LOCAL_FALLBACK;
};

export const API_BASE_URL = resolveBaseUrl();

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

console.log("🔧 API_BASE_URL =>", API_BASE_URL);
console.log("🔧 login URL =>", buildApiUrl("/auth/login"));
