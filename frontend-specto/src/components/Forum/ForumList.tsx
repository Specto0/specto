import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../utils/api";
import NavBar from "../NavBar/NavBar";
import { readTheme, subscribeTheme, type ThemeMode } from "../../utils/theme";
import "./Forum.css";

type ForumTopItem = {
  id: number;
  title: string;
  poster_url?: string | null;
  rating?: number | null;
};

type ForumTopList = {
  movies: ForumTopItem[];
  series: ForumTopItem[];
};

export default function ForumList() {
  const navigate = useNavigate();
  const token = React.useMemo(() => localStorage.getItem("token"), []);

  const [topList, setTopList] = useState<ForumTopList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingTopic, setCreatingTopic] = useState(false);

  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readTheme());

  useEffect(() => {
    const unsubscribe = subscribeTheme(setThemeMode);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchTop = async () => {
      try {
        const res = await fetch(buildApiUrl("/forum/top-items"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          navigate("/login");
          return;
        }
        if (!res.ok) throw new Error("Falha ao carregar top items");
        const data = await res.json();
        setTopList(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    };

    fetchTop();
  }, [token, navigate]);

  const handleItemClick = async (item: ForumTopItem, type: "movie" | "tv") => {
    if (creatingTopic || !token) return;
    setCreatingTopic(true);
    try {
      const res = await fetch(buildApiUrl("/forum/topics/ensure"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tmdb_id: item.id,
          media_type: type,
          title: item.title,
        }),
      });

      if (res.status === 401) {
        navigate("/login");
        return;
      }

      if (!res.ok) throw new Error("Erro ao entrar no tópico");

      const topic = await res.json();
      navigate(`/forum/${topic.id}`);
    } catch (err) {
      console.error(err);
      alert("Não foi possível entrar no chat.");
    } finally {
      setCreatingTopic(false);
    }
  };

  // Determina se um item está "em alta" (para demo, top 2 de cada categoria)
  const isHot = (index: number) => index < 2;

  if (!token) return null;

  return (
    <div className={`forum-page ${themeMode === "dark" ? "dark" : "light"}`}>
      <NavBar toggleDarkMode={themeMode === "dark"} />

      <div className="forum-container">
        <div className="forum-header">
          <h1>Fórum da Comunidade</h1>
          <p>Discute em tempo real sobre os filmes e séries mais populares do momento.</p>
        </div>

        {loading && <div className="forum-loading">A carregar...</div>}
        {error && <div className="forum-error">{error}</div>}

        {!loading && topList && (
          <>
            <section className="forum-section">
              <h2>🔥 Top 5 Filmes</h2>
              <div className="forum-grid-top">
                {topList.movies.map((movie, index) => (
                  <div
                    key={movie.id}
                    className="forum-card-top"
                    onClick={() => handleItemClick(movie, "movie")}
                  >
                    {isHot(index) && (
                      <span className="hot-badge">🔥 Em alta</span>
                    )}
                    <div className="forum-poster">
                      {movie.poster_url ? (
                        <img src={movie.poster_url} alt={movie.title} />
                      ) : (
                        <div className="poster-placeholder">{movie.title[0]}</div>
                      )}
                      <div className="forum-overlay">
                        <span>Entrar no Chat</span>
                      </div>
                    </div>
                    {movie.rating && <span className="rating-badge">⭐ {movie.rating.toFixed(1)}</span>}
                    <h3>{movie.title}</h3>
                    <div className="topic-stats">
                      <span className="topic-stat">💬 Chat ativo</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="forum-section">
              <h2>📺 Top 5 Séries</h2>
              <div className="forum-grid-top">
                {topList.series.map((serie, index) => (
                  <div
                    key={serie.id}
                    className="forum-card-top"
                    onClick={() => handleItemClick(serie, "tv")}
                  >
                    {isHot(index) && (
                      <span className="hot-badge">🔥 Em alta</span>
                    )}
                    <div className="forum-poster">
                      {serie.poster_url ? (
                        <img src={serie.poster_url} alt={serie.title} />
                      ) : (
                        <div className="poster-placeholder">{serie.title[0]}</div>
                      )}
                      <div className="forum-overlay">
                        <span>Entrar no Chat</span>
                      </div>
                    </div>
                    {serie.rating && <span className="rating-badge">⭐ {serie.rating.toFixed(1)}</span>}
                    <h3>{serie.title}</h3>
                    <div className="topic-stats">
                      <span className="topic-stat">💬 Chat ativo</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
