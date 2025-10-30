import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../NavBar/NavBar";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";
import "../Home/Home.css";
import "./Filmes.css";
import { readTheme, subscribeTheme, type ThemeMode } from "../../utils/theme";
import { buildApiUrl } from "../../utils/api";

type FilmeAPI = {
  id: number;
  title?: string | null;
  original_title?: string | null;
  name?: string | null;
  poster_path?: string | null;
  poster?: string | null;
  release_date?: string | null;
  ano?: string | number | null;
};

export type Filme = {
  id: number;
  titulo: string;
  poster: string | null;
  ano?: number;
  tipo: "filme";
};

const MOVIES_PER_PAGE = 24;

const normalizeTitulo = (item: FilmeAPI): string => {
  const candidates = [
    item.title,
    item.original_title,
    item.name,
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

const mapFilme = (item: FilmeAPI): Filme => ({
  id: item.id,
  titulo: normalizeTitulo(item),
  poster: item.poster_path ?? item.poster ?? null,
  ano: normalizeAno(item.release_date ?? item.ano),
  tipo: "filme",
});

const Filmes = () => {
  const [movies, setMovies] = useState<Filme[]>([]);
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
    fetch(buildApiUrl("/filmes/populares"))
      .then((response) => {
        if (!response.ok) throw new Error("Erro na resposta da API");
        return response.json();
      })
      .then((data) => {
        const filmesArray: FilmeAPI[] = Array.isArray(data.results)
          ? data.results
          : data;
        const filmesFormatados = filmesArray
          .filter((item): item is FilmeAPI => typeof item?.id === "number")
          .map(mapFilme);

        const filmesUnicos = Array.from(
          new Map(filmesFormatados.map((f) => [f.id, f])).values()
        );

        setMovies(filmesUnicos);
      })
      .catch((error) => console.error("Erro ao carregar filmes:", error))
      .finally(() => setLoading(false));
  }, []);

  const filteredMovies = useMemo(() => {
    return movies
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
  }, [movies, filter, sortOrder]);

  const totalPages = Math.ceil(filteredMovies.length / MOVIES_PER_PAGE);
  const startIndex = (currentPage - 1) * MOVIES_PER_PAGE;
  const currentMovies = filteredMovies.slice(
    startIndex,
    startIndex + MOVIES_PER_PAGE
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

      <section className="filmes-section">
        <h2>🎬 Filmes</h2>

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

        {filteredMovies.length > MOVIES_PER_PAGE && (
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

export default Filmes;
