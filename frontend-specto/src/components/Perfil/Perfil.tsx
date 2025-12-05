import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./Perfil.css";
import NavBar from "../NavBar/NavBar";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";
import {
  applyTheme,
  coerceTheme,
  readTheme,
  subscribeTheme,
  type ThemeMode,
} from "../../utils/theme";
import { resolveAvatarUrl } from "../../utils/avatar";
import { buildApiUrl } from "../../utils/api";

type VistoItem = {
  id: number;
  tipo: "filme" | "serie";
  tmdb_id: number;
  titulo: string;
  titulo_original?: string | null;
  descricao?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  favorito: boolean;
  data_visto: string;
  media_avaliacao?: number | null;
  votos?: number | null;
};

type VistoResponse = {
  filmes: VistoItem[];
  series: VistoItem[];
};

type UserInfo = {
  id: number;
  username: string;
  email: string;
  theme_mode?: ThemeMode;
  avatar_url?: string | null;
};

const MAX_ITENS = 6;
const getStoredUser = (): UserInfo | null => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserInfo;
    if (parsed && "theme_mode" in parsed) {
      parsed.theme_mode = coerceTheme(parsed.theme_mode);
    }
    if ("avatar_url" in parsed) {
      parsed.avatar_url = resolveAvatarUrl(parsed.avatar_url);
    }
    return parsed;
  } catch {
    return null;
  }
};

