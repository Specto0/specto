import React, { useEffect, useState } from "react";
import "./NavBar.css";
import { useNavigate } from "react-router-dom";
import "../Home/Home.css";

type NavBarProps = {
  query: string;
  setQuery: (q: string) => void;
  searching: boolean;
  handleSearch: (e: React.FormEvent) => void;
  resetSearch: () => void;
  toggleDarkMode: boolean;
  toggleDarkTheme: () => void;
};

export default function NavBar({
  query,
  setQuery,
  handleSearch,
  toggleDarkMode,
  toggleDarkTheme,
}: NavBarProps) {
  const navigate = useNavigate(); // Hook para navegar entre páginas
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!localStorage.getItem("token"));

  useEffect(() => {
    const handleStorage = () => setIsAuthenticated(!!localStorage.getItem("token"));
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const handleAuthClick = () => {
    if (isAuthenticated) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setIsAuthenticated(false);
      navigate("/home");
    } else {
      navigate("/Login");
    }
  };

  return (
  <nav className="navbar">
    <form onSubmit={handleSearch} className="navbar-form">
      <div className="button-group">
        <button
          type="button"
          onClick={() => navigate("/home")}
          className="btn-home"
          >
          <img
          src={
            toggleDarkMode
              ? "/assets/images/spectologo.png" // imagem para dark mode
              : "/assets/images/spectologodark1.png"      // imagem normal
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
      </div>

      <div className="search-box">
        <span className="search-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M16.65 16.65A7.5 7.5 0 1116.65 2.5a7.5 7.5 0 010 14.15z"
            />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="navbar-input"
        />
      </div>
    </form>

    <div className="navbar-actions">
      <div className="toggle-container">
        <label className="switch">
          <input
            type="checkbox"
            checked={toggleDarkMode}
            onChange={toggleDarkTheme}
          />
          <span className="slider round"></span>
        </label>
      </div>
      {isAuthenticated && (
        <button
          type="button"
          onClick={() => navigate("/perfil")}
          className="btn btn-secondary"
        >
          Perfil
        </button>
      )}
      <button
        type="button"
        onClick={handleAuthClick}
        className="btn btn-auth"
      >
        {isAuthenticated ? "Logout" : "Login"}
      </button>
    </div>
  </nav>
);
}
