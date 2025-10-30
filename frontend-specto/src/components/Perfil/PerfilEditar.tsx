import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import "./PerfilEditar.css";
import NavBar from "../NavBar/NavBar";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";
import {
  applyTheme,
  coerceTheme,
  readTheme,
  subscribeTheme,
  type ThemeMode,
} from "../../utils/theme";
import { resolveAvatarUrl } from "../../utils/avatar";
import { buildApiUrl } from "../../utils/api";

type UserInfo = {
  id: number;
  username: string;
  email: string;
  theme_mode?: ThemeMode;
  avatar_url?: string | null;
};

const getStoredUser = (): UserInfo | null => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserInfo & { theme_mode?: unknown };
    if (parsed && "theme_mode" in parsed) {
      parsed.theme_mode = coerceTheme(parsed.theme_mode);
    }
    if ("avatar_url" in parsed) {
      parsed.avatar_url = resolveAvatarUrl(parsed.avatar_url);
    }
    return parsed;
  } catch {
    return null;
  }
};

const getInitialTheme = (): ThemeMode => {
  const stored = getStoredUser();
  if (stored?.theme_mode) {
    return applyTheme(stored.theme_mode);
  }
  return readTheme();
};

export default function PerfilEditar() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getInitialTheme());
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>(() => themeMode);

  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!localStorage.getItem("token"));
  const [user, setUser] = useState<UserInfo | null>(() => getStoredUser());
  const [loading, setLoading] = useState<boolean>(isAuthenticated);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState(user?.email ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(() =>
    user?.avatar_url ? resolveAvatarUrl(user.avatar_url) : null
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const updateAvatarPreview = (next: string | null) => {
    setAvatarPreview((prev) => {
      if (prev && prev.startsWith("blob:") && prev !== next) {
        URL.revokeObjectURL(prev);
      }
      return next;
    });
  };

  const applyUserResponse = (payload: UserInfo, fallbackTheme: ThemeMode) => {
    const normalizedTheme = coerceTheme(payload.theme_mode ?? fallbackTheme);
    const normalizedAvatar = resolveAvatarUrl(payload.avatar_url);
    const normalizedUser: UserInfo = {
      ...payload,
      theme_mode: normalizedTheme,
      avatar_url: normalizedAvatar,
    };
    setUser(normalizedUser);
    localStorage.setItem("user", JSON.stringify(normalizedUser));
    setEmail(normalizedUser.email);
    updateAvatarPreview(normalizedUser.avatar_url ?? null);
    setAvatarFile(null);
    const appliedTheme = applyTheme(normalizedTheme);
    setThemeMode(appliedTheme);
    setSelectedTheme(appliedTheme);
  };

  useEffect(() => {
    const unsubscribe = subscribeTheme(setThemeMode);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleStorage = () => {
      const token = localStorage.getItem("token");
      setIsAuthenticated(!!token);
      const stored = getStoredUser();
      setUser(stored);
      setEmail(stored?.email ?? "");
      updateAvatarPreview(stored?.avatar_url ?? null);
      setAvatarFile(null);
      setRemoveAvatar(false);
      setAvatarChanged(false);
      if (stored?.theme_mode) {
        const applied = applyTheme(stored.theme_mode);
        setThemeMode(applied);
        setSelectedTheme(applied);
      } else if (!token) {
        const applied = applyTheme("dark");
        setThemeMode(applied);
        setSelectedTheme(applied);
      } else {
        const applied = readTheme();
        setThemeMode(applied);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      setUser(null);
      const applied = applyTheme("dark");
      setThemeMode(applied);
      setSelectedTheme(applied);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setIsAuthenticated(false);
      setLoading(false);
      setUser(null);
      const applied = applyTheme("dark");
      setThemeMode(applied);
      setSelectedTheme(applied);
      return;
    }

    setLoading(true);
    setError(null);
    const controller = new AbortController();

    const fetchUser = async () => {
      try {
        const response = await fetch(buildApiUrl("/me"), {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (response.status === 401) {
          setIsAuthenticated(false);
          setUser(null);
          setLoading(false);
          const applied = applyTheme("dark");
          setThemeMode(applied);
          setSelectedTheme(applied);
          return;
        }

        if (!response.ok) {
          throw new Error("Não foi possível carregar os dados do perfil.");
        }

        const data: UserInfo = await response.json();
        const normalizedTheme = coerceTheme(data.theme_mode);
        const normalizedAvatar = resolveAvatarUrl(data.avatar_url);
        const normalizedUser: UserInfo = {
          ...data,
          theme_mode: normalizedTheme,
          avatar_url: normalizedAvatar,
        };
        setUser(normalizedUser);
        setEmail(normalizedUser.email);
        updateAvatarPreview(normalizedUser.avatar_url ?? null);
        setAvatarFile(null);
        setRemoveAvatar(false);
        setAvatarChanged(false);
        localStorage.setItem("user", JSON.stringify(normalizedUser));
        const appliedTheme = applyTheme(normalizedTheme);
        setThemeMode(appliedTheme);
        setSelectedTheme(appliedTheme);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Falha ao carregar perfil:", err);
        setError("Não foi possível carregar os dados do perfil.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchUser();
    return () => controller.abort();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email);
    updateAvatarPreview(user.avatar_url ?? null);
    setAvatarFile(null);
    setNewPassword("");
    setConfirmPassword("");
    setRemoveAvatar(false);
    setAvatarChanged(false);
    if (user.theme_mode !== undefined) {
      const appliedTheme = applyTheme(user.theme_mode);
      setThemeMode(appliedTheme);
      setSelectedTheme(appliedTheme);
    }
  }, [user]);

  useEffect(() => {
    if (!statusMessage) return;
    const timeout = window.setTimeout(() => setStatusMessage(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [statusMessage]);

  useEffect(
    () => () => {
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    },
    [avatarPreview]
  );

  const avatarInitials = useMemo(() => {
    if (!user?.username) return "U";
    return user.username.trim().charAt(0).toUpperCase();
  }, [user]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setStatusMessage({
        type: "error",
        text: "Escolhe uma imagem com menos de 3MB.",
      });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setAvatarFile(file);
    updateAvatarPreview(previewUrl);
    setAvatarChanged(true);
    setRemoveAvatar(false);
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    updateAvatarPreview(null);
    setRemoveAvatar(true);
    setAvatarChanged(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setStatusMessage({
        type: "error",
        text: "O email não pode ficar em branco.",
      });
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setStatusMessage({
        type: "error",
        text: "A nova palavra-passe deve ter pelo menos 6 caracteres.",
      });
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setStatusMessage({
        type: "error",
        text: "As palavras-passe não coincidem.",
      });
      return;
    }

    const payload: Record<string, unknown> = {};
    if (trimmedEmail !== user.email) {
      payload.email = trimmedEmail;
    }
    if (newPassword) {
      payload.password = newPassword;
    }
    if (removeAvatar && user.avatar_url) {
      payload.remove_avatar = true;
    }
    const currentTheme = user.theme_mode ?? "dark";
    if (selectedTheme !== currentTheme) {
      payload.theme_mode = selectedTheme;
    }

    const shouldUploadAvatar = avatarChanged && !!avatarFile;
    const shouldSubmitPatch = Object.keys(payload).length > 0;

    if (!shouldUploadAvatar && !shouldSubmitPatch) {
      setStatusMessage({
        type: "error",
        text: "Não há alterações para guardar.",
      });
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      let latestUser: UserInfo | null = null;

      if (shouldSubmitPatch) {
        const response = await fetch(buildApiUrl("/auth/me"), {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => null);

        if (response.status === 401) {
          setIsAuthenticated(false);
          setStatusMessage({
            type: "error",
            text: "A tua sessão expirou. Inicia sessão novamente.",
          });
          return;
        }

        if (!response.ok) {
          const detail =
            (data && (data.detail || data.message)) ||
            "Não foi possível atualizar o perfil.";
          throw new Error(detail);
        }

        if (data && typeof data === "object") {
          latestUser = data as UserInfo;
        }
      }

      if (shouldUploadAvatar && avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);

        const avatarResponse = await fetch(buildApiUrl("/auth/me/avatar"), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const avatarData = await avatarResponse.json().catch(() => null);

        if (avatarResponse.status === 401) {
          setIsAuthenticated(false);
          setStatusMessage({
            type: "error",
            text: "A tua sessão expirou. Inicia sessão novamente.",
          });
          return;
        }

        if (!avatarResponse.ok) {
          const detail =
            (avatarData && (avatarData.detail || avatarData.message)) ||
            "Não foi possível carregar a imagem.";
          throw new Error(detail);
        }

        if (avatarData && typeof avatarData === "object") {
          latestUser = avatarData as UserInfo;
        }
      }

      if (latestUser) {
        applyUserResponse(latestUser, selectedTheme);
      } else if (shouldSubmitPatch) {
        setEmail(trimmedEmail);
      }

      setStatusMessage({
        type: "success",
        text: "Perfil atualizado com sucesso!",
      });
      setNewPassword("");
      setConfirmPassword("");
      setRemoveAvatar(false);
      setAvatarChanged(false);
      if (!shouldUploadAvatar) {
        setAvatarFile(null);
      }
    } catch (err) {
      console.error("Erro ao atualizar perfil:", err);
      setStatusMessage({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Erro inesperado ao atualizar o perfil.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={`home-container ${themeMode === "dark" ? "dark" : "light"}`}>
        <NavBar toggleDarkMode={themeMode === "dark"} />
        <div className="perfil-editar-wrapper">
          <div className="perfil-editar-empty">
            <p>Precisas de iniciar sessão para gerir o teu perfil.</p>
            <button
              type="button"
              className="perfil-primary-btn"
              onClick={() => navigate("/Login")}
            >
              Ir para login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`home-container ${themeMode === "dark" ? "dark" : "light"}`}>
      <NavBar toggleDarkMode={themeMode === "dark"} />
      <div className="perfil-editar-wrapper">
        {statusMessage && (
          <div className={`perfil-editar-alert ${statusMessage.type}`}>
            {statusMessage.text}
          </div>
        )}
        {error && <div className="perfil-editar-alert error">{error}</div>}

        {loading ? (
          <div className="perfil-editar-loader">
            <LoadingSpinner color="#3b82f6" size="large" />
          </div>
        ) : (
          <div className="perfil-editar-grid">
            <section className="perfil-editar-card">
              <h2>Fotografia</h2>
              <p className="perfil-editar-card-desc">
                Escolhe uma imagem quadrada para um melhor enquadramento.
              </p>
              <div className="perfil-editar-avatar">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Pré-visualização do avatar" />
                ) : (
                  <span>{avatarInitials}</span>
                )}
              </div>
              <div className="perfil-editar-avatar-actions">
                <label className="perfil-upload-btn">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  Escolher imagem
                </label>
                {(avatarPreview || user?.avatar_url) && (
                  <button
                    type="button"
                    className="perfil-remove-btn"
                    onClick={handleRemoveAvatar}
                  >
                    Remover foto
                  </button>
                )}
              </div>
            </section>

            <section className="perfil-editar-card">
              <h2>Informações da conta</h2>
              <form className="perfil-editar-form" onSubmit={handleSubmit}>
                <div className="perfil-field">
                  <label htmlFor="username">Nome de utilizador</label>
                  <input
                    id="username"
                    type="text"
                    value={user?.username ?? ""}
                    disabled
                  />
                </div>
                <div className="perfil-field">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <div className="perfil-field">
                  <label htmlFor="password">Nova palavra-passe</label>
                  <input
                    id="password"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Deixa em branco para manter a actual"
                  />
                </div>
                <div className="perfil-field">
                  <label htmlFor="confirmPassword">Confirmar palavra-passe</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repete a nova palavra-passe"
                  />
                </div>
                <div className="perfil-theme-field">
                  <span className="perfil-theme-field-label">Preferência de tema</span>
                  <div className="perfil-theme-toggle">
                    <button
                      type="button"
                      className={`perfil-theme-option ${
                        selectedTheme === "dark" ? "ativo" : ""
                      }`}
                      onClick={() => setSelectedTheme("dark")}
                    >
                      Escuro
                    </button>
                    <button
                      type="button"
                      className={`perfil-theme-option ${
                        selectedTheme === "light" ? "ativo" : ""
                      }`}
                      onClick={() => setSelectedTheme("light")}
                    >
                      Claro
                    </button>
                  </div>
                  <p className="perfil-theme-hint">
                    A mudança aplica-se a todas as páginas após guardares.
                  </p>
                </div>
                <div className="perfil-editar-actions">
                  <button
                    type="button"
                    className="perfil-secondary-btn"
                    onClick={() => navigate("/perfil")}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="perfil-primary-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "A guardar..." : "Guardar alterações"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
