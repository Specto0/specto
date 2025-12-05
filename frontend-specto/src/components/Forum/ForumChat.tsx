import React from "react";
import { buildWsUrl, buildApiUrl } from "../../utils/api";
import "./Forum.css";

type ChatMessage = {
  id: number;
  topic_id: number;
  user: { id: number; username: string; avatar_url?: string };
  message: string;
  created_at: string;
  likes: number;
  liked_by_me: boolean;
};

type Props = {
  topicId: number;
  token: string;
  currentUser: { id: number; username: string; avatar_url?: string };
};

export default function ForumChat({ topicId, token, currentUser }: Props) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [status, setStatus] = React.useState<"connecting" | "connected" | "closed">(
    "connecting"
  );
  const socketRef = React.useRef<WebSocket | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  React.useEffect(() => {
    const wsUrl = `${buildWsUrl(`forum/${topicId}/ws`)}?token=${encodeURIComponent(
      token
    )}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => setStatus("connected");
    ws.onclose = () => setStatus("closed");
    ws.onerror = () => setStatus("closed");
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "history" && Array.isArray(payload.messages)) {
          setMessages(payload.messages);
        } else if (payload.type === "message" && payload.data) {
          setMessages((prev) => [...prev, payload.data]);
        } else if (payload.type === "like_update" && payload.data) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === payload.data.message_id
                ? { ...msg, likes: payload.data.likes }
                : msg
            )
          );
        }
      } catch (err) {
        console.error("Erro a ler mensagem do socket", err);
      }
    };

    return () => {
      ws.close();
    };
  }, [topicId, token]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    socketRef.current.send(text);
    setInput("");
  };

  const getAvatarUrl = (avatarPath?: string) => {
    if (!avatarPath) return null;
    if (avatarPath.startsWith("http")) return avatarPath;
    return `http://localhost:8000${avatarPath}`;
  };

  const toggleLike = async (msgId: number) => {
    // Otimistic update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId) {
          const newLiked = !m.liked_by_me;
          return {
            ...m,
            liked_by_me: newLiked,
            likes: newLiked ? m.likes + 1 : m.likes - 1,
          };
        }
        return m;
      })
    );

    try {
      await fetch(buildApiUrl(`/forum/messages/${msgId}/like`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("Erro ao dar like", err);
      // Revert on error (optional, keeping simple for now)
    }
  };

  const renderAvatar = (user: { username: string; avatar_url?: string }) => {
    const url = getAvatarUrl(user.avatar_url);
    if (url) {
      return <img src={url} alt={user.username} className="chat-avatar" />;
    }
    return (
      <div className="chat-avatar-fallback">
        {user.username.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="chat-component">
      <div className="chat-header">
        <span>Chat em Tempo Real</span>
        <span className={`badge badge-${status}`}>
          {status === "connected" ? "Ligado" : status === "connecting" ? "A ligar..." : "Desligado"}
        </span>
      </div>

      <div className="chat-messages-area">
        {messages.map((msg) => {
          const isMine = msg.user.id === currentUser.id;
          return (
            <div key={msg.id} className={`chat-message-row ${isMine ? "mine" : "theirs"}`}>
              {!isMine && renderAvatar(msg.user)}
              <div className={`chat-bubble ${isMine ? "mine" : ""}`}>
                <div className="chat-bubble-meta">
                  {msg.user.username} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div>{msg.message}</div>

                <div className="chat-bubble-actions">
                  <button
                    className={`chat-like-btn ${msg.liked_by_me ? "liked" : ""}`}
                    onClick={() => toggleLike(msg.id)}
                    title={msg.liked_by_me ? "Remover like" : "Gostar"}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={msg.liked_by_me ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    {msg.likes > 0 && <span className="like-count">{msg.likes}</span>}
                  </button>
                </div>
              </div>
              {isMine && renderAvatar(currentUser)}
            </div>
          );
        })}
        {messages.length === 0 && <div className="forum-muted" style={{ textAlign: "center", marginTop: "2rem" }}>Sem mensagens ainda. Sê o primeiro!</div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <input
          type="text"
          placeholder="Escreve uma mensagem..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage} disabled={status !== "connected" || !input.trim()}>
          Enviar
        </button>
      </div>
    </div>
  );
}
