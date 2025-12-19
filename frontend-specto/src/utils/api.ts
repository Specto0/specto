const stripTrailingSlash = (value: string): string =>
  value.replace(/\/+$/, "");

const LOCAL_FALLBACK = "http://127.0.0.1:8000";
const PRODUCTION_URL = "https://specto-production.up.railway.app";

/**
 * Checks if we're running on a production domain (not localhost).
 */
const isProductionDomain = (): boolean => {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return hostname !== "localhost" && hostname !== "127.0.0.1";
};

const isLocalHttp = (url: string): boolean => {
  return /^http:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/|$)/i.test(url);
};

/**
 * Ensures HTTPS is used. This is called on EVERY request, not cached.
 */
const ensureHttps = (url: string): string => {
  if (url.startsWith("http://") && isLocalHttp(url)) {
    return url;
  }
  if (url.startsWith("http://")) {
    return url.replace("http://", "https://");
  }
  return url;
};

/**
 * Gets the base URL. Called dynamically to handle SSR vs client differences.
 */
const getBaseUrl = (): string => {
  const envValue = typeof import.meta.env.VITE_API_BASE_URL === "string"
    ? import.meta.env.VITE_API_BASE_URL.trim()
    : "";

  if (envValue) {
    return stripTrailingSlash(envValue);
  }

  // Production domain check
  if (isProductionDomain()) {
    return PRODUCTION_URL;
  }

  // During SSR or build-time, assume production if PROD flag is set
  if (import.meta.env.PROD && typeof window === "undefined") {
    return PRODUCTION_URL;
  }

  return LOCAL_FALLBACK;
};

// Initial URL for logging/debugging (will be corrected at runtime)
export const API_BASE_URL = getBaseUrl();

/**
 * Builds the full API URL. ALWAYS ensures HTTPS for production at call time.
 */
export const buildApiUrl = (path: string): string => {
  // Get base URL dynamically and ensure HTTPS
  const baseUrl = ensureHttps(getBaseUrl());

  if (!path) return baseUrl;

  const formattedPath = path.startsWith("/") ? path : `/${path}`;
  const fullUrl = `${baseUrl}${formattedPath}`;

  // Double-check HTTPS is used
  return ensureHttps(fullUrl);
};

export const buildWsUrl = (path: string): string => {
  const baseUrl = ensureHttps(getBaseUrl());
  // For WSS, we need wss:// not ws://
  const wsBase = baseUrl.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
  const formattedPath = path.startsWith("/") ? path : `/${path}`;
  return `${wsBase}${formattedPath}`;
};

// Debug logging
console.log("🔧 API_BASE_URL =>", API_BASE_URL);
console.log("🔧 login URL =>", buildApiUrl("/auth/login"));
console.log("🔧 window.location.protocol =>", typeof window !== "undefined" ? window.location.protocol : "N/A");
