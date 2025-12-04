import { useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import "./Detalhes.css";
import "../Home/Home.css";
import NavBar from "../NavBar/NavBar";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";
import ComentariosSection from "./ComentariosSection";
import { readTheme, subscribeTheme, type ThemeMode } from "../../utils/theme";
import { buildApiUrl } from "../../utils/api";

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

    fetch(buildApiUrl("/vistos"), {
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
      const response = await fetch(buildApiUrl("/vistos"), {
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

  const metaItems = [
    filme?.data_lancamento
      ? { label: "Estreia", value: filme.data_lancamento }
      : null,
    typeof filme?.nota === "number"
      ? { label: "Nota", value: `${filme.nota.toFixed(1)} ⭐` }
      : null,
    filme?.adult !== undefined
      ? { label: "Classificação", value: filme.adult ? "Adulto" : "Livre" }
      : null,
    filme?.generos?.length
      ? { label: "Géneros", value: filme.generos.join(", ") }
      : null,
    filme?.duracao
      ? { label: "Duração", value: `${filme.duracao} min` }
      : null,
    typeof filme?.orcamento === "number" && filme.orcamento > 0
      ? { label: "Orçamento", value: `$${filme.orcamento.toLocaleString()}` }
      : null,
    typeof filme?.receita === "number" && filme.receita > 0
      ? { label: "Receita", value: `$${filme.receita.toLocaleString()}` }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const activeTrailer = trailers.length
    ? trailers[Math.min(activeTrailerIndex, trailers.length - 1)]
    : null;

  const addButtonLabel = wasAdded
    ? "Já nos teus vistos"
    : isSavingVisto
    ? "A guardar..."
    : "Adicionar aos vistos";

  const removeButtonLabel = isSavingVisto
    ? "A remover..."
    : "Remover dos vistos";

  if (!filme) return <LoadingSpinner color="#3b82f6" size="large" />;

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
          {filme.backdrop && (
            <img
              className="detalhes-hero-bg"
              src={filme.backdrop}
              alt={filme.titulo}
            />
          )}
          <div className="detalhes-hero-gradient" />
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
              {filme.sinopse && (
                <p className="detalhes-sinopse">{filme.sinopse}</p>
              )}

              {metaItems.length > 0 && (
                <div className="detalhes-meta">
                  {metaItems.map((item) => (
                    <div className="detalhes-meta-item" key={item.label}>
                      <span className="detalhes-meta-label">{item.label}</span>
                      <span className="detalhes-meta-value">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
              {isAuthenticated ? (
                <div className="detalhes-actions">
                  <button
                    className={`detalhes-cta ${wasAdded ? "detalhes-cta-adicionado" : ""}`}
                    onClick={handleAdicionarAosVistos}
                    disabled={isSavingVisto || wasAdded}
                    type="button"
                  >
                    {addButtonLabel}
                  </button>
                  {wasAdded && (
                    <button
                      className="detalhes-cta detalhes-cta-remover"
                      onClick={handleRemoverDosVistos}
                      disabled={isSavingVisto}
                      type="button"
                    >
                      {removeButtonLabel}
                    </button>
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
                      className={`detalhes-trailer-dot ${
                        idx === activeTrailerIndex ? "ativo" : ""
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
