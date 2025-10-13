import React, { useState, useEffect } from "react";
import NavBar from "../NavBar/NavBar";
import { Link } from "react-router-dom";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";
import "../Home/Home.css";
import "./Series.css";

export type Serie = {
  id: number;
  titulo: string;
  poster: string | null;
  ano?: number;
  tipo: "serie";
};

const Series: React.FC = () => {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [toggleDarkMode, setToggleDarkMode] = useState(true);
  const [series, setSeries] = useState<Serie[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"az" | "za" | "anoC" | "anoD">("az");

  const [currentPage, setCurrentPage] = useState(1);
  const seriesPerPage = 24;

  const handleSearch = () => setSearching(true);
  const resetSearch = () => {
    setSearching(false);
    setQuery("");
  };
  const toggleDarkTheme = () => setToggleDarkMode((prev) => !prev);

  useEffect(() => {
    setLoading(true);
    fetch("http://127.0.0.1:8000/series/populares")
      .then((response) => response.json())
      .then((data) => {
        const seriesArray = Array.isArray(data.results) ? data.results : data;

        const seriesFormatadas: Serie[] = seriesArray.map((s: any) => ({
          id: s.id,
          titulo: s.titulo || s.title || "Sem título",
          poster: s.poster_path || s.poster|| null,
          ano: s.release_date
              ? parseInt(s.release_date.split("-")[0])
              : undefined,
          tipo: "serie",
        }));

        // Remove duplicados (ID)
        const seriesUnicas = Array.from(
          new Map(seriesFormatadas.map((s) => [s.id, s])).values()
        );

        setSeries(seriesUnicas);
      })
      .catch((error) => console.error("Erro ao carregar séries:", error))
      .finally(() => setLoading(false));
  }, []);

  const filteredSeries = series
    .filter((serie) =>serie.titulo.toLowerCase().includes(filter.toLowerCase()))
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

  const totalPages = Math.ceil(filteredSeries.length / seriesPerPage);
  const startIndex = (currentPage - 1) * seriesPerPage;
  const currentSeries = filteredSeries.slice(startIndex, startIndex + seriesPerPage );

  const nextPage = () => {
    setCurrentPage((prev) => {
      const next = Math.min(prev + 1, totalPages);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return next;
    });
  };

  const prevPage = () => {
    setCurrentPage((prev) => {
      const prevPage = Math.max(prev - 1, 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return prevPage;
    });
  };

  return (
    <div className={`home-container ${toggleDarkMode ? "dark" : "light"}`}>
      <NavBar
        query={query}
        setQuery={setQuery}
        searching={searching}
        handleSearch={handleSearch}
        resetSearch={resetSearch}
        toggleDarkMode={toggleDarkMode}
        toggleDarkTheme={toggleDarkTheme}
      />

      <section className="series-section">
        <h2>📺 Séries</h2>

        <div className="filters-container">
          <input
            type="text"
            placeholder="Filtrar por nome..."
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setCurrentPage(1);
            }}
            className={toggleDarkMode ? "dark-input" : "light-input"}
          />
          <select
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value as "az" | "za" | "anoC" | "anoD");
              setCurrentPage(1);
            }}
            className={toggleDarkMode ? "dark-input" : "light-input"}
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
                <Link to={`/serie/${serie.id}`} key={serie.id} className="card">
                  <img
                    src={
                      serie.poster
                        ? `https://image.tmdb.org/t/p/w500${serie.poster}`
                        : "/imagens/placeholder.png"
                    }
                    alt={serie.titulo}
                  />
                  <h3>{serie.titulo}</h3>
                  {serie.ano && <p>{serie.ano}</p>}
                </Link>
              ))
            ) : (
              <p>Nenhuma série encontrada.</p>
            )}
          </div>
        )}

        {filteredSeries.length > seriesPerPage && (
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

      {searching && <p>Resultados da pesquisa...</p>}
    </div>
  );
};

export default Series;
