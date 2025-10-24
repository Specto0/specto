import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./Perfil.css";
import NavBar from "../NavBar/NavBar";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";

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

const MAX_ITENS = 6;

export default function Perfil() {
  const getInitialTheme = () => localStorage.getItem("tema") !== "light";
  const getInitialAuth = () => !!localStorage.getItem("token");

  const [toggleDarkMode, setToggleDarkMode] = useState(getInitialTheme);
  const toggleDarkTheme = () => {
    setToggleDarkMode((prev) => {
      const novoTema = !prev;
      localStorage.setItem("tema", novoTema ? "dark" : "light");
      return novoTema;
    });
  };

  const [vistos, setVistos] = useState<VistoResponse>({ filmes: [], series: [] });
  const [loading, setLoading] = useState(getInitialAuth);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(getInitialAuth);
  const [favoritoLoading, setFavoritoLoading] = useState<Record<number, boolean>>({});
  const [expandir, setExpandir] = useState({
    filmes: false,
    series: false,
  });

  useEffect(() => {
    const onStorage = () => setIsAuthenticated(!!localStorage.getItem("token"));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsAuthenticated(false);
      setVistos({ filmes: [], series: [] });
      setLoading(false);
      return;
    }

    setIsAuthenticated(true);
    setLoading(true);
    setError(null);

    const controller = new AbortController();

    fetch("http://127.0.0.1:8000/vistos", {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (res.status === 401) {
          throw new Error("Precisas de iniciar sessão para veres os teus vistos.");
        }
        if (!res.ok) {
          const detail = await res.text();
          throw new Error(detail || "Erro ao carregar vistos.");
        }
        return res.json();
      })
      .then((data: VistoResponse) => setVistos(data))
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error("Erro ao buscar vistos:", err);
        setError(err instanceof Error ? err.message : "Erro inesperado.");
      })
      .finally(() => setLoading(false));

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
      const response = await fetch(`http://127.0.0.1:8000/vistos/${item.id}`, {
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
              <h3>{item.titulo}</h3>
              {item.media_avaliacao !== null && item.media_avaliacao !== undefined && (
                <p className="perfil-card-meta">
                  {item.media_avaliacao.toFixed(1)} ⭐
                  {item.votos !== null && item.votos !== undefined && item.votos > 0
                    ? ` · ${item.votos} votos`
                    : ""}
                </p>
              )}
              <p className="perfil-card-meta">
                {item.tipo === "filme" ? "Filme" : "Série"} ·{" "}
                {new Date(item.data_visto).toLocaleDateString("pt-PT")}
              </p>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <div className={`home-container ${toggleDarkMode ? "dark" : "light"}`}>
      <NavBar
        query=""
        setQuery={() => {}}
        searching={false}
        handleSearch={(e) => e.preventDefault()}
        resetSearch={() => {}}
        toggleDarkMode={toggleDarkMode}
        toggleDarkTheme={toggleDarkTheme}
      />
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
          )}
        </div>
      )}
    </div>
  );
}
