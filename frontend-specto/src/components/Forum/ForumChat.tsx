import React from "react";
import { buildWsUrl, buildApiUrl } from "../../utils/api";
import { resolveAvatarUrl } from "../../utils/avatar";
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
  const [typingUsers, setTypingUsers] = React.useState<string[]>([]);
  const [onlineCount, setOnlineCount] = React.useState(0);

  const socketRef = React.useRef<WebSocket | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const messagesAreaRef = React.useRef<HTMLDivElement>(null);
  const lastTypingSentRef = React.useRef<number>(0);

  // Auto-scroll só quando está perto do fundo ou é mensagem própria
  const shouldAutoScroll = React.useRef(true);

  const checkScrollPosition = () => {
    if (messagesAreaRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesAreaRef.current;
      // Se está a menos de 100px do fundo, fazer auto-scroll
      shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 100;
    }
  };

  const scrollToBottom = (force = false) => {
    if (force || shouldAutoScroll.current) {
      if (messagesAreaRef.current) {
        // Usar scrollTop no container em vez de scrollIntoView para não afetar a página
        messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
      }
    }
  };

  React.useEffect(() => {
    // Só fazer scroll se shouldAutoScroll é true
    if (shouldAutoScroll.current) {
      scrollToBottom();
    }
  }, [messages]);

  // Som de notificação
  const playNotificationSound = React.useCallback(() => {
    // Usar Web Audio API para um som simples
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.value = 0.1;
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch {
      // Ignorar erros de áudio
    }
  }, []);

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
          // Scroll para o fundo ao carregar histórico
          setTimeout(() => scrollToBottom(true), 100);
        } else if (payload.type === "message" && payload.data) {
          const isOwnMessage = payload.data.user.id === currentUser.id;
          setMessages((prev) => [...prev, payload.data]);
          
          // Tocar som apenas se não é mensagem própria
          if (!isOwnMessage) {
            playNotificationSound();
          }
          // Scroll automático se for mensagem própria
          if (isOwnMessage) {
            setTimeout(() => scrollToBottom(true), 50);
          }
        } else if (payload.type === "like_update" && payload.data) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === payload.data.message_id
                ? { ...msg, likes: payload.data.likes }
                : msg
            )
          );
        } else if (payload.type === "typing" && payload.username) {
          // Adicionar utilizador à lista de typing
          if (payload.username !== currentUser.username) {
            setTypingUsers((prev) => {
              if (!prev.includes(payload.username)) {
                return [...prev, payload.username];
              }
              return prev;
            });
            // Remover após 3 segundos
            setTimeout(() => {
              setTypingUsers((prev) => prev.filter((u) => u !== payload.username));
            }, 3000);
          }
        } else if (payload.type === "online_count") {
          setOnlineCount(payload.count || 0);
        }
      } catch (err) {
        console.error("Erro a ler mensagem do socket", err);
      }
    };

    return () => {
      ws.close();
    };
  }, [topicId, token, currentUser.id, currentUser.username, playNotificationSound]);

  // Enviar evento de typing com debounce
  const sendTypingEvent = React.useCallback(() => {
    const now = Date.now();
    // Só enviar se passou mais de 2 segundos desde o último
    if (now - lastTypingSentRef.current > 2000 && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "typing" }));
      lastTypingSentRef.current = now;
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (e.target.value.trim()) {
      sendTypingEvent();
    }
  };

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    socketRef.current.send(text);
    setInput("");
  };

  // Usando a função padronizada resolveAvatarUrl em vez de uma local

  const toggleLike = async (msgId: number) => {
    // Optimistic update
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
    }
  };

  const renderAvatar = (user: { username: string; avatar_url?: string }) => {
    const url = resolveAvatarUrl(user.avatar_url);
    if (url) {
      return (
        <img 
          src={url} 
          alt={user.username} 
          className="chat-avatar"
          onError={(e) => {
            // Se a imagem falhar, substituir por fallback
            const target = e.currentTarget;
            target.style.display = 'none';
            const fallback = document.createElement('div');
            fallback.className = 'chat-avatar-fallback';
            fallback.textContent = user.username.charAt(0).toUpperCase();
            target.parentNode?.insertBefore(fallback, target);
          }}
        />
      );
    }
    return (
      <div className="chat-avatar-fallback">
        {user.username.charAt(0).toUpperCase()}
      </div>
    );
  };

  // Formatar mensagem com menções destacadas
  const formatMessage = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        return (
          <span key={index} className="chat-mention">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="chat-component">
      <div className="chat-header">
        <span>Chat em Tempo Real</span>
        <div className="chat-header-right">
          {onlineCount > 0 && (
            <span className="online-badge">
              🟢 {onlineCount} online
            </span>
          )}
          <span className={`badge badge-${status}`}>
            {status === "connected" ? "Ligado" : status === "connecting" ? "A ligar..." : "Desligado"}
          </span>
        </div>
      </div>

      <div 
        className="chat-messages-area" 
        ref={messagesAreaRef}
        onScroll={checkScrollPosition}
      >
        {messages.map((msg) => {
          const isMine = msg.user.id === currentUser.id;
          return (
            <div key={msg.id} className={`chat-message-row ${isMine ? "mine" : "theirs"}`}>
              {!isMine && renderAvatar(msg.user)}
              <div className={`chat-bubble ${isMine ? "mine" : ""}`}>
                <div className="chat-bubble-meta">
                  {msg.user.username} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div>{formatMessage(msg.message)}</div>

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
        {messages.length === 0 && (
          <div className="forum-muted" style={{ textAlign: "center", marginTop: "2rem" }}>
            Sem mensagens ainda. Sê o primeiro!
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Indicador de "está a escrever" */}
      {typingUsers.length > 0 && (
        <div className="typing-indicator">
          <div className="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span>
            {typingUsers.length === 1
              ? `${typingUsers[0]} está a escrever...`
              : `${typingUsers.slice(0, 2).join(", ")} estão a escrever...`}
          </span>
        </div>
      )}

      <div className="chat-input-area">
        <input
          type="text"
          placeholder="Escreve uma mensagem..."
          value={input}
          onChange={handleInputChange}
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
