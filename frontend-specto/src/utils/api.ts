// -----------------------------
// Helper: remove barras no fim
// -----------------------------
const stripTrailingSlash = (value: string): string =>
  value.replace(/\/+$/, "");


// -----------------------------------------------------
// 1) BASE URL vindas das variáveis de ambiente do Vercel
//    (ÚNICA fonte válida em produção)
// -----------------------------------------------------
const resolveEnvBaseUrl = (): string | null => {
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;

  if (raw && typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed) {
      return stripTrailingSlash(trimmed);
    }
  }

  return null;
};


// --------------------------------------------------------------------
// 2) Base URL do browser — APENAS para ambiente local (localhost)
// --------------------------------------------------------------------
const resolveBrowserBaseUrl = (): string | null => {
  if (typeof window === "undefined") return null;

  const { protocol, hostname } = window.location;

  // Dev local → frontend em localhost:5173 → backend em localhost:8000
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//${hostname}:8000`;
  }

  // Em produção NÃO QUEREMOS isto
  return null;
};


// ------------------------------------------------------------
// 3) API_BASE_URL final — prioridade:
//    (1) variável de ambiente (produção)
//    (2) localhost em desenvolvimento
//    (3) fallback para evitar crash
// ------------------------------------------------------------
export const API_BASE_URL =
  resolveEnvBaseUrl() ??
  resolveBrowserBaseUrl() ??
  "http://127.0.0.1:8000";


// ------------------------------------------------------------
// 4) Função auxiliar para construir URLs de API
// ------------------------------------------------------------
export const buildApiUrl = (path: string): string => {
  if (!path) return API_BASE_URL;

  const formattedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${formattedPath}`;
};


// ------------------------------------------------------------
// DEBUG TEMPORÁRIO (podes remover depois)
// ------------------------------------------------------------
console.log("🔧 API_BASE_URL =>", API_BASE_URL);
console.log("🔧 login URL =>", buildApiUrl("/auth/login"));
