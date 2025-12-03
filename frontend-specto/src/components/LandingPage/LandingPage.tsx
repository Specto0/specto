import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./LandingPage.css";

const LandingPage: React.FC = () => {

 const navigate = useNavigate();

  return (
    <div className="landing-page">
      <header className="landing-header">
        <nav className="landing-nav">
          <div className="logo">
            <img src="/assets/images/spectologo.png" alt="Specto Logo" />
          </div>
          <div className="nav-links">
            <button 
            onClick={() => {
              navigate("/*");
            }}
            className="forum-btn"> Forums </button>
            <button 
            onClick={() => {
                    navigate("/login");
                  }} 
            className="login-btn"> Entrar </button>
          </div>
        </nav>
      </header>

      <main className="landing-main">
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">
              Bem-vindo ao <span className="highlight">Specto</span>
            </h1>
            <p className="hero-subtitle">
              A tua plataforma definitiva para descobrir, explorar e acompanhar filmes e séries.
              Junta-te a uma comunidade apaixonada por cinema e entretenimento.
            </p>
            <div className="hero-actions">
              <Link to="/register" className="cta-button primary">
                Registar Agora
              </Link>
              <Link to="/login" className="cta-button secondary">
                Já tenho conta
              </Link>
            </div>
          </div>
          <div className="hero-visual">
            <div className="floating-cards">
              <div className="card card-1">
                <img src="/assets/images/spectologodark1.png" alt="Specto Dark Logo" />
              </div>
              <div className="card card-2">
                <div className="movie-icon">🎬</div>
              </div>
              <div className="card card-3">
                <div className="series-icon">📺</div>
              </div>
            </div>
          </div>
        </section>

        <section className="features-section">
          <div className="container">
            <h1 className="section-title">Por que escolher o Specto?</h1>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">🔍</div>
                <h3>Descobre Conteúdo</h3>
                <p>Explora milhares de filmes e séries com informações detalhadas e avaliações.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">⭐</div>
                <h3>Avaliações e Reviews</h3>
                <p>Partilha as tuas opiniões e lê reviews da comunidade.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📱</div>
                <h3>Interface Moderna</h3>
                <p>Design responsivo e intuitivo para uma experiência perfeita em qualquer dispositivo.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">👥</div>
                <h3>Comunidade Ativa</h3>
                <p>Conecta-te com outros cinéfilos e discute os teus filmes favoritos.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="container">
          <p>&copy; 2025 Specto. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
