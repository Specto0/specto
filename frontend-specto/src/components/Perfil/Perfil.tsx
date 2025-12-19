import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
import { buildApiUrl } from "@/utils/api";

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
  xp?: number;
  level?: number;
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
  const { userId } = useParams();

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
  const [loading, setLoading] = useState(true); // Always start loading to decide flow
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(getInitialAuth);

  // "user" is the profile being displayed
  const [user, setUser] = useState<UserInfo | null>(null);

  // "currentUser" is the logged in user (from local storage)
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(() => getStoredUser());

  const [favoritoLoading, setFavoritoLoading] = useState<Record<number, boolean>>({});
  const [expandir, setExpandir] = useState({
    filmes: false,
    series: false,
  });
  const [showCopied, setShowCopied] = useState(false);
  const [filmesTab, setFilmesTab] = useState<"todos" | "favoritos" | "vistos">("todos");
  const [seriesTab, setSeriesTab] = useState<"todos" | "favoritos" | "vistos">("todos");
  const [reputation, setReputation] = useState<{
    xp: number;
    level: number;
    achievements: Array<{
      id: number;
      name: string;
      description: string;
      icon_url?: string;
      xp_reward: number;
      unlocked_at?: string;
    }>;
  } | null>(null);

  // Determine if the viewer is the owner of the profile
  const isOwner = useMemo(() => {
    if (!userId) return true; // /perfil route
    if (currentUser && userId && currentUser.id === Number(userId)) return true;
    return false;
  }, [userId, currentUser]);

  useEffect(() => {
    const unsubscribe = subscribeTheme(setThemeMode);
    return unsubscribe;
  }, []);

  const userInitials = useMemo(() => {
    if (!user?.username) return "U";
    return user.username.trim().charAt(0).toUpperCase();
  }, [user]);

  const avatarUrl = user?.avatar_url ? resolveAvatarUrl(user.avatar_url) : null;

  // Listen for storage changes (login/logout in other tabs)
  useEffect(() => {
    const onStorage = () => {
      const token = localStorage.getItem("token");
      setIsAuthenticated(!!token);
      const stored = getStoredUser();
      setCurrentUser(stored);
      // Only update theme if we are the owner or not viewing a specific profile?
      // For now, keep existing logic but apply to currentUser preferences
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
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const { signal } = controller;

    // SCENARIO 1: Viewing another user's profile (Public View)
    if (userId) {
      const loadPublicProfile = async () => {
        try {
          const res = await fetch(buildApiUrl(`/users/${userId}/profile`), { signal });
          if (!res.ok) {
            if (res.status === 404) throw new Error("Utilizador não encontrado.");
            throw new Error("Erro ao carregar perfil.");
          }
          const data = await res.json();

          // Normalize user data
          const normalizedUser: UserInfo = {
            ...data.user,
            // Public profile might not return theme/email depending on privacy, 
            // but our endpoint returns them.
            avatar_url: resolveAvatarUrl(data.user.avatar_url),
          };

          setUser(normalizedUser);
          setVistos(data.vistos);
          setReputation(data.reputation);

        } catch (err) {
          if (signal.aborted) return;
          console.error("Erro ao carregar perfil público:", err);
          setError(err instanceof Error ? err.message : "Erro desconhecido.");
        } finally {
          if (!signal.aborted) setLoading(false);
        }
      };
      loadPublicProfile();
      return () => controller.abort();
    }

    // SCENARIO 2: Viewing own profile (/perfil)
    if (!token) {
      setIsAuthenticated(false);
      setVistos({ filmes: [], series: [] });
      setUser(null);
      setThemeMode(applyTheme("dark"));
      setLoading(false);
      return;
    }

    // Fetch own data
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
        setCurrentUser(normalizedUser); // Update current user as well
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
        const response = await fetch(buildApiUrl("/vistos/"), {
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

    const carregarReputacao = async () => {
      try {
        const response = await fetch(buildApiUrl("/users/me/reputation"), {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });
        if (response.ok) {
          const data = await response.json();
          setReputation(data);
        }
      } catch (err) {
        console.error("Erro ao buscar reputação:", err);
      }
    };

    Promise.allSettled([carregarUtilizador(), carregarVistos(), carregarReputacao()]).finally(() => {
      if (!signal.aborted) {
        setLoading(false);
      }
    });

    return () => controller.abort();
  }, [isAuthenticated, userId]); // Re-run if userId changes

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
    // Only allow toggling if it's the owner's profile
    if (!isOwner) return;

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
                if (isOwner) {
                  onToggleFavorito(item);
                }
              }}
              disabled={!!favoritoLoading[item.id] || !isOwner}
              style={{ cursor: isOwner ? "pointer" : "default", opacity: isOwner ? 1 : 0.7 }}
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
                {item.media_avaliacao !== null &&
                  item.media_avaliacao !== undefined && (
                    <span className="perfil-card-rating">
                      {item.media_avaliacao.toFixed(1)} ⭐
                      {item.votos !== null &&
                        item.votos !== undefined &&
                        item.votos > 0
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

  const LEVEL_THRESHOLDS: Record<number, number> = {
    1: 0,
    2: 100,
    3: 300,
    4: 600,
    5: 1000,
    6: 1500,
    7: 2100,
    8: 2800,
    9: 3600,
    10: 4500
  };

  const getNextLevelXp = (level: number) => {
    return LEVEL_THRESHOLDS[level + 1] || LEVEL_THRESHOLDS[10];
  };

  const currentLevel = user?.level || reputation?.level || 1;
  const currentXp = user?.xp || reputation?.xp || 0;
  const nextLevelXp = getNextLevelXp(currentLevel);
  const progressPercent = Math.min((currentXp / nextLevelXp) * 100, 100);

  return (
    <div className={`home-container ${themeMode === "dark" ? "dark" : "light"}`}>
      <NavBar toggleDarkMode={themeMode === "dark"} />
      {loading ? (
        <div className="perfil-loader">
          <LoadingSpinner color="#3b82f6" size="large" />
        </div>
      ) : (
        <div className="perfil-wrapper">
          {/* If viewing own profile and not authenticated */}
          {!userId && !isAuthenticated ? (
            <div className="perfil-empty">
              <p>Precisas de iniciar sessão para veres os teus vistos.</p>
              <Link className="perfil-btn" to="/Login">
                Iniciar sessão
              </Link>
            </div>
          ) : error ? (
            <div className="perfil-empty">
              <p>{error}</p>
              {!userId && <Link className="perfil-btn" to="/Login">Iniciar sessão</Link>}
              {userId && <Link className="perfil-btn" to="/home">Voltar ao Início</Link>}
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
                      <h1>{isOwner ? `Olá, ${user.username}` : `Perfil de ${user.username}`}</h1>
                      <p>{isOwner ? user.email : `Membro desde ${new Date().getFullYear()}`}</p>
                    </div>
                  </div>
                  <div className="perfil-actions">
                    <div style={{ position: "relative" }}>
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
                    {isOwner && (
                      <Link to="/perfil/editar" className="perfil-edit-btn">
                        Editar perfil
                      </Link>
                    )}
                  </div>
                </header>
              )}

              <main className="perfil-content">
                {/* Gamification Section */}
                <section className="perfil-reputation">
                  <div className="perfil-level-card">
                    <div className="perfil-level-info">
                      <h2>Nível {currentLevel}</h2>
                      <span className="perfil-xp">
                        {currentXp} / {nextLevelXp} XP
                      </span>
                    </div>
                    <div className="perfil-xp-bar-container">
                      <div
                        className="perfil-xp-bar"
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                    <p className="perfil-next-level">
                      Faltam {nextLevelXp - currentXp} XP para o nível {currentLevel + 1}
                    </p>
                  </div>

                  {isOwner && (
                    <div className="perfil-xp-guide">
                      <h3>Como ganhar XP</h3>
                      <div className="perfil-xp-actions">
                        <div className="perfil-xp-action">
                          <span className="xp-icon">❤️</span>
                          <div className="xp-details">
                            <strong>Adicionar aos Favoritos</strong>
                            <span>+10 XP</span>
                          </div>
                        </div>
                        <div className="perfil-xp-action">
                          <span className="xp-icon">💬</span>
                          <div className="xp-details">
                            <strong>Comentar</strong>
                            <span>+5 XP</span>
                          </div>
                        </div>
                        <div className="perfil-xp-action">
                          <span className="xp-icon">👁️</span>
                          <div className="xp-details">
                            <strong>Marcar como Visto</strong>
                            <span>+2 XP</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="perfil-achievements">
                    <h3>Conquistas</h3>
                    <div className="perfil-badges-grid">
                      {reputation?.achievements?.length ? (
                        reputation.achievements.map((ach) => {
                          // Check if icon is emoji (not a URL)
                          const isEmoji = ach.icon_url && !ach.icon_url.startsWith('http') && !ach.icon_url.startsWith('/');
                          return (
                            <div key={ach.id} className={`perfil-badge ${ach.unlocked_at ? "unlocked" : "locked"}`} title={ach.description}>
                              <div className="perfil-badge-icon">
                                {isEmoji ? (
                                  <span className="perfil-badge-emoji">{ach.icon_url}</span>
                                ) : ach.icon_url ? (
                                  <img src={ach.icon_url} alt={ach.name} />
                                ) : (
                                  <span className="perfil-badge-emoji">🏆</span>
                                )}
                              </div>
                              <span className="perfil-badge-name">{ach.name}</span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="perfil-empty-badges">Ainda não tens conquistas desbloqueadas.</p>
                      )}
                    </div>
                  </div>
                </section>

                <section>
                  <h2>Filmes</h2>
                  <div className="perfil-tabs">
                    <button 
                      className={`perfil-tab ${filmesTab === "todos" ? "active" : ""}`}
                      onClick={() => setFilmesTab("todos")}
                    >
                      📽️ Todos ({vistos.filmes.length})
                    </button>
                    <button 
                      className={`perfil-tab ${filmesTab === "favoritos" ? "active" : ""}`}
                      onClick={() => setFilmesTab("favoritos")}
                    >
                      ❤️ Favoritos ({filmesFavoritos.length})
                    </button>
                    <button 
                      className={`perfil-tab ${filmesTab === "vistos" ? "active" : ""}`}
                      onClick={() => setFilmesTab("vistos")}
                    >
                      👁️ Só Vistos ({filmesNaoFavoritos.length})
                    </button>
                  </div>
                  {(() => {
                    const listaFilmes = filmesTab === "favoritos" 
                      ? filmesFavoritos 
                      : filmesTab === "vistos" 
                        ? filmesNaoFavoritos 
                        : filmesOrdenados;
                    
                    if (!listaFilmes.length) {
                      return (
                        <p className="perfil-empty">
                          {filmesTab === "favoritos" 
                            ? "Ainda não tens filmes favoritos. Clica no ♡ para adicionar!" 
                            : filmesTab === "vistos" 
                              ? "Todos os teus filmes são favoritos!" 
                              : "Ainda não tens filmes vistos."}
                        </p>
                      );
                    }
                    
                    return (
                      <>
                        {renderCards(
                          listaFilmes,
                          expandir.filmes,
                          handleToggleFavorito
                        )}
                        {listaFilmes.length > MAX_ITENS && (
                          <button
                            className={`perfil-toggle ${expandir.filmes ? "ativo" : ""}`}
                            onClick={() =>
                              setExpandir((prev) => ({
                                ...prev,
                                filmes: !prev.filmes,
                              }))
                            }
                          >
                            {expandir.filmes ? "Ver menos" : `Ver todos (${listaFilmes.length})`}
                          </button>
                        )}
                      </>
                    );
                  })()}
                </section>

                <section>
                  <h2>Séries</h2>
                  <div className="perfil-tabs">
                    <button 
                      className={`perfil-tab ${seriesTab === "todos" ? "active" : ""}`}
                      onClick={() => setSeriesTab("todos")}
                    >
                      📺 Todas ({vistos.series.length})
                    </button>
                    <button 
                      className={`perfil-tab ${seriesTab === "favoritos" ? "active" : ""}`}
                      onClick={() => setSeriesTab("favoritos")}
                    >
                      ❤️ Favoritas ({seriesFavoritas.length})
                    </button>
                    <button 
                      className={`perfil-tab ${seriesTab === "vistos" ? "active" : ""}`}
                      onClick={() => setSeriesTab("vistos")}
                    >
                      👁️ Só Vistas ({seriesNaoFavoritas.length})
                    </button>
                  </div>
                  {(() => {
                    const listaSeries = seriesTab === "favoritos" 
                      ? seriesFavoritas 
                      : seriesTab === "vistos" 
                        ? seriesNaoFavoritas 
                        : seriesOrdenadas;
                    
                    if (!listaSeries.length) {
                      return (
                        <p className="perfil-empty">
                          {seriesTab === "favoritos" 
                            ? "Ainda não tens séries favoritas. Clica no ♡ para adicionar!" 
                            : seriesTab === "vistos" 
                              ? "Todas as tuas séries são favoritas!" 
                              : "Ainda não tens séries vistas."}
                        </p>
                      );
                    }
                    
                    return (
                      <>
                        {renderCards(
                          listaSeries,
                          expandir.series,
                          handleToggleFavorito
                        )}
                        {listaSeries.length > MAX_ITENS && (
                          <button
                            className={`perfil-toggle ${expandir.series ? "ativo" : ""}`}
                            onClick={() =>
                              setExpandir((prev) => ({
                                ...prev,
                                series: !prev.series,
                              }))
                            }
                          >
                            {expandir.series ? "Ver menos" : `Ver todas (${listaSeries.length})`}
                          </button>
                        )}
                      </>
                    );
                  })()}
                </section>
              </main>
            </>
          )}
        </div>
      )}
    </div>
  );
}
