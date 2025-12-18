import { useEffect, useState } from "react";
import { buildApiUrl } from "../../utils/api";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";

type UserAdmin = {
    id: number;
    username: string;
    email: string;
    role: string;
    created_at: string;
};

export default function UsersTable() {
    const [users, setUsers] = useState<UserAdmin[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        setLoading(true);
        try {
            const params = new URLSearchParams({
                skip: (page * 50).toString(),
                limit: "50",
            });
            if (search) params.append("search", search);

            const res = await fetch(buildApiUrl(`/admin/users?${params.toString()}`), {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) throw new Error("Erro ao carregar utilizadores");

            const data = await res.json();
            setUsers(data);
        } catch (err) {
            console.error(err);
            setError("Erro ao carregar lista de utilizadores.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [page, search]);

    const handleRoleChange = async (userId: number, newRole: string) => {
        const token = localStorage.getItem("token");
        if (!token) return;

        if (!confirm(`Tens a certeza que queres mudar o cargo deste utilizador para ${newRole}?`)) return;

        try {
            const res = await fetch(buildApiUrl(`/admin/users/${userId}/role`), {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ role: newRole }),
            });

            if (!res.ok) {
                const err = await res.json();
                alert(err.detail || "Erro ao atualizar cargo");
                return;
            }

            // Update local state
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (err) {
            console.error(err);
            alert("Erro ao atualizar cargo");
        }
    };

    return (
        <div className="admin-section">
            <div className="admin-header-actions">
                <input
                    type="text"
                    placeholder="Pesquisar utilizador..."
                    className="search-input"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="perfil-loader">
                    <LoadingSpinner color="#3b82f6" size="medium" />
                </div>
            ) : error ? (
                <p className="error-msg">{error}</p>
            ) : (
                <div className="admin-table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Username</th>
                                <th>Email</th>
                                <th>Cargo</th>
                                <th>Data de Registo</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td>#{user.id}</td>
                                    <td>{user.username}</td>
                                    <td>{user.email}</td>
                                    <td>
                                        <span className={`role-badge role-${user.role}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                    <td>
                                        {user.role === "user" ? (
                                            <button
                                                className="admin-action-btn btn-primary"
                                                onClick={() => handleRoleChange(user.id, "admin")}
                                            >
                                                Promover a Admin
                                            </button>
                                        ) : (
                                            <button
                                                className="admin-action-btn btn-danger"
                                                onClick={() => handleRoleChange(user.id, "user")}
                                            >
                                                Despromover
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
