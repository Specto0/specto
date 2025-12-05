import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import NavBar from "../NavBar/NavBar";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";
import { buildApiUrl } from "../../utils/api";
import { readTheme, subscribeTheme, type ThemeMode } from "../../utils/theme";
import "./PublicProfile.css";

type VistoItem = {
    id: number;
    tipo: "filme" | "serie";
    tmdb_id: number;
    titulo: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
    favorito: boolean;
    data_visto: string;
    media_avaliacao?: number | null;
    votos?: number | null;
};

type PublicProfileData = {
    user: {
        id: number;
        username: string;
        avatar_url?: string | null;
        created_at: string;
    };
    stats: {
        total_filmes: number;
        total_series: number;
        total_comentarios: number;
        total_likes_recebidos: number;
    };
    vistos: {
        filmes: VistoItem[];
        series: VistoItem[];
    };
};

const MAX_ITENS = 6;

export default function PublicProfile() {
    const { userId } = useParams();
    const [data, setData] = useState<PublicProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [themeMode, setThemeMode] = useState<ThemeMode>(readTheme);
    const [expandir, setExpandir] = useState({ filmes: false, series: false });

    useEffect(() => {
        const unsubscribe = subscribeTheme(setThemeMode);
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (!userId) return;

        const loadProfile = async () => {
            try {
                const res = await fetch(buildApiUrl(`/users/${userId}/profile`));
                if (!res.ok) {
                    if (res.status === 404) throw new Error("Utilizador não encontrado.");
                    throw new Error("Erro ao carregar perfil.");
                }
                const json = await res.json();
                setData(json);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Erro desconhecido.");
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [userId]);

    const renderCards = (items: VistoItem[], mostrarTodos: boolean) => {
        if (!items.length) return null;
        const lista = mostrarTodos ? items : items.slice(0, MAX_ITENS);
        return (
            <div className="perfil-grid">
                {lista.map((item) => (
                    <Link
                        key={`${item.tipo}-${item.id}`}
                        to={`/${item.tipo === "filme" ? "filme" : "serie"}/${item.tmdb_id}`}
                        className={`perfil-card ${item.favorito ? "perfil-card-favorito" : ""}`}
                    >
                        <div className="perfil-card-thumb">
                            <img
                                src={
                                    item.poster_path ||
                                    (item.backdrop_path
                                        ? item.backdrop_path
                                        : "https://via.placeholder.com/200x300?text=Sem+Imagem")
                                }
                                alt={item.titulo}
                            />
                            {item.favorito && <span className="perfil-card-badge">★ Favorito</span>}
                        </div>
                        <div className="perfil-card-body">
                            <h3 className="perfil-card-title">{item.titulo}</h3>
                            <div className="perfil-card-info-top">
                                {item.media_avaliacao !== null && (
                                    <span className="perfil-card-rating">
                                        {item.media_avaliacao?.toFixed(1)} ⭐
                                    </span>
                                )}
                                <span className="perfil-card-sep">·</span>
                                <span className="perfil-card-type">
                                    {item.tipo === "filme" ? "Filme" : "Série"}
                                </span>
                            </div>
                            <div className="perfil-card-info-bottom">
                                {new Date(item.data_visto).toLocaleDateString("pt-PT")}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        );
    };

    if (loading) {
        return (
            <div className={`home-container ${themeMode === "dark" ? "dark" : "light"}`}>
                <NavBar toggleDarkMode={themeMode === "dark"} />
                <div className="perfil-loader">
                    <LoadingSpinner color="#3b82f6" size="large" />
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className={`home-container ${themeMode === "dark" ? "dark" : "light"}`}>
                <NavBar toggleDarkMode={themeMode === "dark"} />
                <div className="perfil-wrapper">
                    <div className="perfil-empty">
                        <p>{error || "Perfil não encontrado."}</p>
                        <Link className="perfil-btn" to="/home">Voltar ao Início</Link>
                    </div>
                </div>
            </div>
        );
    }

    const userInitials = data.user.username.trim().charAt(0).toUpperCase();

    return (
        <div className={`home-container ${themeMode === "dark" ? "dark" : "light"}`}>
            <NavBar toggleDarkMode={themeMode === "dark"} />
            <div className="perfil-wrapper">
                <header className="perfil-header public-profile-header">
                    <div className="perfil-user">
                        <div className="perfil-user-avatar">
                            {data.user.avatar_url ? (
                                <img src={data.user.avatar_url} alt={data.user.username} className="perfil-user-avatar-img" />
                            ) : (
                                <span>{userInitials}</span>
                            )}
                        </div>
                        <div className="perfil-user-meta">
                            <h1>Perfil de {data.user.username}</h1>
                            <p>Membro desde {new Date(data.user.created_at).toLocaleDateString("pt-PT")}</p>
                        </div>
                    </div>
                </header>

                <div className="profile-stats-grid">
                    <div className="stat-card">
                        <div className="stat-value">{data.stats.total_filmes}</div>
                        <div className="stat-label">Filmes Vistos</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{data.stats.total_series}</div>
                        <div className="stat-label">Séries Vistas</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{data.stats.total_comentarios}</div>
                        <div className="stat-label">Comentários</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{data.stats.total_likes_recebidos}</div>
                        <div className="stat-label">Gostos Recebidos</div>
                    </div>
                </div>

                <main className="perfil-content">
                    <section>
                        <h2>Filmes Vistos ({data.vistos.filmes.length})</h2>
                        {data.vistos.filmes.length ? (
                            <>
                                {renderCards(data.vistos.filmes, expandir.filmes)}
                                {data.vistos.filmes.length > MAX_ITENS && (
                                    <button
                                        className={`perfil-toggle ${expandir.filmes ? "ativo" : ""}`}
                                        onClick={() => setExpandir(p => ({ ...p, filmes: !p.filmes }))}
                                    >
                                        {expandir.filmes ? "Ver menos" : "Ver todos"}
                                    </button>
                                )}
                            </>
                        ) : (
                            <p className="perfil-empty">Nenhum filme visto ainda.</p>
                        )}
                    </section>

                    <section>
                        <h2>Séries Vistas ({data.vistos.series.length})</h2>
                        {data.vistos.series.length ? (
                            <>
                                {renderCards(data.vistos.series, expandir.series)}
                                {data.vistos.series.length > MAX_ITENS && (
                                    <button
                                        className={`perfil-toggle ${expandir.series ? "ativo" : ""}`}
                                        onClick={() => setExpandir(p => ({ ...p, series: !p.series }))}
                                    >
                                        {expandir.series ? "Ver menos" : "Ver todas"}
                                    </button>
                                )}
                            </>
                        ) : (
                            <p className="perfil-empty">Nenhuma série vista ainda.</p>
                        )}
                    </section>
                </main>
            </div>
        </div>
    );
}
