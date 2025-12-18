import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./NavBar.css";
import "../Home/Home.css";
import { applyTheme, coerceTheme, type ThemeMode } from "../../utils/theme";
import { resolveAvatarUrl } from "../../utils/avatar";
import { buildApiUrl } from "@/utils/api";
import RandomMovieGame from "./RandomMovieGame";

type NavBarProps = {
  toggleDarkMode: boolean;
};

type UserInfo = {
  id: number;
  username: string;
  email: string;
  role?: string;
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

export default function NavBar({ toggleDarkMode }: NavBarProps) {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!localStorage.getItem("token"));
  const [user, setUser] = useState<UserInfo | null>(() => getStoredUser());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isGameOpen, setIsGameOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleStorage = () => {
      const token = localStorage.getItem("token");
      setIsAuthenticated(!!token);
      const stored = getStoredUser();
      setUser(stored);
      if (stored?.theme_mode) {
        applyTheme(stored.theme_mode);
      } else if (!token) {
        applyTheme("dark");
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setUser(null);
      setIsMenuOpen(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setIsAuthenticated(false);
      setUser(null);
      return;
    }

    let ignore = false;

    const fetchUser = async () => {
      try {
        const response = await fetch(buildApiUrl("/me"), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          if (!ignore) {
            setIsAuthenticated(false);
            setUser(null);
          }
          return;
        }

        if (!response.ok) {
          throw new Error("Falha ao obter dados do utilizador.");
        }

        const data: UserInfo = await response.json();
        if (!ignore) {
          const normalizedTheme = coerceTheme(data.theme_mode);
          const resolvedAvatar = resolveAvatarUrl(data.avatar_url);
          const normalizedUser: UserInfo = {
            ...data,
            theme_mode: normalizedTheme,
            avatar_url: resolvedAvatar,
          };
          setUser(normalizedUser);
          localStorage.setItem("user", JSON.stringify(normalizedUser));
          applyTheme(normalizedTheme);
        }
      } catch (err) {
        console.warn("Não foi possível carregar os dados do utilizador:", err);
        if (!ignore) {
          setUser(getStoredUser());
        }
      }
    };

    fetchUser();
    return () => {
      ignore = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  const handleAuthClick = () => {
    if (isAuthenticated) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      applyTheme("dark");
      setIsAuthenticated(false);
      setUser(null);
      navigate("/home");
    } else {
      navigate("/Login");
    }
  };

  const userInitials = useMemo(() => {
    if (!user?.username) return "U";
    return user.username.trim().charAt(0).toUpperCase();
  }, [user]);

  return (
    <>
      <nav className="navbar">
        <div className="button-group">
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="btn-home"
          >
            <img
              src={
                toggleDarkMode
                  ? "/assets/images/spectologo.png"
                  : "/assets/images/spectologodark1.png"
              }
              alt="Specto logo"
              className="logo-specto"
            />
          </button>

          <button
            type="button"
            onClick={() => navigate("/filmes")}
            className="btns-secondary"
          >
            Filmes
          </button>
          <button
            type="button"
            onClick={() => navigate("/series")}
            className="btns-secondary"
          >
            Séries
          </button>
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => navigate("/forum")}
              className="btns-secondary"
            >
              Fórum
            </button>
          )}

          {isAuthenticated && (
            <button
              type="button"
              className="btn-random-game"
              onClick={() => setIsGameOpen(true)}
            >
              Random Movie Game
            </button>
          )}
        </div>

        {!isAuthenticated && (
          <div className="navbar-actions">
            <button
              type="button"
              onClick={handleAuthClick}
              className="btn btn-auth"
            >
              <img
                src="/assets/images/user.png"
                className="login-icon"
              />
              Login
            </button>
          </div>
        )}

        {isAuthenticated && (
          <div className="navbar-profile" ref={dropdownRef}>
            <button
              type="button"
              className="profile-trigger"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-haspopup="true"
              aria-expanded={isMenuOpen}
              aria-label="Abrir menu do utilizador"
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="Avatar do utilizador"
                  className="user-avatar-img"
                />
              ) : user?.username ? (
                <span className="user-initials">{userInitials}</span>
              ) : (
                <img
                  src="/assets/images/perfil.png"
                  alt="Perfil"
                  className="user-logo"
                />
              )}
            </button>
            <div className={`dropdown ${isMenuOpen ? "open-menu" : ""}`}>
              <div className="sub-dropdown">
                <div className="user-info">
                  <div className="user-avatar">
                    {user?.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt="Avatar do utilizador"
                        className="user-avatar-img"
                      />
                    ) : user?.username ? (
                      <span>{userInitials}</span>
                    ) : (
                      <img src="/assets/images/perfil.png" alt="Perfil" />
                    )}
                  </div>
                  <div className="user-meta">
                    <h3 title={user?.username || "Utilizador"}>{user?.username || "Utilizador"}</h3>
                    {user?.email && <p title={user.email}>{user.email}</p>}
                  </div>
                </div>

                <hr />

                <button
                  type="button"
                  className="sub-dropdown-link"
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate("/perfil");
                  }}
                >
                  <img src="/assets/images/images-menu/profile.png" alt="" />
                  <p>Ver Perfil</p>
                </button>

                <button
                  type="button"
                  className="sub-dropdown-link"
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate("/perfil/editar");
                  }}
                >
                  <img src="/assets/images/images-menu/setting.png" alt="" />
                  <p>Editar Perfil</p>
                </button>

                {user?.role === "admin" && (
                  <button
                    type="button"
                    className="sub-dropdown-link"
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate("/admin");
                    }}
                  >
                    <img src="/assets/images/images-menu/setting.png" alt="" />
                    <p>Painel Admin</p>
                  </button>
                )}

                <button
                  type="button"
                  className="sub-dropdown-link logout"
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleAuthClick();
                  }}
                >
                  <img src="/assets/images/images-menu/logout.png" alt="" />
                  <p>Terminar sessão</p>
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
      <RandomMovieGame isOpen={isGameOpen} onClose={() => setIsGameOpen(false)} />
    </>
  );
}
