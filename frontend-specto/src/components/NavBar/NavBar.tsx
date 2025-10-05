import React from "react";
import "./NavBar.css";

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
  searching,
  handleSearch,
  resetSearch,
  toggleDarkMode,
  toggleDarkTheme,
}: NavBarProps) {
  return (
    <nav className="navbar">
      {/* Formulário de pesquisa */}
      <form onSubmit={handleSearch} className="navbar-form">
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
            placeholder="Pesquisar filmes ou séries..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="navbar-input"
          />
        </div>

        <div className="button-group">
          <button type="submit" className="btn btn-primary">
            Pesquisar
          </button>
          {searching && (
            <button
              type="button"
              onClick={resetSearch}
              className="btn btn-danger"
            >
              Voltar
            </button>
          )}
        </div>
      </form>

      {/* Toggle dark mode */}
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
    </nav>
  );
}