export default function Perfil() {
  const getInitialTheme = (): ThemeMode => {
    const storedUser = getStoredUser();
    if (storedUser?.theme_mode) {
      return applyTheme(storedUser.theme_mode);
    }
    return readTheme();
  };
  const getInitialAuth = () => !!localStorage.getItem("token");

  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialTheme);

  const [vistos, setVistos] = useState<VistoResponse>({ filmes: [], series: [] });
  const [loading, setLoading] = useState(getInitialAuth);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(getInitialAuth);
  const [user, setUser] = useState<UserInfo | null>(() => getStoredUser());
  const [favoritoLoading, setFavoritoLoading] = useState<Record<number, boolean>>({});
  const [expandir, setExpandir] = useState({
    filmes: false,
    series: false,
  });
  const [showCopied, setShowCopied] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeTheme(setThemeMode);
    return unsubscribe;
  }, []);

  const userInitials = useMemo(() => {
    if (!user?.username) return "U";
    return user.username.trim().charAt(0).toUpperCase();
  }, [user]);

  const avatarUrl = user?.avatar_url ? resolveAvatarUrl(user.avatar_url) : null;

  useEffect(() => {
    const onStorage = () => {
      const token = localStorage.getItem("token");
      setIsAuthenticated(!!token);
      const stored = getStoredUser();
      setUser(stored);
      if (stored?.theme_mode) {
        setThemeMode(applyTheme(stored.theme_mode));
      } else if (!token) {
        setThemeMode(applyTheme("dark"));
      } else {
        setThemeMode(readTheme());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsAuthenticated(false);
      setVistos({ filmes: [], series: [] });
      setUser(null);
      setThemeMode(applyTheme("dark"));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const { signal } = controller;

    const carregarUtilizador = async () => {
      try {
        const response = await fetch(buildApiUrl("/me"), {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });

        if (response.status === 401) {
          setIsAuthenticated(false);
          setUser(null);
          setThemeMode(applyTheme("dark"));
          return;
        }

        if (!response.ok) {
          throw new Error("Não foi possível carregar os dados do utilizador.");
        }

        const data: UserInfo = await response.json();
        const normalizedTheme = coerceTheme(data.theme_mode);
        const normalizedUser: UserInfo = {
          ...data,
          theme_mode: normalizedTheme,
          avatar_url: resolveAvatarUrl(data.avatar_url),
        };
        setUser(normalizedUser);
        localStorage.setItem("user", JSON.stringify(normalizedUser));
        const applied = applyTheme(normalizedTheme);
        setThemeMode(applied);
      } catch (err) {
        if (signal.aborted) return;
        console.warn("Falha ao carregar dados do utilizador:", err);
      }
    };

    const carregarVistos = async () => {
      try {
        const response = await fetch(buildApiUrl("/vistos"), {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });

        if (response.status === 401) {
          setIsAuthenticated(false);
          setError("Precisas de iniciar sessão para veres os teus vistos.");
          setVistos({ filmes: [], series: [] });
          return;
        }

        if (!response.ok) {
          const detail = await response.text();
          throw new Error(detail || "Erro ao carregar vistos.");
        }

        const data: VistoResponse = await response.json();
        setVistos(data);
      } catch (err) {
        if (signal.aborted) return;
        console.error("Erro ao buscar vistos:", err);
        setError(err instanceof Error ? err.message : "Erro inesperado.");
      }
    };

    Promise.allSettled([carregarUtilizador(), carregarVistos()]).finally(() => {
      if (!signal.aborted) {
        setLoading(false);
      }
    });

    return () => controller.abort();
  }, [isAuthenticated]);

  const filmesFavoritos = useMemo(
    () => vistos.filmes.filter((item) => item.favorito),
    [vistos.filmes]
  );
  const filmesNaoFavoritos = useMemo(
    () => vistos.filmes.filter((item) => !item.favorito),
    [vistos.filmes]
  );
  const filmesOrdenados = useMemo(
    () => [...filmesFavoritos, ...filmesNaoFavoritos],
    [filmesFavoritos, filmesNaoFavoritos]
  );
  const seriesFavoritas = useMemo(
    () => vistos.series.filter((item) => item.favorito),
    [vistos.series]
  );
  const seriesNaoFavoritas = useMemo(
    () => vistos.series.filter((item) => !item.favorito),
    [vistos.series]
  );
  const seriesOrdenadas = useMemo(
    () => [...seriesFavoritas, ...seriesNaoFavoritas],
    [seriesFavoritas, seriesNaoFavoritas]
  );

  const handleToggleFavorito = async (item: VistoItem) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    const novoValor = !item.favorito;
    setFavoritoLoading((prev) => ({ ...prev, [item.id]: true }));

    try {
      const response = await fetch(buildApiUrl(`/vistos/${item.id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ favorito: novoValor }),
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(
          detail || "Não foi possível atualizar os favoritos neste momento."
        );
      }

      setVistos((prev) => ({
        filmes: prev.filmes.map((v) =>
          v.id === item.id ? { ...v, favorito: novoValor } : v
        ),
        series: prev.series.map((v) =>
          v.id === item.id ? { ...v, favorito: novoValor } : v
        ),
      }));
    } catch (err) {
      console.error("Erro ao atualizar favorito:", err);
    } finally {
      setFavoritoLoading((prev) => {
        const { [item.id]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const renderCards = (
    items: VistoItem[],
    mostrarTodos: boolean,
    onToggleFavorito: (item: VistoItem) => void
  ) => {
    if (!items.length) return null;
    const lista = mostrarTodos ? items : items.slice(0, MAX_ITENS);
    return (
      <div className="perfil-grid">
        {lista.map((item) => (
          <Link
            key={`${item.tipo}-${item.id}`}
            to={`/${item.tipo === "filme" ? "filme" : "serie"}/${item.tmdb_id}`}
            className={`perfil-card ${item.favorito ? "perfil-card-favorito" : ""}`}
          >
            <button
              type="button"
              className={`perfil-card-heart ${item.favorito ? "ativo" : ""}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onToggleFavorito(item);
              }}
              disabled={!!favoritoLoading[item.id]}
              aria-pressed={item.favorito}
              aria-label={
                item.favorito
                  ? "Remover dos favoritos"
                  : "Adicionar aos favoritos"
              }
            >
              <span className="perfil-card-heart-icon">
                {item.favorito ? "♥" : "♡"}
              </span>
            </button>
            <div className="perfil-card-thumb">
              <img
                src={
                  item.poster_path ||
                  (item.backdrop_path
                    ? item.backdrop_path
                    : "https://via.placeholder.com/200x300?text=Sem+Imagem")
                }
                alt={item.titulo}
              />
              {item.favorito && <span className="perfil-card-badge">★ Favorito</span>}
            </div>
            <div className="perfil-card-body">
              <h3 className="perfil-card-title">{item.titulo}</h3>

              <div className="perfil-card-info-top">
                {item.media_avaliacao !== null && item.media_avaliacao !== undefined && (
                  <span className="perfil-card-rating">
                    {item.media_avaliacao.toFixed(1)} ⭐
                    {item.votos !== null && item.votos !== undefined && item.votos > 0
                      ? ` · ${item.votos} votos`
                      : ""}
                  </span>
                )}
                <span className="perfil-card-sep">·</span>
                <span className="perfil-card-type">
                  {item.tipo === "filme" ? "Filme" : "Série"}
                </span>
              </div>

              <div className="perfil-card-info-bottom">
                {new Date(item.data_visto).toLocaleDateString("pt-PT")}
              </div>
            </div>


          </Link>
        ))}
      </div>
    );
  };

  return (
    <div className={`home-container ${themeMode === "dark" ? "dark" : "light"}`}>
      <NavBar toggleDarkMode={themeMode === "dark"} />
      {isAuthenticated && loading ? (
        <div className="perfil-loader">
          <LoadingSpinner color="#3b82f6" size="large" />
        </div>
      ) : (
        <div className="perfil-wrapper">
          {!isAuthenticated ? (
            <div className="perfil-empty">
              <p>Precisas de iniciar sessão para veres os teus vistos.</p>
              <Link className="perfil-btn" to="/Login">
                Iniciar sessão
              </Link>
            </div>
          ) : error ? (
            <div className="perfil-empty">
              <p>{error}</p>
            </div>
          ) : (
            <>
              {user && (
                <header className="perfil-header">
                  <div className="perfil-user">
                    <div className="perfil-user-avatar" aria-hidden="true">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Avatar do utilizador"
                          className="perfil-user-avatar-img"
                        />
                      ) : (
                        <span>{userInitials}</span>
                      )}
                    </div>
                    <div className="perfil-user-meta">
                      <h1>Olá, {user.username}</h1>
                      <p>{user.email}</p>
                    </div>
                  </div>
                  <div className="perfil-actions">
                    <div style={{ position: 'relative' }}>
                      <button
                        className="perfil-share-btn-text"
                        onClick={() => {
                          const url = `${window.location.origin}/u/${user.id}`;
                          navigator.clipboard.writeText(url);
                          setShowCopied(true);
                          setTimeout(() => setShowCopied(false), 2000);
                        }}
                      >
                        Partilhar
                      </button>
                      {showCopied && (
                        <div className="perfil-share-toast">
                          Link copiado!
                        </div>
                      )}
                    </div>
                    <Link to="/perfil/editar" className="perfil-edit-btn">
                      Editar perfil
                    </Link>
                  </div>
                </header>
              )}

              <main className="perfil-content">
                <section>
                  <h2>Filmes vistos</h2>
                  {vistos.filmes.length ? (
                    <>
                      {renderCards(filmesOrdenados, expandir.filmes, handleToggleFavorito)}
                      {filmesOrdenados.length > MAX_ITENS && (
                        <button
                          className={`perfil-toggle favoritos ${expandir.filmes ? "ativo" : ""}`}
                          onClick={() =>
                            setExpandir((prev) => ({ ...prev, filmes: !prev.filmes }))
                          }
                        >
                          {expandir.filmes ? "Fechar favoritos" : "Mostrar favoritos"}
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="perfil-empty">Ainda não tens filmes vistos.</p>
                  )}
                </section>

                <section>
                  <h2>Séries vistas</h2>
                  {vistos.series.length ? (
                    <>
                      {renderCards(seriesOrdenadas, expandir.series, handleToggleFavorito)}
                      {seriesOrdenadas.length > MAX_ITENS && (
                        <button
                          className={`perfil-toggle favoritos ${expandir.series ? "ativo" : ""}`}
                          onClick={() =>
                            setExpandir((prev) => ({ ...prev, series: !prev.series }))
                          }
                        >
                          {expandir.series ? "Fechar favoritos" : "Mostrar favoritos"}
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="perfil-empty">Ainda não tens séries vistas.</p>
                  )}
                </section>
              </main>
            </>
          )}
        </div>
      )}
    </div>
  );
}
