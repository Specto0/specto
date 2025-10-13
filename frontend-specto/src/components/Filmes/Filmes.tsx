import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import NavBar from "../NavBar/NavBar";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";
import "../Home/Home.css";
import "./Filmes.css";

export type Filme = {
  id: number;
  titulo: string;
  poster: string | null;
  ano?: number;
  tipo: "filme";
};

const Filmes: React.FC = () => {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [toggleDarkMode, setToggleDarkMode] = useState(true);
  const [movies, setMovies] = useState<Filme[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"az" | "za" | "anoC" | "anoD">("az");
  const [currentPage, setCurrentPage] = useState(1);

  const moviesPerPage = 24;

  // Pesquisa e tema
  const handleSearch = () => setSearching(true);
  const resetSearch = () => {
    setSearching(false);
    setQuery("");
  };
  const toggleDarkTheme = () => setToggleDarkMode((prev) => !prev);

  // Fetch filmes
  useEffect(() => {
    setLoading(true);
    fetch("http://127.0.0.1:8000/filmes/populares")
      .then((response) => {
        if (!response.ok) throw new Error("Erro na resposta da API");
        return response.json();
      })
      .then((data) => {
        const filmesArray = Array.isArray(data.results) ? data.results : data;

        const filmesFormatados: Filme[] = filmesArray.map((f: any) => ({
          id: f.id,
          titulo: f.title || f.titulo || "Sem título",
          poster: f.poster_path || f.poster || null,
          ano: f.release_date ? parseInt(f.release_date.split("-")[0]) : undefined,
          tipo: "filme",
        }));

        // Remover duplicados
        const filmesUnicos = Array.from(
          new Map(filmesFormatados.map((f) => [f.id, f])).values()
        );

        setMovies(filmesUnicos);
      })
      .catch((error) => console.error("Erro ao carregar filmes:", error))
      .finally(() => setLoading(false));
  }, []);

  // Filtros e ordenação
  const filteredMovies = movies
    .filter((movie) =>
      movie.titulo.toLowerCase().includes(filter.toLowerCase())
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

  // Paginação
  const totalPages = Math.ceil(filteredMovies.length / moviesPerPage);
  const startIndex = (currentPage - 1) * moviesPerPage;
  const currentMovies = filteredMovies.slice(startIndex, startIndex + moviesPerPage);

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

      <section className="filmes-section">
        <h2>🎬 Filmes</h2>

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
            onChange={(e) =>
              setSortOrder(e.target.value as "az" | "za" | "anoC" | "anoD")
            }
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
          <div className="grid-filmes">
            {currentMovies.length > 0 ? (
              currentMovies.map((movie) => (
                <Link to={`/filme/${movie.id}`} key={movie.id} className="card">
                  <img
                    src={
                      movie.poster
                        ? `https://image.tmdb.org/t/p/w500${movie.poster}`
                        : "/imagens/placeholder.png"
                    }
                    alt={movie.titulo}
                  />
                  <h3>{movie.titulo}</h3>
                  {movie.ano && <p>{movie.ano}</p>}
                </Link>
              ))
            ) : (
              <p>Nenhum filme encontrado.</p>
            )}
          </div>
        )}

        {filteredMovies.length > moviesPerPage && (
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

export default Filmes;
