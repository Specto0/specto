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
      <form onSubmit={handleSearch} className="navbar-form">
        <input
          type="text"
          placeholder="Pesquisar filmes ou séries..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="navbar-input"
        />

        <div className="button-group">
          <button type="submit" className="btn btn-primary">
            Pesquisar
          </button>
          {searching && (
            <button type="button" onClick={resetSearch} className="btn btn-danger">
              Voltar
            </button>
          )}
        </div>
      </form>

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
