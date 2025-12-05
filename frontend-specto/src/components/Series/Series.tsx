import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../NavBar/NavBar";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";
import "../Home/Home.css";
import "../Perfil/Perfil.css";
import "./Series.css";
import { readTheme, subscribeTheme, type ThemeMode } from "../../utils/theme";
import { buildApiUrl } from "@/utils/api";

type SerieAPI = {
  id: number;
  titulo?: string | null;
  name?: string | null;
  original_name?: string | null;
  title?: string | null;
  original_title?: string | null;
  nome?: string | null;
  poster_path?: string | null;
  poster?: string | null;
  first_air_date?: string | null;
  ano?: string | number | null;
};

export type Serie = {
  id: number;
  titulo: string;
  poster: string | null;
  ano?: number;
  tipo: "serie";
};

const SERIES_PER_PAGE = 24;

const normalizeTitulo = (item: SerieAPI): string => {
  const candidates = [
    item.titulo,
    item.name,
    item.original_name,
    item.title,
    item.original_title,
    item.nome,
  ];
  const titulo = candidates.find((value) => typeof value === "string" && value.trim());
  return titulo ? titulo.trim() : "Sem título";
};

const normalizeAno = (value?: string | number | null): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const year = Number.parseInt(value.slice(0, 4), 10);
    return Number.isFinite(year) ? year : undefined;
  }
  return undefined;
};

const mapSerie = (item: SerieAPI): Serie => ({
  id: item.id,
  titulo: normalizeTitulo(item),
  poster: item.poster_path ?? item.poster ?? null,
  ano: normalizeAno(item.first_air_date ?? item.ano),
  tipo: "serie",
});

const getPosterUrl = (poster: string | null) => {
  if (!poster) return "/imagens/placeholder.png";
  if (poster.startsWith("http")) return poster;
  return `https://image.tmdb.org/t/p/w500${poster}`;
};

const Series = () => {
  const [series, setSeries] = useState<Serie[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"az" | "za" | "anoC" | "anoD">("az");
  const [currentPage, setCurrentPage] = useState(1);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readTheme());

  useEffect(() => {
    const unsubscribe = subscribeTheme(setThemeMode);
    return unsubscribe;
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(buildApiUrl("/series/populares"))
      .then((response) => response.json())
      .then((data) => {
        const seriesArray: SerieAPI[] = Array.isArray(data.results)
          ? data.results
          : data;
        const seriesFormatadas = seriesArray
          .filter((item): item is SerieAPI => typeof item?.id === "number")
          .map(mapSerie);

        const seriesUnicas = Array.from(
          new Map(seriesFormatadas.map((s) => [s.id, s])).values()
        );

        setSeries(seriesUnicas);
      })
      .catch((error) => console.error("Erro ao carregar séries:", error))
      .finally(() => setLoading(false));
  }, []);

  const filteredSeries = useMemo(() => {
    return series
      .filter((serie) =>
        serie.titulo.toLowerCase().includes(filter.toLowerCase())
      )
      .sort((a, b) => {
        switch (sortOrder) {
          case "az":
            return a.titulo.localeCompare(b.titulo);
          case "za":
            return b.titulo.localeCompare(a.titulo);
          case "anoC":
            return (a.ano || 0) - (b.ano || 0);
          case "anoD":
            return (b.ano || 0) - (a.ano || 0);
          default:
            return 0;
        }
      });
  }, [series, filter, sortOrder]);

  const totalPages = Math.ceil(filteredSeries.length / SERIES_PER_PAGE);
  const startIndex = (currentPage - 1) * SERIES_PER_PAGE;
  const currentSeries = filteredSeries.slice(
    startIndex,
    startIndex + SERIES_PER_PAGE
  );

  const nextPage = () => {
    setCurrentPage((prev) => {
      const next = Math.min(prev + 1, totalPages);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return next;
    });
  };

  const prevPage = () => {
    setCurrentPage((prev) => {
      const prevValue = Math.max(prev - 1, 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return prevValue;
    });
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, sortOrder]);

  return (
    <div className={`home-container ${themeMode === "dark" ? "dark" : "light"}`}>
      <NavBar toggleDarkMode={themeMode === "dark"} />

      <section className="series-section">
        <h2>📺 Séries</h2>

        <div className="filters-container">
          <input
            type="text"
            placeholder="Filtrar por nome..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={themeMode === "dark" ? "dark-input" : "light-input"}
          />
          <select
            value={sortOrder}
            onChange={(e) =>
              setSortOrder(e.target.value as "az" | "za" | "anoC" | "anoD")
            }
            className={themeMode === "dark" ? "dark-input" : "light-input"}
          >
            <option value="az">Título A–Z</option>
            <option value="za">Título Z–A</option>
            <option value="anoC">Ano Crescente</option>
            <option value="anoD">Ano Decrescente</option>
          </select>
        </div>

        {loading ? (
          <LoadingSpinner color="#3b82f6" size="large" />
        ) : (
          <div className="grid-series">
            {currentSeries.length > 0 ? (
              currentSeries.map((serie) => (
                <Link
                  to={`/serie/${serie.id}`}
                  key={serie.id}
                  className="perfil-card home-card series-card"
                >
                  <div className="perfil-card-thumb home-card-thumb series-card-thumb">
                    <img src={getPosterUrl(serie.poster)} alt={serie.titulo} />
                  </div>
                  <div className="perfil-card-body home-card-body series-card-body">
                    <h3 className="perfil-card-title">{serie.titulo}</h3>
                    <div className="perfil-card-info-top">
                      <span className="perfil-card-type">Série</span>
                      {serie.ano && (
                        <>
                          <span className="perfil-card-sep">·</span>
                          <span className="series-card-year">{serie.ano}</span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p>Nenhuma série encontrada.</p>
            )}
          </div>
        )}

        {filteredSeries.length > SERIES_PER_PAGE && (
          <div className="pagination-container">
            <button onClick={prevPage} disabled={currentPage === 1}>
              ⬅ Anterior
            </button>
            <span>
              Página {currentPage} de {totalPages}
            </span>
            <button onClick={nextPage} disabled={currentPage === totalPages}>
              Seguinte ➡
            </button>
          </div>
        )}
      </section>

    </div>
  );
};

export default Series;
