import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { resolveAvatarUrl } from "../../utils/avatar";
import { buildApiUrl } from "@/utils/api";

type ComentarioApiUser = {
  id: number;
  username: string;
  avatar_url?: string | null;
};

type ComentarioApi = {
  id: number;
  texto: string;
  created_at: string;
  likes: number;
  liked_by_user: boolean;
  user: ComentarioApiUser;
  replies: ComentarioApi[];
};

type ComentarioNode = {
  id: number;
  userId: number;
  username: string;
  avatarUrl?: string | null;
  content: string;
  createdAt: string;
  likes: number;
  likedByUser: boolean;
  replies: ComentarioNode[];
};

type UserInfo = {
  id: number;
  username: string;
  email?: string;
  avatar_url?: string | null;
};

type ComentariosSectionProps = {
  contentId: number;
  contentType: "filme" | "serie";
  alvoTitulo: string;
  modoEscuroAtivo: boolean;
};

type AuthSnapshot = {
  token: string | null;
  user: UserInfo | null;
};

const getStoredUser = (): UserInfo | null => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as UserInfo) : null;
  } catch {
    return null;
  }
};

const mapComentario = (comentario: ComentarioApi): ComentarioNode => ({
  id: comentario.id,
  userId: comentario.user.id,
  username: comentario.user.username,
  avatarUrl: resolveAvatarUrl(comentario.user.avatar_url),
  content: comentario.texto,
  createdAt: comentario.created_at,
  likes: comentario.likes,
  likedByUser: comentario.liked_by_user,
  replies: comentario.replies.map(mapComentario),
});

const ordenarPorData = (lista: ComentarioNode[]): ComentarioNode[] =>
  [...lista].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

const adicionarComentario = (
  lista: ComentarioNode[],
  novoComentario: ComentarioNode,
  comentarioPaiId: number | null
): ComentarioNode[] => {
  if (comentarioPaiId === null) {
    return ordenarPorData([...lista, novoComentario]);
  }

  return lista.map((comentario) => {
    if (comentario.id === comentarioPaiId) {
      return {
        ...comentario,
        replies: ordenarPorData([...comentario.replies, novoComentario]),
      };
    }

    if (comentario.replies.length) {
      return {
        ...comentario,
        replies: adicionarComentario(
          comentario.replies,
          novoComentario,
          comentarioPaiId
        ),
      };
    }

    return comentario;
  });
};

