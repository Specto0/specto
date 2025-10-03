import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import "./Detalhes.css";

type ElencoType = {
  nome: string;
  personagem: string;
  foto?: string | null;
};

type ReviewType = {
  autor: string;
  conteudo: string;
};

type VideoType = {
  tipo: string;
  site: string;
  chave: string;
};

type FilmeDetalhesType = {
  id: number;
  titulo: string;
  original_title: string;
  sinopse: string;
  poster?: string | null;
  backdrop?: string | null;
  generos?: string[];
  data_lancamento?: string;
  nota?: number;
  adult?: boolean;
  duracao?: number;
  orcamento?: number;
  receita?: number;
  elenco?: ElencoType[];
  reviews?: ReviewType[];
  videos?: VideoType[];
};

export default function FilmesDetalhes() {
  const { id } = useParams<{ id: string }>();
  const [filme, setFilme] = useState<FilmeDetalhesType | null>(null);

  // 👉 NOVO: vamos guardar o estado de expansão de cada review
  const [reviewsExpandida, setReviewsExpandida] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    if (!id) return;
    const fetchFilme = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/filmes/detalhes/${id}`);
        const data = await res.json();
        setFilme(data);
      } catch (err) {
        console.error("Erro ao carregar filme:", err);
      }
    };
    fetchFilme();
  }, [id]);

  if (!filme) return <p className="loading">Carregando...</p>;

  return (
    <div className="detalhes-container">
      {filme.backdrop && <img className="detalhes-backdrop" src={filme.backdrop} alt={filme.titulo} />}

      <div className="detalhes-content">
        {filme.poster && <img className="detalhes-poster" src={filme.poster} alt={filme.titulo} />}

        <div className="detalhes-texto">
          <h1 className="detalhes-titulo">{filme.titulo}</h1>
          <p className="detalhes-original"><strong>Título Original:</strong> {filme.original_title}</p>
          <p className="detalhes-sinopse">{filme.sinopse}</p>

          <div className="detalhes-info">
            {filme.data_lancamento && <p><strong>Data de Lançamento:</strong> {filme.data_lancamento}</p>}
            {filme.nota && <p><strong>Nota:</strong> ⭐ {filme.nota}</p>}
            {filme.adult !== undefined && <p><strong>Classificação:</strong> {filme.adult ? "Adulto" : "Livre"}</p>}
            {filme.generos && <p><strong>Géneros:</strong> {filme.generos.join(", ")}</p>}
            {filme.duracao && <p><strong>Duração:</strong> {filme.duracao} min</p>}
            {filme.orcamento && <p><strong>Orçamento:</strong> ${filme.orcamento.toLocaleString()}</p>}
            {filme.receita && <p><strong>Receita:</strong> ${filme.receita.toLocaleString()}</p>}
          </div>

          {/* Elenco */}
          {filme.elenco && filme.elenco.length > 0 && (
            <>
              <h2>Elenco</h2>
              <div className="elenco-grid">
                {filme.elenco.map((ator, idx) => (
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
          {filme.reviews && filme.reviews.length > 0 && (
            <>
              <h2>Reviews</h2>
              <div className="reviews-col">
                {filme.reviews.map((rev, idx) => {
                  const expandida = reviewsExpandida[idx] || false;

                  return (
                    <div className="review-card" key={idx}>
                      <p><strong>{rev.autor}</strong></p>
                      <p className={`review-text ${expandida ? "expandido" : ""}`}>
                        {rev.conteudo}
                      </p>

                      {/* Botão "Ver mais" só aparece se o texto tiver mais de 150 caracteres */}
                      {rev.conteudo.length > 150 && (
                        <button
                          className="ver-mais"
                          onClick={() =>
                            setReviewsExpandida((prev) => ({
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
          {filme.videos && filme.videos.length > 0 && (
            <>
              <h2>Trailers</h2>
              <div className="videos-grid">
                {filme.videos.map((vid, idx) => (
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
}
