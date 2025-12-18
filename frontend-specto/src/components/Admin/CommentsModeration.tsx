import { useEffect, useState } from "react";
import { buildApiUrl } from "../../utils/api";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";

type CommentAdmin = {
    id: number;
    user_id: number;
    username: string;
    content: string;
    created_at: string;
    target_type: string;
    target_title: string;
};

export default function CommentsModeration() {
    const [comments, setComments] = useState<CommentAdmin[]>([]);
    const [loading, setLoading] = useState(true);
    const [page] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const fetchComments = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        setLoading(true);
        try {
            const params = new URLSearchParams({
                skip: (page * 50).toString(),
                limit: "50",
            });

            const res = await fetch(buildApiUrl(`/admin/comments?${params.toString()}`), {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) throw new Error("Erro ao carregar comentários");

            const data = await res.json();
            setComments(data);
        } catch (err) {
            console.error(err);
            setError("Erro ao carregar comentários.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComments();
    }, [page]);

    const handleDelete = async (commentId: number) => {
        const token = localStorage.getItem("token");
        if (!token) return;

        if (!confirm("Tens a certeza que queres apagar este comentário?")) return;

        try {
            const res = await fetch(buildApiUrl(`/admin/comments/${commentId}`), {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) throw new Error("Erro ao apagar comentário");

            setComments(prev => prev.filter(c => c.id !== commentId));
        } catch (err) {
            console.error(err);
            alert("Erro ao apagar comentário");
        }
    };

    return (
        <div className="admin-section">
            {loading ? (
                <div className="perfil-loader">
                    <LoadingSpinner color="#3b82f6" size="medium" />
                </div>
            ) : error ? (
                <p className="error-msg">{error}</p>
            ) : (
                <div className="admin-table-container">
                    <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Autor</th>
                                <th>Conteúdo</th>
                                <th>Alvo</th>
                                <th>Data</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {comments.map(comment => (
                                <tr key={comment.id}>
                                    <td>
                                        <strong>{comment.username}</strong>
                                        <br />
                                        <small>ID: {comment.user_id}</small>
                                    </td>
                                    <td style={{ maxWidth: "400px" }}>{comment.content}</td>
                                    <td>
                                        {comment.target_title}
                                        <br />
                                        <small className="role-badge role-user" style={{ fontSize: "0.7rem" }}>
                                            {comment.target_type === "movie" ? "Filme" : "Série"}
                                        </small>
                                    </td>
                                    <td>{new Date(comment.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <button
                                            className="admin-action-btn btn-danger"
                                            onClick={() => handleDelete(comment.id)}
                                        >
                                            Apagar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                </div>
            )}
        </div>
    );
}
