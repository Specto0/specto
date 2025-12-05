import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { buildApiUrl } from "../../utils/api";
import ForumChat from "./ForumChat";
import NavBar from "../NavBar/NavBar";
import { readTheme, subscribeTheme, type ThemeMode } from "../../utils/theme";
import "./Forum.css";

type UserMini = { id: number; username: string };

type ForumPost = {
  id: number;
  content: string;
  created_at: string;
  user: UserMini;
};

type ForumTopicDetail = {
  id: number;
  type: string;
  title: string;
  description?: string | null;
  posts: ForumPost[];
};

export default function ForumTopicPage() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const token = React.useMemo(() => localStorage.getItem("token"), []);

  const [topic, setTopic] = useState<ForumTopicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<{ id: number; username: string; avatar_url?: string } | null>(null);

  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readTheme());

  useEffect(() => {
    const unsubscribe = subscribeTheme(setThemeMode);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    // Fetch current user
    fetch(buildApiUrl("/me"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Falha ao carregar utilizador");
      })
      .then((data) => setCurrentUser(data))
      .catch((err) => console.error(err));

    const id = Number(topicId);
    if (!id) {
      navigate("/forum");
      return;
    }

    const load = async () => {
      try {
        const res = await fetch(buildApiUrl(`/forum/topics/${id}`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          navigate("/login");
          return;
        }
        if (!res.ok) throw new Error("Não foi possível carregar o tópico.");
        const data = await res.json();
        setTopic(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar tópico.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [topicId, token, navigate]);

  if (!token) return null;

  return (
    <div className={`forum-page ${themeMode === "dark" ? "dark" : "light"}`}>
      <NavBar toggleDarkMode={themeMode === "dark"} />

      <div className="forum-container">
        <button className="forum-back" onClick={() => navigate("/forum")}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
          Voltar ao Fórum
        </button>

        {loading && <div className="forum-loading">A carregar tópico...</div>}
        {error && <div className="forum-error">{error}</div>}

        {!loading && topic && currentUser && (
          <>
            <div className="forum-header" style={{ textAlign: 'left', marginBottom: '2rem' }}>
              <h1>{topic.title}</h1>
              {topic.description && <p>{topic.description}</p>}
            </div>

            <div className="forum-chat-container">
              <div className="forum-chat-full">
                <ForumChat topicId={topic.id} token={token} currentUser={currentUser} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
