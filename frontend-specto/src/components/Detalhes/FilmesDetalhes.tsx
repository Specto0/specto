import { useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import "./Detalhes.css";
import "../Home/Home.css";
import NavBar from "../NavBar/NavBar";
import Skeleton from "../Skeleton/Skeleton";
import ComentariosSection from "./ComentariosSection";
import { readTheme, subscribeTheme, type ThemeMode } from "../../utils/theme";
import { buildApiUrl } from "@/utils/api";

type ElencoType = {
  nome: string;
  personagem: string;
  foto?: string | null;
};

type VideoType = {
  tipo: string;
  site: string;
  chave: string;
};

const ATOR_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'%3E%3Crect width='200' height='300' rx='16' fill='%23222636'/%3E%3Ccircle cx='100' cy='120' r='50' fill='%2336475f'/%3E%3Cpath d='M40 240c5-48 45-80 60-80s55 32 60 80' fill='%2336475f'/%3E%3Ctext x='100' y='270' text-anchor='middle' font-family='Arial' font-size='26' fill='%23cbd5f5'%3ESem foto%3C/text%3E%3C/svg%3E";

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
  videos?: VideoType[];
};

export default function FilmesDetalhes() {
  const { id } = useParams<{ id: string }>();
  const [filme, setFilme] = useState<FilmeDetalhesType | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readTheme());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!localStorage.getItem("token"));
  const [isSavingVisto, setIsSavingVisto] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [wasAdded, setWasAdded] = useState(false);
  const [vistoId, setVistoId] = useState<number | null>(null);
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTrailerIndex, setActiveTrailerIndex] = useState(0);
  const [ondeAssistir, setOndeAssistir] = useState<any | null>(null);


  // Scroll to top when component mounts or movie ID changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    const unsubscribe = subscribeTheme(setThemeMode);
    return unsubscribe;
  }, []);

  const closeModal = () => {
    setShowModal(false);
    setModalMessage(null);
  };

  const openModal = (message: string) => {
    setModalMessage(message);
    setShowModal(true);
  };

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

  useEffect(() => {
    if (!showModal) return;
    const timeout = window.setTimeout(() => {
      setShowModal(false);
      setModalMessage(null);
    }, 2500);
    return () => window.clearTimeout(timeout);
  }, [showModal]);

  const trailers = useMemo(() => {
    if (!filme?.videos) return [];
    return filme.videos.filter(
      (video) =>
        video &&
        typeof video.site === "string" &&
        video.site.toLowerCase() === "youtube" &&
        video.chave
    );
  }, [filme]);

  useEffect(() => {
    setActiveTrailerIndex(0);
  }, [filme?.id]);

  useEffect(() => {
    if (!trailers.length) {
      if (activeTrailerIndex !== 0) {
        setActiveTrailerIndex(0);
      }
      return;
    }
    if (activeTrailerIndex > trailers.length - 1) {
      setActiveTrailerIndex(0);
    }
  }, [trailers.length, activeTrailerIndex]);

  // Fetch dos detalhes do filme
  useEffect(() => {
    if (!id) return;

    const fetchFilme = async () => {
      try {
        const res = await fetch(buildApiUrl(`/filmes/detalhes/${id}`));
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
    if (!id) return;

    const fetchOndeAssistir = async () => {
      try {
        const res = await fetch(buildApiUrl(`/filmes/${id}/onde-assistir?pais=PT`));
        if (!res.ok) throw new Error("Erro ao buscar onde assistir");
        const data = await res.json();
        setOndeAssistir(data);
      } catch (err) {
        console.error("Erro ao carregar onde assistir:", err);
      }
    };

    fetchOndeAssistir();
  }, [id]);



  useEffect(() => {
    if (!filme || !isAuthenticated) {
      setWasAdded(false);
      setVistoId(null);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    const controller = new AbortController();

    fetch(buildApiUrl("/vistos/"), {
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
        const filmesVistos = Array.isArray(data.filmes) ? data.filmes : [];
        const existente = filmesVistos.find(
          (item: any) => item && typeof item.tmdb_id === "number" && item.tmdb_id === filme.id
        );
        setWasAdded(!!existente);
        setVistoId(existente && typeof existente.id === "number" ? existente.id : null);
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
      const response = await fetch(buildApiUrl("/vistos/"), {
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
      if (data && typeof data === "object" && typeof data.id === "number") {
        setVistoId(data.id);
      }
      const respostaFavorito = data && typeof data === "object" ? data.favorito : null;
      const successMessage =
        respostaFavorito
          ? "Está nos teus favoritos e vistos!"
          : jaEstavaAdicionado
            ? "Os teus vistos foram atualizados."
            : "Adicionado aos teus vistos!";
      openModal(successMessage);
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

  const handleRemoverDosVistos = async () => {
    if (!vistoId) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setIsAuthenticated(false);
      setFeedback({
        type: "error",
        message: "Precisas de iniciar sessão para removeres dos vistos.",
      });
      return;
    }

    setIsSavingVisto(true);
    setFeedback(null);

    try {
      const response = await fetch(buildApiUrl(`/vistos/${vistoId}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const raw = await response.text();
        let detail: any = null;
        if (raw) {
          try {
            detail = JSON.parse(raw);
          } catch {
            detail = raw;
          }
        }

        const message =
          (detail && typeof detail === "object" && (detail.detail || detail.message)) ||
          (typeof detail === "string" ? detail : null) ||
          "Não foi possível remover este filme dos vistos.";

        throw new Error(message);
      }

      setWasAdded(false);
      setVistoId(null);
      openModal("Removido dos teus vistos.");
    } catch (err) {
      console.error("Erro ao remover dos vistos:", err);
      setFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Erro inesperado ao remover dos vistos.",
      });
    } finally {
      setIsSavingVisto(false);
    }
  };

  const handlePrevTrailer = () => {
    if (trailers.length < 2) return;
    setActiveTrailerIndex((prev) => (prev - 1 + trailers.length) % trailers.length);
  };

  const handleNextTrailer = () => {
    if (trailers.length < 2) return;
    setActiveTrailerIndex((prev) => (prev + 1) % trailers.length);
  };

  const handleSelectTrailer = (index: number) => {
    if (index === activeTrailerIndex) return;
    if (index < 0 || index > trailers.length - 1) return;
    setActiveTrailerIndex(index);
  };

  const activeTrailer = trailers.length
    ? trailers[Math.min(activeTrailerIndex, trailers.length - 1)]
    : null;

  const addButtonLabel = wasAdded
    ? "Já nos teus vistos"
    : isSavingVisto
      ? "A guardar..."
      : "Adicionar aos vistos";

  if (!filme) {
    return (
      <div className={`home-container ${themeMode === "dark" ? "dark" : "light"}`}>
        <NavBar toggleDarkMode={themeMode === "dark"} />
        <div className="detalhes-container">
          {/* Hero Skeleton */}
          <Skeleton height="420px" borderRadius="28px" />

          {/* Content Skeleton */}
          <div style={{ padding: "0 20px" }}>
            <Skeleton width="60%" height="40px" style={{ marginBottom: "20px" }} />
            <Skeleton width="100%" height="20px" style={{ marginBottom: "10px" }} />
            <Skeleton width="100%" height="20px" style={{ marginBottom: "10px" }} />
            <Skeleton width="80%" height="20px" style={{ marginBottom: "30px" }} />

            {/* Meta Skeleton */}
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} width="120px" height="60px" borderRadius="18px" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`home-container ${themeMode === "dark" ? "dark" : "light"}`}>
      <NavBar toggleDarkMode={themeMode === "dark"} />

      {showModal && modalMessage && (
        <div
          className="detalhes-modal-overlay"
          role="alertdialog"
          aria-modal="true"
          onClick={closeModal}
        >
          <div
            className="detalhes-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <p>{modalMessage}</p>
            <button
              type="button"
              className="detalhes-modal-close"
              onClick={closeModal}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      <div className="detalhes-container">
        <section className="detalhes-hero">
          <div className="detalhes-hero-bg-wrapper">
            {filme.backdrop && (
              <img
                className="detalhes-hero-bg"
                src={filme.backdrop}
                alt={filme.titulo}
              />
            )}
            <div className="detalhes-hero-gradient" />
          </div>

          <div className="detalhes-hero-content">
            {filme.poster && (
              <img
                className="detalhes-hero-poster"
                src={filme.poster}
                alt={filme.titulo}
              />
            )}

            <div className="detalhes-hero-main">
              <h1 className="detalhes-title">{filme.titulo}</h1>

              <div className="detalhes-info-line">
                {filme.data_lancamento && (
                  <span>{filme.data_lancamento.split("-")[0]}</span>
                )}
                {filme.duracao && (
                  <>
                    <span className="detalhes-separator">•</span>
                    <span>{Math.floor(filme.duracao / 60)}h {filme.duracao % 60}m</span>
                  </>
                )}
                {typeof filme.nota === "number" && (
                  <>
                    <span className="detalhes-separator">•</span>
                    <span className="detalhes-rating">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#fbbf24" stroke="none" style={{ marginRight: "4px", marginBottom: "2px" }}>
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                      {filme.nota.toFixed(1)}
                    </span>
                  </>
                )}
              </div>

              {filme.generos && filme.generos.length > 0 && (
                <div className="detalhes-genres">
                  {filme.generos.map((g) => (
                    <span key={g} className="detalhes-genre-pill">{g}</span>
                  ))}
                </div>
              )}

              {filme.sinopse && (
                <p className="detalhes-sinopse">{filme.sinopse}</p>
              )}

              {isAuthenticated ? (
                <div className="detalhes-actions">
                  <button
                    className={`detalhes-cta ${wasAdded ? "detalhes-cta-adicionado" : ""}`}
                    onClick={handleAdicionarAosVistos}
                    disabled={isSavingVisto || wasAdded}
                    type="button"
                  >
                    {wasAdded ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        {addButtonLabel}
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                        </svg>
                        {addButtonLabel}
                      </>
                    )}
                  </button>
                  {wasAdded && (
                    <button
                      className="detalhes-cta detalhes-cta-remover"
                      onClick={handleRemoverDosVistos}
                      disabled={isSavingVisto}
                      type="button"
                      title="Remover dos vistos"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  )}
                  {feedback && (
                    <span
                      className={`detalhes-feedback ${feedback.type === "success" ? "sucesso" : "erro"
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
        </section>

        {ondeAssistir && (
          <section className="detalhes-section onde-assistir-section">
            <div className="detalhes-section-header">
              <h2>Onde Assistir</h2>
            </div>

            {ondeAssistir.flatrate?.length > 0 && (
              <>
                <div className="titulo-onde-assistir">
                  <h3>Streaming</h3>
                </div>
                <div className="providers-grid">
                  {ondeAssistir.flatrate.map((prov: any) => (
                    <div key={prov.provider_name} className="provider-card">
                      <img src={`https://image.tmdb.org/t/p/w200${prov.logo_path}`} />
                      <p>{prov.provider_name}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {ondeAssistir.rent?.length > 0 && (
              <>
                <div className="titulo-onde-assistir">
                  <h3>Alugar</h3>
                </div>
                <div className="providers-grid">
                  {ondeAssistir.rent.map((prov: any) => (
                    <div key={prov.provider_name} className="provider-card">
                      <img src={`https://image.tmdb.org/t/p/w200${prov.logo_path}`} />
                      <p>{prov.provider_name}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {ondeAssistir.buy?.length > 0 && (
              <>
                <div className="titulo-onde-assistir">
                  <h3>Comprar</h3>
                </div>
                <div className="providers-grid">
                  {ondeAssistir.buy.map((prov: any) => (
                    <div key={prov.provider_name} className="provider-card">
                      <img src={`https://image.tmdb.org/t/p/w200${prov.logo_path}`} />
                      <p>{prov.provider_name}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {(!ondeAssistir.flatrate?.length &&
              !ondeAssistir.rent?.length &&
              !ondeAssistir.buy?.length) && (
                <p className="detalhes-sem-plataformas">
                  Não está disponível em nenhuma plataforma de streaming em Portugal.
                </p>
              )}
          </section>
        )}


        {activeTrailer && (
          <section className="detalhes-section detalhes-trailer-section">
            <div className="detalhes-section-header">
              <h2>Trailer{trailers.length > 1 ? "s" : ""}</h2>
              {trailers.length > 1 && (
                <span className="detalhes-trailer-count">
                  {activeTrailerIndex + 1}/{trailers.length}
                </span>
              )}
            </div>
            <div className="detalhes-trailer-player">
              <iframe
                key={activeTrailer.chave}
                src={`https://www.youtube.com/embed/${activeTrailer.chave}`}
                title={activeTrailer.tipo || "Trailer"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            {trailers.length > 1 && (
              <div className="detalhes-trailer-controls">
                <button
                  type="button"
                  className="detalhes-trailer-button"
                  onClick={handlePrevTrailer}
                >
                  Anterior
                </button>
                <div className="detalhes-trailer-dots">
                  {trailers.map((video, idx) => (
                    <button
                      key={video.chave}
                      type="button"
                      className={`detalhes-trailer-dot ${idx === activeTrailerIndex ? "ativo" : ""
                        }`}
                      onClick={() => handleSelectTrailer(idx)}
                      aria-label={`Ver trailer ${idx + 1}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="detalhes-trailer-button"
                  onClick={handleNextTrailer}
                >
                  Seguinte
                </button>
              </div>
            )}
          </section>
        )}

        {filme.elenco && filme.elenco.length > 0 && (
          <section className="detalhes-section">
            <div className="detalhes-section-header">
              <h2>Elenco</h2>
            </div>
            <div className="elenco-grid">
              {filme.elenco.map((ator, idx) => {
                const fotoSrc = ator.foto || ATOR_PLACEHOLDER;
                return (
                  <div className="elenco-card" key={`${ator.nome}-${idx}`}>
                    <img src={fotoSrc} alt={ator.nome} />
                    <p className="elenco-nome">{ator.nome}</p>
                    {ator.personagem && (
                      <p className="elenco-personagem">{ator.personagem}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="detalhes-section comentarios-wrapper">
          <ComentariosSection
            contentId={filme.id}
            contentType="filme"
            alvoTitulo={filme.titulo}
            modoEscuroAtivo={themeMode === "dark"}
          />
        </section>
      </div>
    </div>
  );
}
