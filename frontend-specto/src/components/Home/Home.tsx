import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Home.css";
import NavBar from "../NavBar/NavBar.tsx";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner.tsx";
import "../NavBar/NavBar.css";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

export type ItemMedia = {
  id: number;
  titulo: string;
  poster: string | null;
  tipo: "filme" | "serie";
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

  const mapFilme = (f: ItemMedia): ItemMedia => ({
    id: f.id,
    titulo: f.titulo ?? f.titulo,
    poster: f.poster ?? f.poster,
    tipo: "filme",
  });

  const mapSerie = (s: ItemMedia): ItemMedia => ({
    id: s.id,
    titulo: s.titulo ?? s.titulo,
    poster: s.poster ?? s.poster,
    tipo: "serie",
  });

  // Busca inicial para mostrar seções padrão
  useEffect(() => {
    if (searching) return; // Não carrega se estiver pesquisando
    setLoading(true);

    const endpoints = [
      { url: "http://127.0.0.1:8000/filmes/populares", setter: setFilmesPopulares, mapper: mapFilme },
      { url: "http://127.0.0.1:8000/filmes/now-playing", setter: setFilmesNowPlaying, mapper: mapFilme },
      { url: "http://127.0.0.1:8000/filmes/top-rated", setter: setFilmesTopRated, mapper: mapFilme },
      { url: "http://127.0.0.1:8000/series/populares", setter: setSeriesPopulares, mapper: mapSerie },
      { url: "http://127.0.0.1:8000/series/on-air", setter: setSeriesOnAir, mapper: mapSerie },
      { url: "http://127.0.0.1:8000/series/top-rated", setter: setSeriesTopRated, mapper: mapSerie },
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

  // Função de pesquisa
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearching(true);

    fetch(`http://127.0.0.1:8000/pesquisa?query=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => {
        const filmes = Array.isArray(data.filmes) ? data.filmes.map(mapFilme) : [];
        const series = Array.isArray(data.series) ? data.series.map(mapSerie) : [];

        setFilmesPopulares(filmes);
        setSeriesPopulares(series);

        // Limpa seções padrão enquanto pesquisa está ativa
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

  const renderCarrossel = (items: ItemMedia[]) => {
  if (!items || items.length === 0) return null;

  return ( 
    <Swiper
      spaceBetween={10}
      slidesPerView={5}
      loop={true}
      grabCursor={true}
      breakpoints={{
        320: { slidesPerView: 2 },
        640: { slidesPerView: 3 },
        1024: { slidesPerView: 5 },
      }}
    >
      {items.map((item) => (
        <SwiperSlide key={item.id}>
          <Link
            to={item.tipo === "filme" ? `/filme/${item.id}` : `/serie/${item.id}`}
            className="card"
          >
            <img
              src={
                item.poster
                  ? `https://image.tmdb.org/t/p/w500${item.poster}`
                  : "https://via.placeholder.com/200x300?text=Sem+Imagem"
              }
              alt={item.titulo}
            />
            <h3>{item.titulo}</h3>
          </Link>
        </SwiperSlide>
      ))}
    </Swiper>
  );
};

  const [toggleDarkMode, setToggleDarkMode] = useState(true);
  const toggleDarkTheme = () => setToggleDarkMode(!toggleDarkMode);

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
