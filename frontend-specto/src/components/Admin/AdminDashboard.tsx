import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../NavBar/NavBar";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";
import { buildApiUrl } from "../../utils/api";
import { readTheme, subscribeTheme, type ThemeMode } from "../../utils/theme";
import "./Admin.css";
import UsersTable from "./UsersTable";
import CommentsModeration from "./CommentsModeration";

type DashboardStats = {
    total_users: number;
    total_movies_watched: number;
    total_series_watched: number;
    total_comments: number;
    recent_users: Array<{
        id: number;
        username: string;
        email: string;
        created_at: string;
    }>;
};

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [themeMode, setThemeMode] = useState<ThemeMode>(readTheme);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"overview" | "users" | "comments">("overview");

    useEffect(() => {
        const unsubscribe = subscribeTheme(setThemeMode);
        return unsubscribe;
    }, []);

    useEffect(() => {
        const fetchStats = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                navigate("/login");
                return;
            }

            try {
                const res = await fetch(buildApiUrl("/admin/stats"), {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.status === 403) {
                    setError("Acesso negado. Apenas administradores.");
                    setLoading(false);
                    return;
                }

                if (!res.ok) throw new Error("Erro ao carregar estatísticas");

                const data = await res.json();
                setStats(data);
            } catch (err) {
                console.error(err);
                setError("Erro ao carregar painel de administração.");
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [navigate]);

    const activityLogs = useMemo(() => {
        if (!stats) return [];
        return stats.recent_users.slice(0, 6).map((user) => ({
            id: user.id,
            title: "Novo Registo",
            description: `${user.username} criou conta`,
            date: new Date(user.created_at).toLocaleDateString(),
        }));
    }, [stats]);

    const registrationChartData = useMemo(() => {
        if (!stats) return [];
        const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 30;
        const counts = stats.recent_users.reduce<Record<string, number>>((acc, user) => {
            const createdAt = new Date(user.created_at);
            if (createdAt.getTime() < cutoff) return acc;
            const isoDate = createdAt.toISOString().slice(0, 10);
            acc[isoDate] = (acc[isoDate] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([iso, count]) => ({
                iso,
                count,
                label: new Date(iso).toLocaleDateString(),
            }));
    }, [stats]);

    const chartMax = useMemo(() => {
        if (!registrationChartData.length) return 1;
        return Math.max(...registrationChartData.map((item) => item.count));
    }, [registrationChartData]);

    if (loading) {
        return (
            <div className={`admin-container ${themeMode === "dark" ? "dark" : "light"}`}>
                <NavBar toggleDarkMode={themeMode === "dark"} />
                <div className="perfil-loader">
                    <LoadingSpinner color="#3b82f6" size="large" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`admin-container ${themeMode === "dark" ? "dark" : "light"}`}>
                <NavBar toggleDarkMode={themeMode === "dark"} />
                <div className="admin-content">
                    <div className="perfil-empty">
                        <p>{error}</p>
                        <button className="perfil-btn" onClick={() => navigate("/home")}>
                            Voltar ao Início
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`admin-container ${themeMode === "dark" ? "dark" : "light"}`}>
            <NavBar toggleDarkMode={themeMode === "dark"} />

            <div className="admin-content">
                <header className="admin-header">
                    <h1>Painel de Administração</h1>
                </header>

                <div className="admin-tabs">
                    <button
                        className={`admin-tab ${activeTab === "overview" ? "active" : ""}`}
                        onClick={() => setActiveTab("overview")}
                    >
                        Visão Geral
                    </button>
                    <button
                        className={`admin-tab ${activeTab === "users" ? "active" : ""}`}
                        onClick={() => setActiveTab("users")}
                    >
                        Utilizadores
                    </button>
                    <button
                        className={`admin-tab ${activeTab === "comments" ? "active" : ""}`}
                        onClick={() => setActiveTab("comments")}
                    >
                        Comentários
                    </button>
                </div>

                {activeTab === "overview" && stats && (
                    <div className="admin-overview">
                        <div className="admin-stats-grid">
                            <div className="stat-card">
                                <div className="stat-value">{stats.total_users}</div>
                                <div className="stat-label">Utilizadores Totais</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">{stats.total_movies_watched}</div>
                                <div className="stat-label">Filmes Vistos</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">{stats.total_series_watched}</div>
                                <div className="stat-label">Séries Vistas</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">{stats.total_comments}</div>
                                <div className="stat-label">Comentários</div>
                            </div>
                        </div>

                        <div className="admin-section">
                            <h3>Novos Utilizadores</h3>
                            <div className="admin-table-container">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Username</th>
                                            <th>Email</th>
                                            <th>Data de Registo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.recent_users.map(user => (
                                            <tr key={user.id}>
                                                <td>#{user.id}</td>
                                                <td>{user.username}</td>
                                                <td>{user.email}</td>
                                                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="admin-insights-grid">
                            <div className="admin-card-panel">
                                <div className="panel-header">
                                    <h3>Registos Recentes</h3>
                                    <span>{activityLogs.length} eventos</span>
                                </div>
                                {activityLogs.length === 0 ? (
                                    <p className="empty-panel">Sem eventos recentes.</p>
                                ) : (
                                    <ul className="admin-log-list">
                                        {activityLogs.map((log) => (
                                            <li key={`${log.id}-${log.date}`} className="log-item">
                                                <div className="log-icon">📝</div>
                                                <div className="log-details">
                                                    <strong>{log.title}</strong>
                                                    <p>{log.description}</p>
                                                    <small>{log.date}</small>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div className="admin-card-panel">
                                <div className="panel-header">
                                    <h3>Gráfico de Registos</h3>
                                    <span>Últimos 30 dias</span>
                                </div>
                                {registrationChartData.length === 0 ? (
                                    <p className="empty-panel">Sem dados suficientes.</p>
                                ) : (
                                    <div className="registration-chart">
                                        {registrationChartData.map((item) => (
                                            <div key={item.iso} className="chart-bar">
                                                <div
                                                    className="bar-fill"
                                                    style={{ height: `${(item.count / chartMax) * 100}%` }}
                                                />
                                                <span className="bar-count">{item.count}</span>
                                                <span className="bar-date">{item.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "users" && <UsersTable />}
                {activeTab === "comments" && <CommentsModeration />}
            </div>
        </div>
    );
}
