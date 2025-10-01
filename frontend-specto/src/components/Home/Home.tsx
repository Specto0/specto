import { useEffect, useState } from "react";
import { Link } from "react-router-dom"; // <-- Importar Link
import "./Home.css";

export type Filme = {
  id: number;
  title: string;
  poster_path: string | null;
};

export type Serie = {
  id: number;
  name: string;
  poster_path: string | null;
};

export default function Home() {
  const [filmes, setFilmes] = useState<Filme[]>([]);
  const [series, setSeries] = useState<Serie[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (searching) return;

    setLoading(true);

    Promise.all([
      fetch("http://127.0.0.1:8000/filmes-populares").then((res) => res.json()),
      fetch("http://127.0.0.1:8000/series-populares").then((res) => res.json()),
    ])
      .then(([dataFilmes, dataSeries]) => {
        setFilmes(dataFilmes.results.slice(0, 10));
        setSeries(dataSeries.results.slice(0, 10));
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erro ao buscar dados:", err);
        setLoading(false);
      });
  }, [searching]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearching(true);

    fetch(`http://127.0.0.1:8000/pesquisa?query=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((data) => {
        setFilmes(data.filmes || []);
        setSeries(data.series || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erro na pesquisa:", err);
        setLoading(false);
      });
  };

  const resetSearch = () => {
    setQuery("");
    setSearching(false);
  };

  return (
    <div className="home-container">
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="Pesquisar filmes ou séries..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="btn-primary">Pesquisar</button>
        {searching && (
          <button type="button" onClick={resetSearch} className="btn-danger">
            Voltar
          </button>
        )}
      </form>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div className="results-container">
          {/* Filmes */}
          <section>
            <h2>🎬 Filmes</h2>
            {filmes.length === 0 ? <p>Nenhum filme encontrado.</p> : (
              <div className="grid">
                {filmes.map((f) => (
                  <Link key={f.id} to={`/filme/${f.id}`} className="card">
                    <img
                      src={
                        f.poster_path
                          ? `https://image.tmdb.org/t/p/w500${f.poster_path}`
                          : "https://via.placeholder.com/200x300?text=Sem+Imagem"
                      }
                      alt={f.title}
                    />
                    <h3>{f.title}</h3>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Séries */}
          <section>
            <h2>📺 Séries</h2>
            {series.length === 0 ? <p>Nenhuma série encontrada.</p> : (
              <div className="grid">
                {series.map((s) => (
                  <Link key={s.id} to={`/serie/${s.id}`} className="card">
                    <img
                      src={
                        s.poster_path
                          ? `https://image.tmdb.org/t/p/w500${s.poster_path}`
                          : "https://via.placeholder.com/200x300?text=Sem+Imagem"
                      }
                      alt={s.name}
                    />
                    <h3>{s.name}</h3>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
