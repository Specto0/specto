const stripTrailingSlash = (value: string): string =>
  value.replace(/\/+$/, "");

const LOCAL_FALLBACK = "http://127.0.0.1:8000";

const resolveBaseUrl = (): string => {
  const envValue = typeof import.meta.env.VITE_API_BASE_URL === "string"
    ? import.meta.env.VITE_API_BASE_URL.trim()
    : "";

  if (envValue) {
    return stripTrailingSlash(envValue);
  }

  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")
  ) {
    return LOCAL_FALLBACK;
  }

  if (import.meta.env.PROD) {
    console.error(
      "API_BASE_URL indefinido em produção. Define VITE_API_BASE_URL no ambiente.",
    );
  }

  return LOCAL_FALLBACK;
};

export const API_BASE_URL = resolveBaseUrl();

export const buildApiUrl = (path: string): string => {
  if (!path) return API_BASE_URL;

  const formattedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${formattedPath}`;
};

console.log("🔧 API_BASE_URL =>", API_BASE_URL);
console.log("🔧 login URL =>", buildApiUrl("/auth/login"));
