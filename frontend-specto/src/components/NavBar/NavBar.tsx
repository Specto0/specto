import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!localStorage.getItem("token"));
  const [user, setUser] = useState<UserInfo | null>(() => getStoredUser());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isGameOpen, setIsGameOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleNavigate = (path: string) => {
    navigate(path);
    closeMobileMenu();
  };

  const handleLogout = () => {
    setIsMenuOpen(false);
    closeMobileMenu();
    handleAuthClick();
  };

  const navLinks = [
    { label: "Filmes", path: "/filmes" },
    { label: "Séries", path: "/series" },
    { label: "Fórum", path: "/forum", requiresAuth: true },
  ];

  const userInitials = useMemo(() => {
    if (!user?.username) return "U";
    return user.username.trim().charAt(0).toUpperCase();
  }, [user]);

  return (
    <>
      <nav className="navbar">
        <div className="navbar-left">
          <button
            type="button"
            onClick={() => handleNavigate("/home")}
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
            className={`navbar-toggle ${isMobileMenuOpen ? "open" : ""}`}
            onClick={toggleMobileMenu}
            aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav"
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        <div className="button-group desktop-nav">
          {navLinks.map((link) => {
            if (link.requiresAuth && !isAuthenticated) return null;
            return (
              <button
                key={link.path}
                type="button"
                onClick={() => navigate(link.path)}
                className="btns-secondary"
              >
                {link.label}
              </button>
            );
          })}

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
          <div className="navbar-actions desktop-only">
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
          <div className="navbar-profile desktop-only" ref={dropdownRef}>
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
            <div className={`dropdown ${isMenuOpen ? "open-menu" : ""} ${!toggleDarkMode ? "light" : ""}`}>
              <div className={`sub-dropdown ${!toggleDarkMode ? "light" : ""}`}>
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/>
                      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/>
                      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>
                    </svg>
                    <p>Painel Admin</p>
                  </button>
                )}

                <button
                  type="button"
                  className="sub-dropdown-link logout"
                  onClick={handleLogout}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16,17 21,12 16,7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  <p>Terminar sessão</p>
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      <div
        className={`mobile-menu-overlay ${isMobileMenuOpen ? "open" : ""}`}
        onClick={closeMobileMenu}
      />

      <aside
        id="mobile-nav"
        className={`mobile-menu ${toggleDarkMode ? "" : "light"} ${isMobileMenuOpen ? "open" : ""}`}
        aria-hidden={!isMobileMenuOpen}
      >
        <div className="mobile-menu-panel">
          {isAuthenticated ? (
            <div className="mobile-user">
              <div className="mobile-user-avatar">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" />
                ) : user?.username ? (
                  <span>{userInitials}</span>
                ) : (
                  <img src="/assets/images/perfil.png" alt="Perfil" />
                )}
              </div>
              <div className="mobile-user-meta">
                <strong>{user?.username || "Utilizador"}</strong>
                {user?.email && <span>{user.email}</span>}
              </div>
            </div>
          ) : (
            <div className="mobile-auth-actions">
              <button type="button" onClick={() => handleNavigate("/login")}>Entrar</button>
              <button type="button" onClick={() => handleNavigate("/register")} className="secondary">Criar conta</button>
            </div>
          )}

          <div className="mobile-menu-links">
            {navLinks.map((link) => {
              if (link.requiresAuth && !isAuthenticated) return null;
              return (
                <button
                  key={`mobile-${link.path}`}
                  type="button"
                  onClick={() => handleNavigate(link.path)}
                  className="mobile-menu-link"
                >
                  {link.label}
                </button>
              );
            })}
          </div>

          {isAuthenticated && (
            <div className="mobile-menu-actions">
              <button type="button" onClick={() => handleNavigate("/perfil")}>
                Ver perfil
              </button>
              <button type="button" onClick={() => handleNavigate("/perfil/editar")}>
                Editar perfil
              </button>
              {user?.role === "admin" && (
                <button type="button" onClick={() => handleNavigate("/admin")}>
                  Painel admin
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  closeMobileMenu();
                  setIsGameOpen(true);
                }}
              >
                Random Movie Game
              </button>
              <button type="button" className="logout" onClick={handleLogout}>
                Terminar sessão
              </button>
            </div>
          )}
        </div>
      </aside>
      <RandomMovieGame isOpen={isGameOpen} onClose={() => setIsGameOpen(false)} themeMode={toggleDarkMode ? "dark" : "light"} />
    </>
  );
}
