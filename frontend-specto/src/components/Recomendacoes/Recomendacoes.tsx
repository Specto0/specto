import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { buildApiUrl } from "../../utils/api";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";
import "./Recomendacoes.css";

type RecomendacaoItem = {
  id: number;
  tipo: "filme" | "serie";
  titulo: string;
  poster: string | null;
  nota: number | null;
  data_lancamento: string | null;
  sinopse: string | null;
};

type BaseadoEm = {
  tipo: "filme" | "serie";
  titulo: string;
  tmdb_id: number;
};

type RecomendacoesResponse = {
  recomendacoes: RecomendacaoItem[];
  baseado_em: BaseadoEm[];
  mensagem: string;
};

type Props = {
  themeMode: "dark" | "light";
};

const ITEMS_PER_ROW = 6; // Aproximadamente 1 linha em desktop

export default function Recomendacoes({ themeMode }: Props) {
  const [data, setData] = useState<RecomendacoesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchRecomendacoes = async () => {
      try {
        const response = await fetch(buildApiUrl("/vistos/recomendacoes"), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("Erro ao carregar recomendações");
        }

        const result: RecomendacoesResponse = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    };

    fetchRecomendacoes();
  }, []);

  if (loading) {
    return (
      <section className={`recomendacoes-section ${themeMode}`}>
        <h2>✨ Recomendado para ti</h2>
        <div className="recomendacoes-loading">
          <LoadingSpinner color="#3b82f6" size="medium" />
        </div>
      </section>
    );
  }

  if (error) {
    return null; // Não mostrar erros, apenas ocultar a secção
  }

  if (!data || data.recomendacoes.length === 0) {
    return (
      <section className={`recomendacoes-section ${themeMode}`}>
        <h2>✨ Recomendado para ti</h2>
        <div className="recomendacoes-empty">
          <p>🎬 Marca alguns filmes ou séries como vistos para receberes recomendações personalizadas!</p>
          <Link to="/filmes" className="recomendacoes-btn">Explorar Filmes</Link>
        </div>
      </section>
    );
  }

  return (
    <section className={`recomendacoes-section ${themeMode}`}>
      <div className="recomendacoes-header">
        <h2>✨ Recomendado para ti</h2>
        <p className="recomendacoes-subtitle">{data.mensagem}</p>
      </div>

      {/* Baseado em */}
      <div className="baseado-em">
        <span>Baseado em:</span>
        <div className="baseado-em-tags">
          {data.baseado_em.slice(0, 3).map((item) => (
            <Link
              key={`${item.tipo}-${item.tmdb_id}`}
              to={`/${item.tipo}/${item.tmdb_id}`}
              className="baseado-em-tag"
            >
              {item.tipo === "filme" ? "🎬" : "📺"} {item.titulo}
            </Link>
          ))}
          {data.baseado_em.length > 3 && (
            <span className="baseado-em-more">+{data.baseado_em.length - 3} mais</span>
          )}
        </div>
      </div>

      {/* Grid de recomendações */}
      <div className={`recomendacoes-grid ${expanded ? "expanded" : "collapsed"}`}>
        {(expanded ? data.recomendacoes : data.recomendacoes.slice(0, ITEMS_PER_ROW)).map((item) => (
          <Link
            key={`${item.tipo}-${item.id}`}
            to={`/${item.tipo}/${item.id}`}
            className="recomendacao-card"
          >
            <div className="recomendacao-poster">
              {item.poster ? (
                <img src={item.poster} alt={item.titulo} />
              ) : (
                <div className="recomendacao-placeholder">
                  {item.titulo?.charAt(0) || "?"}
                </div>
              )}
              {item.nota && (
                <span className="recomendacao-rating">⭐ {item.nota.toFixed(1)}</span>
              )}
              <span className={`recomendacao-tipo ${item.tipo}`}>
                {item.tipo === "filme" ? "Filme" : "Série"}
              </span>
            </div>
            <div className="recomendacao-info">
              <h3>{item.titulo}</h3>
              {item.data_lancamento && (
                <span className="recomendacao-ano">
                  {item.data_lancamento.substring(0, 4)}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Botão expandir/colapsar */}
      {data.recomendacoes.length > ITEMS_PER_ROW && (
        <button 
          className="recomendacoes-toggle"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
              Ver menos
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
              Ver mais ({data.recomendacoes.length - ITEMS_PER_ROW} mais)
            </>
          )}
        </button>
      )}
    </section>
  );
}
