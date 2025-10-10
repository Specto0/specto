import React, { useState, useEffect } from "react";
import NavBar from "../NavBar/NavBar";
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
  const [filter, setFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"az" | "za" | "anoC" | "anoD">("az");

  const [currentPage, setCurrentPage] = useState(1);
  const moviesPerPage = 24;

  const handleSearch = () => setSearching(true);
  const resetSearch = () => {
    setSearching(false);
    setQuery("");
  };
  const toggleDarkTheme = () => setToggleDarkMode((prev) => !prev);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/filmes/populares")
      .then((response) => response.json())
      .then((data) => {
        const filmesArray = Array.isArray(data.results) ? data.results : data;
        const filmesFormatados = filmesArray.map((f: any) => ({
          id: f.id,
          titulo: f.titulo || f.title || "Sem título",
          poster: f.poster || f.poster_path || null,
          ano: f.ano || f.release_date ? parseInt(f.release_date?.split("-")[0]) : undefined,
          tipo: "filme" as const,
        }));
        setMovies(filmesFormatados);
      })
      .catch((error) => console.error("Erro ao carregar filmes:", error));
  }, []);

  const filteredMovies = movies
    .filter((movie) => movie.titulo.toLowerCase().includes(filter.toLowerCase()))
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

        <div className="grid-filmes">
          {currentMovies.length > 0 ? (
            currentMovies.map((movie) => (
              <div className="card" key={movie.id}>
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
              </div>
            ))
          ) : (
            <p>Loading...</p>
          )}
        </div>

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
