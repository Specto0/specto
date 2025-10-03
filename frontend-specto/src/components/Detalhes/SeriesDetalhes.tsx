import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import "./Detalhes.css";

type ElencoType = { nome: string; personagem?: string; foto?: string | null };
type ReviewType = { autor: string; conteudo: string };
type VideoType = { tipo: string; site: string; chave: string };

type SerieDetalhesType = {
  id: number;
  titulo: string;
  original_name: string;
  sinopse: string;
  poster?: string | null;
  backdrop?: string | null;
  generos?: string[];
  data_lancamento?: string;
  nota?: number;
  adult?: boolean;
  temporadas?: number;
  episodios?: number;
  orcamento?: number | null;
  receita?: number | null;
  elenco?: ElencoType[];
  reviews?: ReviewType[];
  videos?: VideoType[];
};

const SeriesDetalhes = () => {
  const { id } = useParams<{ id: string }>();
  const [serie, setSerie] = useState<SerieDetalhesType | null>(null);

  // Estado para controlar quais reviews estão expandidas
  const [serieExpandida, setSerieExpandida] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    if (!id) return;
    const fetchSerie = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/series/detalhes/${id}`);
        const data = await res.json();
        setSerie(data);
      } catch (err) {
        console.error("Erro ao carregar série:", err);
      }
    };
    fetchSerie();
  }, [id]);

  if (!serie) return <p className="loading">Carregando detalhes da série...</p>;

  return (
    <div className="detalhes-container">
      {serie.backdrop && (
        <img className="detalhes-backdrop" src={serie.backdrop} alt={serie.titulo} />
      )}

      <div className="detalhes-content">
        {serie.poster && (
          <img className="detalhes-poster" src={serie.poster} alt={serie.titulo} />
        )}

        <div className="detalhes-texto">
          <h1 className="detalhes-titulo">{serie.titulo}</h1>
          <p className="detalhes-original">
            <strong>Título Original:</strong> {serie.original_name}
          </p>
          <p className="detalhes-sinopse">{serie.sinopse}</p>

          <div className="detalhes-info">
            {serie.data_lancamento && <p><strong>Data de Lançamento:</strong> {serie.data_lancamento}</p>}
            {serie.nota !== undefined && <p><strong>Nota:</strong> ⭐ {serie.nota}</p>}
            {serie.adult !== undefined && <p><strong>Classificação:</strong> {serie.adult ? "Adulto" : "Livre"}</p>}
            {serie.generos && <p><strong>Géneros:</strong> {serie.generos.join(", ")}</p>}
            {serie.temporadas !== undefined && <p><strong>Temporadas:</strong> {serie.temporadas}</p>}
            {serie.episodios !== undefined && <p><strong>Episódios:</strong> {serie.episodios}</p>}
            {serie.orcamento && <p><strong>Orçamento:</strong> ${serie.orcamento.toLocaleString()}</p>}
            {serie.receita && <p><strong>Receita:</strong> ${serie.receita.toLocaleString()}</p>}
          </div>

          {/* Elenco */}
          {serie.elenco && serie.elenco.length > 0 && (
            <>
              <h2>Elenco</h2>
              <div className="elenco-grid">
                {serie.elenco.map((ator, idx) => (
                  <div className="elenco-card" key={idx}>
                    {ator.foto && <img src={ator.foto} alt={ator.nome} />}
                    <p><strong>{ator.nome}</strong></p>
                    {ator.personagem && <p>{ator.personagem}</p>}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Reviews */}
          {serie.reviews && serie.reviews.length > 0 && (
            <>
              <h2>Reviews</h2>
              <div className="reviews-col">
                {serie.reviews.map((rev, idx) => {
                  const expandida = serieExpandida[idx] || false;
                  return (
                    <div className="review-card" key={idx}>
                      <p><strong>{rev.autor}</strong></p>
                      <p className={`review-text ${expandida ? "expandido" : ""}`}>
                        {rev.conteudo}
                      </p>
                      {rev.conteudo.length > 150 && (
                        <button
                          className="ver-mais"
                          onClick={() =>
                            setSerieExpandida((prev) => ({
                              ...prev,
                              [idx]: !expandida,
                            }))
                          }
                        >
                          {expandida ? "Ver menos" : "Ver mais"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Vídeos */}
          {serie.videos && serie.videos.length > 0 && (
            <>
              <h2>Trailers</h2>
              <div className="videos-grid">
                {serie.videos.map((vid, idx) => (
                  <div className="video-card" key={idx}>
                    <iframe
                      src={`https://www.youtube.com/embed/${vid.chave}`}
                      title={vid.tipo}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeriesDetalhes;
