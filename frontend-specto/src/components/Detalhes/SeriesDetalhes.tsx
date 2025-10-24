import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import "./Detalhes.css";
import "../Home/Home.css";
import NavBar from "../NavBar/NavBar";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";

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

export default function SeriesDetalhes() {
  const { id } = useParams<{ id: string }>();
  const [serie, setSerie] = useState<SerieDetalhesType | null>(null);
  const [loading, setLoading] = useState(true);

  // Controla o tema (dark/light)
  const [toggleDarkMode, setToggleDarkMode] = useState(
    () => localStorage.getItem("tema") === "dark"
  );

  const toggleDarkTheme = () => {
    setToggleDarkMode((prev) => {
      const novoTema = !prev;
      localStorage.setItem("tema", novoTema ? "dark" : "light");
      return novoTema;
    });
  };

  // Controla o tamanho das reviews
  const [reviewsExpandida, setReviewsExpandida] = useState<Record<number, boolean>>({});
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!localStorage.getItem("token"));
  const [isSavingVisto, setIsSavingVisto] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [wasAdded, setWasAdded] = useState(false);

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

  // Fetch dos detalhes da série
  useEffect(() => {
    if (!id) return;

    const fetchSerie = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/series/detalhes/${id}`);
        if (!res.ok) throw new Error("Erro ao buscar detalhes da série");
        const data = await res.json();
        setSerie(data);
      } catch (err) {
        console.error("Erro ao carregar série:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSerie();
  }, [id]);

  useEffect(() => {
    if (!serie || !isAuthenticated) {
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
        const jaVisto = Array.isArray(data.series)
          ? data.series.some((item: any) => item.tmdb_id === serie.id)
          : false;
        setWasAdded(jaVisto);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.warn("Falha ao verificar vistos:", err);
      });

    return () => controller.abort();
  }, [serie, isAuthenticated]);

  const handleAdicionarAosVistos = async () => {
    if (!serie) return;

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
          tipo: "serie",
          tmdb_id: serie.id,
          titulo: serie.titulo,
          titulo_original: serie.original_name,
          descricao: serie.sinopse,
          poster_path: serie.poster,
          backdrop_path: serie.backdrop,
          data_lancamento: serie.data_lancamento,
          media_avaliacao: serie.nota,
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
          "Não foi possível adicionar esta série aos vistos.";
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
          : "Adicionada aos teus vistos!",
      });
    } catch (err) {
      console.error("Erro ao adicionar série aos vistos:", err);
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

  if (loading) return <LoadingSpinner color="#3b82f6" size="large" />;
  if (!serie) return <p className="loading">Série não encontrada.</p>;

  return (
    <div className={`home-container ${toggleDarkMode ? "dark" : "light"}`}>
      {/* NavBar com apenas o tema!!! */}
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
          {serie.backdrop && (
            <img
              className="detalhes-backdrop"
              src={serie.backdrop}
              alt={serie.titulo}
            />
          )}

          <div className="detalhes-overlay">
            {serie.poster && (
              <img
                className="detalhes-poster"
                src={serie.poster}
                alt={serie.titulo}
              />
            )}

            <div className="detalhes-texto">
              <h1 className="detalhes-titulo">{serie.titulo}</h1>
              <p className="detalhes-original">
                <strong>Título Original:</strong> {serie.original_name}
              </p>
              <p className="detalhes-sinopse">{serie.sinopse}</p>

              <div className="detalhes-info">
                {serie.data_lancamento && (
                  <p>
                    <strong>Estreia:</strong> {serie.data_lancamento}
                  </p>
                )}
                {serie.nota && (
                  <p>
                    <strong>Nota:</strong> {serie.nota} ⭐
                  </p>
                )}
                {serie.adult !== undefined && (
                  <p>
                    <strong>Classificação:</strong>{" "}
                    {serie.adult ? "Adulto" : "Livre"}
                  </p>
                )}
                {serie.generos && (
                  <p>
                    <strong>Géneros:</strong> {serie.generos.join(", ")}
                  </p>
                )}
                {serie.temporadas !== undefined && (
                  <p>
                    <strong>Temporadas:</strong> {serie.temporadas}
                  </p>
                )}
                {serie.episodios !== undefined && (
                  <p>
                    <strong>Episódios:</strong> {serie.episodios}
                  </p>
                )}
                {serie.orcamento && (
                  <p>
                    <strong>Orçamento:</strong> $
                    {serie.orcamento.toLocaleString()}
                  </p>
                )}
                {serie.receita && (
                  <p>
                    <strong>Receita:</strong> $
                    {serie.receita.toLocaleString()}
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
                    Inicia sessão para adicionares esta série aos teus vistos.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Elenco */}
        {serie.elenco && serie.elenco.length > 0 && (
          <>
            <h2 className="elenco-h2">Elenco</h2>
            <div className="elenco-grid">
              {serie.elenco.map((ator, idx) => (
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
        {serie.reviews && serie.reviews.length > 0 && (
          <>
            <h2 className="review-h2">Reviews</h2>
            <div className="reviews-col">
              {serie.reviews.map((rev, idx) => {
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
        {serie.videos && serie.videos.length > 0 && (
          <>
            <h2 className="videos-h2">Trailers</h2>
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
  );
}
