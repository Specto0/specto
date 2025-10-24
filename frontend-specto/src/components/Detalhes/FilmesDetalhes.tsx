import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import "./Detalhes.css";
import "../Home/Home.css";
import NavBar from "../NavBar/NavBar";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";

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
  const [toggleDarkMode, setToggleDarkMode] = useState(true);
  const [reviewsExpandida, setReviewsExpandida] = useState<Record<number, boolean>>({});
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!localStorage.getItem("token"));
  const [isSavingVisto, setIsSavingVisto] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [wasAdded, setWasAdded] = useState(false);

  const toggleDarkTheme = () => setToggleDarkMode((prev) => !prev);

  useEffect(() => {
    const handleStorage = () => setIsAuthenticated(!!localStorage.getItem("token"));
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  // Fetch dos detalhes do filme
  useEffect(() => {
    if (!id) return;

    const fetchFilme = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/filmes/detalhes/${id}`);
        if (!res.ok) throw new Error("Erro ao buscar detalhes do filme");
        const data = await res.json();
        setFilme(data);
      } catch (err) {
        console.error("Erro ao carregar filme:", err);
      }
    };

    fetchFilme();
  }, [id]);

  useEffect(() => {
    if (!filme || !isAuthenticated) {
      setWasAdded(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    const controller = new AbortController();

    fetch("http://127.0.0.1:8000/vistos", {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((res) => {
        if (res.status === 401) {
          setIsAuthenticated(false);
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((data) => {
        if (!data) return;
        const jaVisto = Array.isArray(data.filmes)
          ? data.filmes.some((item: any) => item.tmdb_id === filme.id)
          : false;
        setWasAdded(jaVisto);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.warn("Falha ao verificar vistos:", err);
      });

    return () => controller.abort();
  }, [filme, isAuthenticated]);

  const handleAdicionarAosVistos = async () => {
    if (!filme) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setIsAuthenticated(false);
      setFeedback({
        type: "error",
        message: "Precisas de iniciar sessão para adicionares aos vistos.",
      });
      return;
    }

    const jaEstavaAdicionado = wasAdded;
    setIsSavingVisto(true);
    setFeedback(null);

    try {
      const response = await fetch("http://127.0.0.1:8000/vistos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tipo: "filme",
          tmdb_id: filme.id,
          titulo: filme.titulo,
          titulo_original: filme.original_title,
          descricao: filme.sinopse,
          poster_path: filme.poster,
          backdrop_path: filme.backdrop,
          data_lancamento: filme.data_lancamento,
          media_avaliacao: filme.nota,
        }),
      });

      const raw = await response.text();
      let data: any = null;
      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {
          data = null;
        }
      }

      if (!response.ok) {
        if (response.status === 401) {
          setIsAuthenticated(false);
        }
        const message =
          (data && (data.detail || data.message)) ||
          "Não foi possível adicionar este filme aos vistos.";
        throw new Error(message);
      }

      setWasAdded(true);
      const respostaFavorito = data && data.favorito;
      setFeedback({
        type: "success",
        message: respostaFavorito
          ? "Está nos teus favoritos e vistos!"
          : jaEstavaAdicionado
          ? "Os teus vistos foram atualizados."
          : "Adicionado aos teus vistos!",
      });
    } catch (err) {
      console.error("Erro ao adicionar aos vistos:", err);
      setFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Erro inesperado ao adicionar aos vistos.",
      });
    } finally {
      setIsSavingVisto(false);
    }
  };

  if (!filme) return <LoadingSpinner color="#3b82f6" size="large" />;

  return (
    <div className={`home-container ${toggleDarkMode ? "dark" : "light"}`}>
      {/* NavBar tem apenas o tema!!!! */}
      <NavBar
        query=""
        setQuery={() => {}}
        searching={false}
        handleSearch={() => {}}
        resetSearch={() => {}}
        toggleDarkMode={toggleDarkMode}
        toggleDarkTheme={toggleDarkTheme}
      />

      <div className="detalhes-container">
        {/* Banner principal */}
        <div className="detalhes-header">
          {filme.backdrop && (
            <img
              className="detalhes-backdrop"
              src={filme.backdrop}
              alt={filme.titulo}
            />
          )}

          <div className="detalhes-overlay">
            {filme.poster && (
              <img
                className="detalhes-poster"
                src={filme.poster}
                alt={filme.titulo}
              />
            )}

            <div className="detalhes-texto">
              <h1 className="detalhes-titulo">{filme.titulo}</h1>
              <p className="detalhes-sinopse">{filme.sinopse}</p>
              <div className="detalhes-info">
                {filme.data_lancamento && (
                  <p>
                    <strong>Estreia:</strong> {filme.data_lancamento}
                  </p>
                )}
                {filme.nota && (
                  <p>
                    <strong>Nota:</strong> {filme.nota} ⭐
                  </p>
                )}
                {filme.adult !== undefined && (
                  <p>
                    <strong>Classificação:</strong>{" "}
                    {filme.adult ? "Adulto" : "Livre"}
                  </p>
                )}
                {filme.generos && (
                  <p>
                    <strong>Géneros:</strong> {filme.generos.join(", ")}
                  </p>
                )}
                {filme.duracao && (
                  <p>
                    <strong>Duração:</strong> {filme.duracao} min
                  </p>
                )}
                {filme.orcamento && (
                  <p>
                    <strong>Orçamento:</strong> $
                    {filme.orcamento.toLocaleString()}
                  </p>
                )}
                {filme.receita && (
                  <p>
                    <strong>Receita:</strong> $
                    {filme.receita.toLocaleString()}
                  </p>
                )}
              </div>

              {isAuthenticated ? (
                <div className="detalhes-actions">
                  {!wasAdded ? (
                    <button
                      className="detalhes-cta"
                      onClick={handleAdicionarAosVistos}
                      disabled={isSavingVisto}
                    >
                      Adicionar aos vistos
                    </button>
                  ) : (
                    <span className="detalhes-feedback sucesso">
                      Já está nos teus vistos.
                    </span>
                  )}
                  {feedback && (
                    <span
                      className={`detalhes-feedback ${
                        feedback.type === "success" ? "sucesso" : "erro"
                      }`}
                    >
                      {feedback.message}
                    </span>
                  )}
                </div>
              ) : (
                <div className="detalhes-actions">
                  <span className="detalhes-feedback erro">
                    Inicia sessão para adicionares este filme aos teus vistos.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Elenco */}
        {filme.elenco && filme.elenco.length > 0 && (
          <>
            <h2 className="elenco-h2">Elenco</h2>
            <div className="elenco-grid">
              {filme.elenco.map((ator, idx) => (
                <div className="elenco-card" key={idx}>
                  {ator.foto && <img src={ator.foto} alt={ator.nome} />}
                  <p>
                    <strong>{ator.nome}</strong>
                  </p>
                  {ator.personagem && <p>{ator.personagem}</p>}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Reviews */}
        {filme.reviews && filme.reviews.length > 0 && (
          <>
            <h2 className="review-h2">Reviews</h2>
            <div className="reviews-col">
              {filme.reviews.map((rev, idx) => {
                const expandida = reviewsExpandida[idx] || false;
                const isLong = rev.conteudo.length > 300;
                return (
                  <div className="review-card" key={idx}>
                    <p>
                      <strong>{rev.autor}</strong>
                    </p>
                    <p className={`review-text ${expandida ? "expandido" : ""}`}>
                      {isLong && !expandida
                        ? rev.conteudo.slice(0, 300) + "..."
                        : rev.conteudo}
                    </p>
                    {isLong && (
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

        {/* Trailers */}
        {filme.videos && filme.videos.length > 0 && (
          <>
            <h2 className="videos-h2">Trailers</h2>
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
  );
}
