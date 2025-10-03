import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Home.css";


// -------------------- Tipo unificado --------------------
export type ItemMedia = {
  id: number;
  titulo: string;
  poster: string | null;
  tipo: "filme" | "serie";
};

// -------------------- Componente Home --------------------
export default function Home() {
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  // Estados para todos os carrosséis
  const [filmesPopulares, setFilmesPopulares] = useState<ItemMedia[]>([]);
  const [filmesNowPlaying, setFilmesNowPlaying] = useState<ItemMedia[]>([]);
  const [filmesTopRated, setFilmesTopRated] = useState<ItemMedia[]>([]);
  const [seriesPopulares, setSeriesPopulares] = useState<ItemMedia[]>([]);
  const [seriesOnAir, setSeriesOnAir] = useState<ItemMedia[]>([]);
  const [seriesTopRated, setSeriesTopRated] = useState<ItemMedia[]>([]);

  // -------------------- Funções de mapeamento --------------------
  const mapFilme = (f: any): ItemMedia => ({
    id: f.id,
    titulo: f.titulo ?? f.title,
    poster: f.poster ?? f.poster_path,
    tipo: "filme",
  });

  const mapSerie = (s: any): ItemMedia => ({
    id: s.id,
    titulo: s.titulo ?? s.name,
    poster: s.poster ?? s.poster_path,
    tipo: "serie",
  });

  // -------------------- Carregar dados iniciais --------------------
  useEffect(() => {
    if (searching) return;
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
          // Se já vem do backend no formato "results", usamos, senão assume array direto
          const itemsArray = Array.isArray(data.results) ? data.results : data;
          setter(itemsArray.slice(0, 10).map(mapper));
        });
        setLoading(false);
      })
      .catch(err => {
        console.error("Erro ao buscar dados:", err);
        setLoading(false);
      });
  }, [searching]);

  // -------------------- Pesquisa --------------------
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

  // -------------------- Renderização do carrossel --------------------
  const renderCarrossel = (items: ItemMedia[]) => {
    if (!items || items.length === 0) return <p>Nenhum item encontrado.</p>;

    return (
      <div className="carousel">
        {items.map(item => (
          <Link
            key={item.id}
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
        ))}
      </div>
    );
  };
  // -------------------- Dark/Light mode --------------------

  
     const [toggleDarkMode, setToggleDarkMode] = useState(true);

     
     const toggleDarkTheme = () => {
       setToggleDarkMode(!toggleDarkMode);
     };



  // -------------------- Renderização --------------------
  return (
    <div className={`home-container ${toggleDarkMode ? "dark" : "light"}`}>
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="Pesquisar filmes ou séries..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="btn-primary">
          Pesquisar
        </button>

        {searching && (
          <button type="button" onClick={resetSearch} className="btn-danger">
            Voltar
          </button>
        )}

        <label className="switch">
          <input
            type="checkbox"
            checked={toggleDarkMode}
            onChange={toggleDarkTheme}
          />
          <span className="slider round"></span>
        </label>
      </form>

      {loading ? (
        <p>Carregando...</p>
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
