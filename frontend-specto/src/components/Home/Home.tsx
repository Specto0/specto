import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Home.css";
import NavBar from "../NavBar/NavBar.tsx";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner.tsx";
import "../NavBar/NavBar.css";
import "../Perfil/Perfil.css";
import { readTheme, subscribeTheme, type ThemeMode } from "../../utils/theme";
import { buildApiUrl } from "@/utils/api";

export type ItemMedia = {
  id: number;
  titulo: string;
  poster: string | null;
  tipo: "filme" | "serie";
  rating?: number | null;
  votes?: number | null;
};

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const [filmesPopulares, setFilmesPopulares] = useState<ItemMedia[]>([]);
  const [filmesNowPlaying, setFilmesNowPlaying] = useState<ItemMedia[]>([]);
  const [filmesTopRated, setFilmesTopRated] = useState<ItemMedia[]>([]);
  const [seriesPopulares, setSeriesPopulares] = useState<ItemMedia[]>([]);
  const [seriesOnAir, setSeriesOnAir] = useState<ItemMedia[]>([]);
  const [seriesTopRated, setSeriesTopRated] = useState<ItemMedia[]>([]);

  const parseNumeric = (value: any): number | null => {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const mapFilme = (f: any): ItemMedia => ({
    id: f.id,
    titulo: f.titulo ?? f.title ?? "Sem título",
    poster: f.poster ?? f.poster_path ?? null,
    tipo: "filme",
    rating:
      parseNumeric(f.vote_average) ??
      parseNumeric(f.nota) ??
      parseNumeric(f.media_avaliacao),
    votes:
      parseNumeric(f.vote_count) ??
      parseNumeric(f.votos),
  });

  const mapSerie = (s: any): ItemMedia => ({
    id: s.id,
    titulo: s.titulo ?? s.name ?? "Sem título",
    poster: s.poster ?? s.poster_path ?? null,
    tipo: "serie",
    rating:
      parseNumeric(s.vote_average) ??
      parseNumeric(s.nota) ??
      parseNumeric(s.media_avaliacao),
    votes:
      parseNumeric(s.vote_count) ??
      parseNumeric(s.votos),
  });

  useEffect(() => {
    if (searching) return;
    setLoading(true);

    const endpoints = [
      { url: buildApiUrl("/filmes/populares"), setter: setFilmesPopulares, mapper: mapFilme },
      { url: buildApiUrl("/filmes/now-playing"), setter: setFilmesNowPlaying, mapper: mapFilme },
      { url: buildApiUrl("/filmes/top-rated"), setter: setFilmesTopRated, mapper: mapFilme },
      { url: buildApiUrl("/series/populares"), setter: setSeriesPopulares, mapper: mapSerie },
      { url: buildApiUrl("/series/on-air"), setter: setSeriesOnAir, mapper: mapSerie },
      { url: buildApiUrl("/series/top-rated"), setter: setSeriesTopRated, mapper: mapSerie },
    ];

    Promise.all(endpoints.map(e => fetch(e.url).then(res => res.json())))
      .then(results => {
        results.forEach((data, index) => {
          const { setter, mapper } = endpoints[index];
          const itemsArray = Array.isArray(data.results) ? data.results : data;
          setter(itemsArray.slice(0, 20).map(mapper));
        });
        setLoading(false);
      })
      .catch(err => {
        console.error("Erro ao buscar dados:", err);
        setLoading(false);
      });
  }, [searching]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearching(true);

    fetch(buildApiUrl(`/pesquisa?query=${encodeURIComponent(query)}`))
      .then(res => res.json())
      .then(data => {
        // API formats responses differently, handle both cases
        const filmes = Array.isArray(data.filmes) 
          ? data.filmes.map((f: any) => ({
              id: f.id,
              titulo: f.title || f.titulo || "Sem título",
              poster: f.poster_path || f.poster || null,
              tipo: "filme" as const,
              rating:
                parseNumeric(f.vote_average) ??
                parseNumeric(f.nota) ??
                parseNumeric(f.media_avaliacao),
              votes:
                parseNumeric(f.vote_count) ??
                parseNumeric(f.votos),
            }))
          : [];
        
        const series = Array.isArray(data.series) 
          ? data.series.map((s: any) => ({
              id: s.id,
              titulo: s.name || s.titulo || "Sem título",
              poster: s.poster_path || s.poster || null,
              tipo: "serie" as const,
              rating:
                parseNumeric(s.vote_average) ??
                parseNumeric(s.nota) ??
                parseNumeric(s.media_avaliacao),
              votes:
                parseNumeric(s.vote_count) ??
                parseNumeric(s.votos),
            }))
          : [];

        setFilmesPopulares(filmes);
        setSeriesPopulares(series);

        setFilmesNowPlaying([]);
        setFilmesTopRated([]);
        setSeriesOnAir([]);
        setSeriesTopRated([]);

        setLoading(false);
      })
      .catch(err => {
        console.error("Erro na pesquisa:", err);
        setLoading(false);
      });
  };

  const resetSearch = () => {
    setQuery("");
    setSearching(false);
  };

  const posterPlaceholder =
    "https://via.placeholder.com/200x300?text=Sem+Imagem";

  const getPosterUrl = (poster: string | null) => {
    if (!poster) return posterPlaceholder;
    if (poster.startsWith("http")) return poster;
    return `https://image.tmdb.org/t/p/w500${poster}`;
  };

  const renderCarrossel = (items: ItemMedia[]) => {
    if (!items || items.length === 0) return null;

    return (
      <div className="carousel">
        {items.map(item => (
          <Link
            key={item.id}
            to={item.tipo === "filme" ? `/filme/${item.id}` : `/serie/${item.id}`}
            className="perfil-card home-card"
          >
            <div className="perfil-card-thumb home-card-thumb">
              <img
                src={getPosterUrl(item.poster)}
                alt={item.titulo}
              />
            </div>
            <div className="perfil-card-body home-card-body">
              <h3 className="perfil-card-title">{item.titulo}</h3>
              <div className="perfil-card-info-top">
                {item.rating !== null && item.rating !== undefined && (
                  <span className="perfil-card-rating">
                    {item.rating.toFixed(1)} ⭐
                    {item.votes && item.votes > 0 ? ` · ${item.votes} votos` : ""}
                  </span>
                )}
                <span className="perfil-card-sep">·</span>
                <span className="perfil-card-type">
                  {item.tipo === "filme" ? "Filme" : "Série"}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readTheme());

  useEffect(() => {
    const unsubscribe = subscribeTheme(setThemeMode);
    return unsubscribe;
  }, []);

  return (
    <div className={`home-container ${themeMode === "dark" ? "dark" : "light"}`}>
      <NavBar toggleDarkMode={themeMode === "dark"} />

      <section className="home-search">
        <form onSubmit={handleSearch} className="home-search-form">
          <div className="search-box">
            <span className="search-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35M16.65 16.65A7.5 7.5 0 1116.65 2.5a7.5 7.5 0 010 14.15z"
                />
              </svg>
            </span>
              <input
                type="text"
                placeholder="Procura por filmes ou séries..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="navbar-input"
              />
          </div>
          <button type="submit" className="home-search-submit">
            Pesquisar
          </button>
          {searching && (
            <button
              type="button"
              className="home-search-reset"
              onClick={resetSearch}
            >
              Limpar
            </button>
          )}
        </form>
      </section>

      {loading ? (
        <LoadingSpinner color="#3b82f6" size="large" />
      ) : searching ? (
        <>
          {filmesPopulares.length > 0 && (
            <section>
              <h2>🎬 Filmes</h2>
              {renderCarrossel(filmesPopulares)}
            </section>
          )}
          {seriesPopulares.length > 0 && (
            <section>
              <h2>📺 Séries</h2>
              {renderCarrossel(seriesPopulares)}
            </section>
          )}
          {filmesPopulares.length === 0 && seriesPopulares.length === 0 && (
            <p>Nenhum resultado encontrado.</p>
          )}
        </>
      ) : (
        <>
          <section>
            <h2>🎬 Filmes Populares</h2>
            {renderCarrossel(filmesPopulares)}
          </section>
          <section>
            <h2>🎬 Filmes em Cartaz</h2>
            {renderCarrossel(filmesNowPlaying)}
          </section>
          <section>
            <h2>🎬 Filmes Top Rated</h2>
            {renderCarrossel(filmesTopRated)}
          </section>
          <section>
            <h2>📺 Séries Populares</h2>
            {renderCarrossel(seriesPopulares)}
          </section>
          <section>
            <h2>📺 Séries no Ar</h2>
            {renderCarrossel(seriesOnAir)}
          </section>
          <section>
            <h2>📺 Séries Top Rated</h2>
            {renderCarrossel(seriesTopRated)}
          </section>
        </>
      )}
    </div>
  );
}