export default function ComentariosSection({
  contentId,
  contentType,
  alvoTitulo,
  modoEscuroAtivo,
}: ComentariosSectionProps) {
  const [comentarios, setComentarios] = useState<ComentarioNode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);
  const [novoComentario, setNovoComentario] = useState("");
  const [comentarioEmResposta, setComentarioEmResposta] = useState<number | null>(null);
  const [respostasRascunho, setRespostasRascunho] = useState<Record<number, string>>({});
  const [respostasVisiveis, setRespostasVisiveis] = useState<Record<number, boolean>>({});
  const [comentarioEmEdicao, setComentarioEmEdicao] = useState<number | null>(null);
  const [edicaoRascunho, setEdicaoRascunho] = useState<Record<number, string>>({});
  const [alerta, setAlerta] = useState<string | null>(null);

  const [authSnapshot, setAuthSnapshot] = useState<AuthSnapshot>(() => ({
    token: localStorage.getItem("token"),
    user: getStoredUser(),
  }));

  const estaAutenticado = useMemo(() => !!authSnapshot.token, [authSnapshot.token]);
  const utilizadorAtual = authSnapshot.user;

  const carregarComentarios = useCallback(async () => {
    setLoading(true);
    setErroCarregamento(null);

    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (authSnapshot.token) {
        headers.Authorization = `Bearer ${authSnapshot.token}`;
      }

      const response = await fetch(
        buildApiUrl(`/comentarios/${contentType}/${contentId}`),
        {
          headers,
        }
      );

      if (!response.ok) {
        throw new Error("Não foi possível carregar os comentários.");
      }

      const data = (await response.json()) as { comentarios: ComentarioApi[] };
      setComentarios(data.comentarios.map(mapComentario));
    } catch (err) {
      setErroCarregamento(
        err instanceof Error ? err.message : "Erro ao carregar comentários."
      );
      setComentarios([]);
    } finally {
      setLoading(false);
    }
  }, [authSnapshot.token, contentId, contentType]);

  useEffect(() => {
    carregarComentarios();
  }, [carregarComentarios]);

  useEffect(() => {
    if (!alerta) return;
    const timeout = window.setTimeout(() => setAlerta(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [alerta]);

  useEffect(() => {
    const sincronizarAuth = () =>
      setAuthSnapshot({
        token: localStorage.getItem("token"),
        user: getStoredUser(),
      });

    window.addEventListener("storage", sincronizarAuth);
    window.addEventListener("focus", sincronizarAuth);
    return () => {
      window.removeEventListener("storage", sincronizarAuth);
      window.removeEventListener("focus", sincronizarAuth);
    };
  }, []);

  const limparFormularioPrincipal = () => {
    setNovoComentario("");
  };

  const limparResposta = (comentarioId: number) => {
    setRespostasRascunho((prev) => {
      const { [comentarioId]: _, ...resto } = prev;
      return resto;
    });
    setComentarioEmResposta((prev) => (prev === comentarioId ? null : prev));
  };

  const emitirAvisoAutenticacao = () => {
    setAlerta("Inicia sessão para participares na conversa.");
  };

  const enviarComentario = async (
    texto: string,
    comentarioPaiId: number | null
  ) => {
    const snapshot: AuthSnapshot = {
      token: localStorage.getItem("token"),
      user: getStoredUser(),
    };
    setAuthSnapshot(snapshot);

    if (!snapshot.token || !snapshot.user) {
      emitirAvisoAutenticacao();
      return false;
    }

    try {
      const response = await fetch(buildApiUrl("/comentarios/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${snapshot.token}`,
        },
        body: JSON.stringify({
          tmdb_id: contentId,
          tipo: contentType,
          texto,
          comentario_pai_id: comentarioPaiId,
          alvo_titulo: alvoTitulo,
        }),
      });

      if (response.status === 401) {
        emitirAvisoAutenticacao();
        return false;
      }

      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        const mensagem =
          (detail && (detail.detail || detail.message)) ||
          "Não foi possível publicar o comentário.";
        throw new Error(mensagem);
      }

      const data = (await response.json()) as ComentarioApi;
      const comentarioNormalizado = mapComentario(data);

      setComentarios((prev) =>
        adicionarComentario(prev, comentarioNormalizado, comentarioPaiId)
      );

      if (comentarioPaiId !== null) {
        setRespostasVisiveis((prev) => ({ ...prev, [comentarioPaiId]: true }));
      }

      return true;
    } catch (err) {
      setAlerta(
        err instanceof Error
          ? err.message
          : "Não foi possível publicar o comentário."
      );
      return false;
    }
  };

  const handleSubmeterComentario = async (event: FormEvent) => {
    event.preventDefault();
    const texto = novoComentario.trim();
    if (!texto) return;

    const sucesso = await enviarComentario(texto, null);
    if (sucesso) {
      limparFormularioPrincipal();
    }
  };

  const handleAbrirResposta = (comentarioId: number) => {
    if (!estaAutenticado) {
      emitirAvisoAutenticacao();
      return;
    }
    setComentarioEmResposta((prev) => (prev === comentarioId ? null : comentarioId));
    setRespostasVisiveis((prev) => ({ ...prev, [comentarioId]: true }));
  };

  const handleAlterarResposta = (comentarioId: number, texto: string) => {
    setRespostasRascunho((prev) => ({ ...prev, [comentarioId]: texto }));
  };

  const handleSubmeterResposta = async (comentarioId: number) => {
    const texto = (respostasRascunho[comentarioId] || "").trim();
    if (!texto) return;

    const sucesso = await enviarComentario(texto, comentarioId);
    if (sucesso) {
      limparResposta(comentarioId);
    }
  };

  const handleToggleGostei = async (comentarioId: number) => {
    const snapshot: AuthSnapshot = {
      token: localStorage.getItem("token"),
      user: getStoredUser(),
    };
    setAuthSnapshot(snapshot);

    if (!snapshot.token) {
      emitirAvisoAutenticacao();
      return;
    }

    try {
      const response = await fetch(
        buildApiUrl(`/comentarios/${comentarioId}/like`),
        {
          method: "POST",
          headers: { Authorization: `Bearer ${snapshot.token}` },
        }
      );

      if (response.status === 401) {
        emitirAvisoAutenticacao();
        return;
      }

      if (!response.ok) {
        throw new Error("Não foi possível atualizar o gosto.");
      }

      const data = (await response.json()) as {
        liked: boolean;
        likes: number;
      };

      const actualizarLista = (lista: ComentarioNode[]): ComentarioNode[] =>
        lista.map((comentario) => {
          if (comentario.id === comentarioId) {
            return {
              ...comentario,
              likes: data.likes,
              likedByUser: data.liked,
            };
          }
          if (comentario.replies.length) {
            return {
              ...comentario,
              replies: actualizarLista(comentario.replies),
            };
          }
          return comentario;
        });

      setComentarios((prev) => actualizarLista(prev));
    } catch (err) {
      setAlerta(
        err instanceof Error
          ? err.message
          : "Não foi possível atualizar o gosto."
      );
    }
  };

  const handleToggleRespostas = (comentarioId: number) => {
    setRespostasVisiveis((prev) => ({
      ...prev,
      [comentarioId]: !prev[comentarioId],
    }));
  };

  const handleAbrirEdicao = (comentario: ComentarioNode) => {
    setComentarioEmEdicao(comentario.id);
    setEdicaoRascunho((prev) => ({ ...prev, [comentario.id]: comentario.content }));
  };

  const handleCancelarEdicao = (comentarioId: number) => {
    setComentarioEmEdicao(null);
    setEdicaoRascunho((prev) => {
      const { [comentarioId]: _, ...resto } = prev;
      return resto;
    });
  };

  const atualizarComentarioNaLista = (
    lista: ComentarioNode[],
    comentarioId: number,
    novoTexto: string
  ): ComentarioNode[] =>
    lista.map((comentario) => {
      if (comentario.id === comentarioId) {
        return { ...comentario, content: novoTexto };
      }
      if (comentario.replies.length) {
        return {
          ...comentario,
          replies: atualizarComentarioNaLista(comentario.replies, comentarioId, novoTexto),
        };
      }
      return comentario;
    });

  const handleGuardarEdicao = async (comentarioId: number) => {
    const texto = (edicaoRascunho[comentarioId] || "").trim();
    if (!texto) {
      setAlerta("O comentário não pode estar vazio.");
      return;
    }

    const snapshot: AuthSnapshot = {
      token: localStorage.getItem("token"),
      user: getStoredUser(),
    };
    setAuthSnapshot(snapshot);

    if (!snapshot.token) {
      emitirAvisoAutenticacao();
      return;
    }

    try {
      const response = await fetch(
        buildApiUrl(`/comentarios/${comentarioId}`),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${snapshot.token}`,
          },
          body: JSON.stringify({ texto }),
        }
      );

      if (response.status === 401) {
        emitirAvisoAutenticacao();
        return;
      }

      if (response.status === 403) {
        setAlerta("Não tens permissão para editar este comentário.");
        return;
      }

      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        const mensagem =
          (detail && (detail.detail || detail.message)) ||
          "Não foi possível editar o comentário.";
        throw new Error(mensagem);
      }

      setComentarios((prev) => atualizarComentarioNaLista(prev, comentarioId, texto));
      handleCancelarEdicao(comentarioId);
    } catch (err) {
      setAlerta(
        err instanceof Error
          ? err.message
          : "Não foi possível editar o comentário."
      );
    }
  };

  const renderizarComentarios = (
    lista: ComentarioNode[],
    nivel = 0
  ): ReactNode => {
    if (!lista.length) return null;
    return (
      <ul className={`comentarios-lista nivel-${nivel}`}>
        {lista.map((comentario) => {
          const temRespostas = comentario.replies.length > 0;
          const respostasAbertas = !!respostasVisiveis[comentario.id];

          return (
            <li className="comentario-item" key={comentario.id}>
              <div className="comentario-autor">
                <span className="comentario-avatar">
                  {comentario.avatarUrl ? (
                    <img 
                      src={comentario.avatarUrl} 
                      alt={comentario.username}
                      onError={(e) => {
                        // Se falhar, esconder imagem e mostrar fallback
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : null}
                  {/* Fallback sempre presente, escondido quando há imagem */}
                  <span className="avatar-fallback" style={{ display: comentario.avatarUrl ? 'none' : 'flex' }}>
                    {comentario.username.charAt(0).toUpperCase()}
                  </span>
                </span>
                <div>
                  <p className="comentario-nome">{comentario.username}</p>
                  <time className="comentario-data">
                    {new Date(comentario.createdAt).toLocaleString("pt-PT")}
                  </time>
                </div>
              </div>

              {comentarioEmEdicao === comentario.id ? (
                <div className="comentario-edicao-form">
                  <textarea
                    rows={3}
                    value={edicaoRascunho[comentario.id] || ""}
                    onChange={(event) =>
                      setEdicaoRascunho((prev) => ({
                        ...prev,
                        [comentario.id]: event.target.value,
                      }))
                    }
                  />
                  <div className="comentario-edicao-acoes">
                    <button
                      type="button"
                      className="comentario-edicao-cancelar"
                      onClick={() => handleCancelarEdicao(comentario.id)}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="comentario-edicao-guardar"
                      onClick={() => handleGuardarEdicao(comentario.id)}
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              ) : (
                <p className="comentario-texto">{comentario.content}</p>
              )}

              <div className="comentario-controles">
                <button
                  type="button"
                  className={`comentario-like ${
                    comentario.likedByUser ? "ativo" : ""
                  }`}
                  aria-pressed={comentario.likedByUser}
                  onClick={() => handleToggleGostei(comentario.id)}
                >
                  <span className="comentario-like-icon">
                    {comentario.likedByUser ? "♥" : "♡"}
                  </span>
                  <span>{comentario.likes}</span>
                </button>
                <button
                  type="button"
                  className="comentario-responder"
                  onClick={() => handleAbrirResposta(comentario.id)}
                >
                  Responder
                </button>
                {utilizadorAtual && utilizadorAtual.id === comentario.userId && comentarioEmEdicao !== comentario.id && (
                  <button
                    type="button"
                    className="comentario-editar"
                    onClick={() => handleAbrirEdicao(comentario)}
                  >
                    Editar
                  </button>
                )}
              </div>

              {comentarioEmResposta === comentario.id && (
                <div className="comentario-resposta-form">
                  <textarea
                    rows={3}
                    placeholder="Escreve a tua resposta..."
                    value={respostasRascunho[comentario.id] || ""}
                    onChange={(event) =>
                      handleAlterarResposta(comentario.id, event.target.value)
                    }
                  />
                  <div className="comentario-resposta-acoes">
                    <button
                      type="button"
                      className="comentario-resposta-cancelar"
                      onClick={() => limparResposta(comentario.id)}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="comentario-resposta-enviar"
                      onClick={() => handleSubmeterResposta(comentario.id)}
                    >
                      Enviar
                    </button>
                  </div>
                </div>
              )}

              {temRespostas && (
                <>
                  <button
                    type="button"
                    className="comentario-replies-toggle"
                    onClick={() => handleToggleRespostas(comentario.id)}
                  >
                    {respostasAbertas
                      ? "Esconder respostas"
                      : `Ver ${comentario.replies.length} ${
                          comentario.replies.length === 1
                            ? "resposta"
                            : "respostas"
                        }`}
                  </button>
                  {respostasAbertas &&
                    renderizarComentarios(comentario.replies, nivel + 1)}
                </>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <section
      className={`comentarios-section ${modoEscuroAtivo ? "dark" : "light"}`}
    >
      <div className="comentarios-header">
        <h2>Comentários</h2>
      </div>

      {alerta && <div className="comentarios-alerta">{alerta}</div>}

      {estaAutenticado && utilizadorAtual ? (
        <form className="comentarios-form" onSubmit={handleSubmeterComentario}>
          <textarea
            rows={4}
            placeholder="Partilha a tua opinião sobre este título..."
            value={novoComentario}
            onChange={(event) => setNovoComentario(event.target.value)}
          />
          <div className="comentarios-form-acoes">
            <button
              type="submit"
              className="comentarios-form-publicar"
              disabled={!novoComentario.trim()}
            >
              Publicar
            </button>
            {novoComentario.trim() && (
              <button
                type="button"
                className="comentarios-form-limpar"
                onClick={limparFormularioPrincipal}
              >
                Limpar
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="comentarios-login-hint">
          <p>Inicia sessão para partilhares um comentário.</p>
        </div>
      )}

      {loading ? (
        <p className="comentarios-vazio">A carregar comentários...</p>
      ) : erroCarregamento ? (
        <p className="comentarios-vazio">{erroCarregamento}</p>
      ) : comentarios.length ? (
        renderizarComentarios(comentarios)
      ) : (
        <p className="comentarios-vazio">
          Ainda não há comentários. Sê o primeiro a partilhar algo!
        </p>
      )}
    </section>
  );
}
