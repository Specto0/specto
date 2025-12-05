import { useEffect, useState } from "react";
import "./Footer.css";
import { readTheme, subscribeTheme, type ThemeMode } from "../../utils/theme";

export default function Footer() {
    const [themeMode, setThemeMode] = useState<ThemeMode>(() => readTheme());

    useEffect(() => {
        const unsubscribe = subscribeTheme(setThemeMode);
        return unsubscribe;
    }, []);

    const currentYear = new Date().getFullYear();

    return (
        <footer className={`site-footer ${themeMode === "dark" ? "dark" : "light"}`}>
            <div className="footer-content">
                <div className="footer-logo-section">
                    <img
                        src={
                            themeMode === "dark"
                                ? "/assets/images/spectologo.png"
                                : "/assets/images/spectologodark1.png"
                        }
                        alt="Specto Logo"
                        className="footer-logo"
                    />
                    <p className="footer-tagline">
                        A tua plataforma definitiva para filmes e séries.
                    </p>
                </div>

                <div className="footer-links">
                    <div className="footer-column">
                        <h4>Navegação</h4>
                        <a href="/home">Home</a>
                        <a href="/filmes">Filmes</a>
                        <a href="/series">Séries</a>
                        <a href="/forum">Fórum</a>
                    </div>
                    <div className="footer-column">
                        <h4>Legal</h4>
                        <a href="#">Termos de Uso</a>
                        <a href="#">Privacidade</a>
                        <a href="#">Cookies</a>
                    </div>
                    <div className="footer-column">
                        <h4>Social</h4>
                        <a href="#" target="_blank" rel="noopener noreferrer">Twitter</a>
                        <a href="#" target="_blank" rel="noopener noreferrer">Instagram</a>
                        <a href="#" target="_blank" rel="noopener noreferrer">GitHub</a>
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <p>&copy; {currentYear} Specto. Todos os direitos reservados.</p>
            </div>
        </footer>
    );
}
