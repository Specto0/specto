import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Home.css";
import NavBar from "../NavBar/NavBar.tsx";
import Skeleton from "../Skeleton/Skeleton";
import TrailerModal from "../TrailerModal/TrailerModal";
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
  const [heroIndex, setHeroIndex] = useState(0);
  const [selectedTrailer, setSelectedTrailer] = useState<string | null>(null);
  const navigate = useNavigate();

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

  const Carousel = ({ items }: { items: ItemMedia[] }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: "left" | "right") => {
      if (scrollRef.current) {
        const { current } = scrollRef;
        const scrollAmount =
          direction === "left" ? -current.offsetWidth / 2 : current.offsetWidth / 2;
        current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    };

    if (!items || items.length === 0) return null;

    return (
      <div className="carousel-wrapper">
        <button
          className="carousel-btn prev"
          onClick={() => scroll("left")}
          aria-label="Anterior"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <div className="carousel" ref={scrollRef}>
          {items.map((item) => (
            <Link
              key={item.id}
              to={item.tipo === "filme" ? `/filme/${item.id}` : `/serie/${item.id}`}
              className="perfil-card home-card"
            >
              <div className="perfil-card-thumb home-card-thumb">
                <img src={getPosterUrl(item.poster)} alt={item.titulo} />
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
        <button
          className="carousel-btn next"
          onClick={() => scroll("right")}
          aria-label="Seguinte"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    );
  };

  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readTheme());

  useEffect(() => {
    const unsubscribe = subscribeTheme(setThemeMode);
    return unsubscribe;
  }, []);

  const handleOpenTrailer = async (item: ItemMedia) => {
    try {
      const endpoint = item.tipo === "filme" ? `/filmes/detalhes/${item.id}` : `/series/detalhes/${item.id}`;
      const res = await fetch(buildApiUrl(endpoint));
      if (!res.ok) throw new Error("Erro ao buscar detalhes");
      const data = await res.json();

      const videos = data.videos || [];
      const trailer = videos.find(
        (v: any) => v.site === "YouTube" && (v.type === "Trailer" || v.tipo === "Trailer")
      );

      if (trailer) {
        setSelectedTrailer(trailer.key || trailer.chave);
      } else {
        // Fallback to YouTube search if no trailer found in API
        window.open(
          `https://www.youtube.com/results?search_query=${encodeURIComponent(item.titulo + " trailer")}`,
          "_blank"
        );
      }
    } catch (err) {
      console.error("Erro ao abrir trailer:", err);
      // Fallback on error
      window.open(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(item.titulo + " trailer")}`,
        "_blank"
      );
    }
  };

  const featuredSource =
    filmesTopRated.length > 0 ? filmesTopRated : filmesPopulares;
  const featured = featuredSource.slice(0, 5);

  return (
    <div className={`home-container ${themeMode === "dark" ? "dark" : "light"}`}>
      <NavBar toggleDarkMode={themeMode === "dark"} />

      {featured.length > 0 && (
        <section
          className="home-hero"
          style={{
            backgroundImage: `linear-gradient(120deg, rgba(8,12,20,0.82) 20%, rgba(8,12,20,0.4) 60%, rgba(8,12,20,0.9) 90%), url(${getPosterUrl(
              featured[heroIndex % featured.length].poster
            )})`,
          }}
        >
          <div className="home-hero-content">
            <p className="home-hero-eyebrow">Em destaque</p>
            <h1 className="home-hero-title">
              {featured[heroIndex % featured.length].titulo}{" "}
              <span className="home-hero-highlight">
                {featured[heroIndex % featured.length].tipo === "filme"
                  ? "Filme"
                  : "Série"}
              </span>
            </h1>
            <p className="home-hero-subtitle">
              Descobre mais detalhes, avalia e partilha a tua opinião com a comunidade.
            </p>
            <div className="home-hero-actions">
              <button
                type="button"
                className="home-hero-btn primary"
                onClick={() =>
                  navigate(
                    featured[heroIndex % featured.length].tipo === "filme"
                      ? `/filme/${featured[heroIndex % featured.length].id}`
                      : `/serie/${featured[heroIndex % featured.length].id}`
                  )
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ marginRight: "8px" }}
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                Ver Detalhes
              </button>
              <button
                type="button"
                className="home-hero-btn secondary"
                onClick={() => handleOpenTrailer(featured[heroIndex % featured.length])}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  stroke="none"
                  style={{ marginRight: "8px" }}
                >
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                Ver Trailer
              </button>
            </div>
          </div>
          <div className="home-hero-controls">
            <button
              type="button"
              className="hero-nav prev"
              aria-label="Anterior"
              onClick={() =>
                setHeroIndex((prev) =>
                  prev === 0 ? featured.length - 1 : prev - 1
                )
              }
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <div className="hero-dots">
              {featured.map((item, idx) => (
                <button
                  key={item.id}
                  className={`hero-dot ${idx === heroIndex % featured.length ? "active" : ""
                    }`}
                  aria-label={`Ir para ${item.titulo}`}
                  onClick={() => setHeroIndex(idx)}
                />
              ))}
            </div>
            <button
              type="button"
              className="hero-nav next"
              aria-label="Seguinte"
              onClick={() =>
                setHeroIndex((prev) => (prev + 1) % featured.length)
              }
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </section>
      )}

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
        <div className="home-skeleton" style={{ paddingBottom: "40px" }}>
          {/* Hero Skeleton */}
          <Skeleton
            height="500px"
            borderRadius="20px"
            style={{ margin: "20px 20px 40px 20px" }}
          />

          {/* Carousel Skeletons */}
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ padding: "0 40px", marginBottom: "40px" }}>
              <Skeleton
                width="200px"
                height="32px"
                style={{ marginBottom: "20px" }}
              />
              <div style={{ display: "flex", gap: "20px", overflow: "hidden" }}>
                {[1, 2, 3, 4, 5, 6].map((j) => (
                  <Skeleton
                    key={j}
                    width="200px"
                    height="300px"
                    borderRadius="16px"
                    style={{ flexShrink: 0 }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : searching ? (
        <>
          {filmesPopulares.length > 0 && (
            <section>
              <h2>🎬 Filmes</h2>
              <Carousel items={filmesPopulares} />
            </section>
          )}
          {seriesPopulares.length > 0 && (
            <section>
              <h2>📺 Séries</h2>
              <Carousel items={seriesPopulares} />
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
            <Carousel items={filmesPopulares} />
          </section>
          <section>
            <h2>🎬 Filmes em Cartaz</h2>
            <Carousel items={filmesNowPlaying} />
          </section>
          <section>
            <h2>🎬 Filmes Top Rated</h2>
            <Carousel items={filmesTopRated} />
          </section>
          <section>
            <h2>📺 Séries Populares</h2>
            <Carousel items={seriesPopulares} />
          </section>
          <section>
            <h2>📺 Séries no Ar</h2>
            <Carousel items={seriesOnAir} />
          </section>
          <section>
            <h2>📺 Séries Top Rated</h2>
            <Carousel items={seriesTopRated} />
          </section>
        </>
      )}
      <TrailerModal
        isOpen={!!selectedTrailer}
        onClose={() => setSelectedTrailer(null)}
        videoKey={selectedTrailer || ""}
      />
    </div>
  );
}
