import "./Login.css";
import React from "react";
import { useNavigate } from "react-router-dom";
import { applyTheme, coerceTheme } from "../../utils/theme";
import { buildApiUrl } from "@/utils/api";

interface LogInFormData {
  email: string;
  password: string;
}

export default function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = React.useState<LogInFormData>({
    email: "",
    password: "",
  });

  const [errors, setErrors] = React.useState({
    email: "",
    password: "",
    general: "",
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState<boolean>(false);

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Atualiza o estado ao digitar
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Valida ao sair do input
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let error = "";
    if (name === "email" && !isValidEmail(value)) error = "Email inválido.";
    if (name === "password" && value.trim().length === 0)
      error = "Password obrigatória.";
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  // Submete o formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({ email: "", password: "", general: "" });

    // Validação local
    if (!isValidEmail(formData.email) || formData.password.trim() === "") {
      setErrors((prev) => ({
        ...prev,
        email: !isValidEmail(formData.email) ? "Email inválido." : "",
        password:
          formData.password.trim() === "" ? "Password obrigatória." : "",
      }));
      setIsSubmitting(false);
      return;
    }

    try {
      // Auth2PasswordRequestForm: enviar como x-www-form-urlencoded
      const body = new URLSearchParams();
      body.set("username", formData.email); // o backend lê o email em "username"!!
      body.set("password", formData.password);

      const response = await fetch(buildApiUrl("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      if (!response.ok) {
        let message = "Dados inválidos";
        try {
          const err = await response.json();
          message = err.detail || err.message || JSON.stringify(err);
        } catch {
          message = await response.text();
        }
        throw new Error(message);
      }

      const data = await response.json();

      // Guarda token e user info
      localStorage.setItem("token", data.access_token);
      if (data.user) {
        const normalizedTheme = coerceTheme(data.user.theme_mode);
        const normalizedUser = {
          ...data.user,
          theme_mode: normalizedTheme,
        };
        localStorage.setItem("user", JSON.stringify(normalizedUser));
        applyTheme(normalizedTheme);
      } else {
        applyTheme("dark");
      }

      // Redireciona
      navigate("/Home");
    } catch (err: unknown) {
      console.error("Erro no login:", err);
      const errorMessage = err instanceof Error ? err.message : "Erro ao tentar iniciar sessão.";
      setErrors((prev) => ({
        ...prev,
        general: errorMessage,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <img
        src="/assets/images/spectologo.png"
        alt="Specto Logo"
        className="login-logo"
      />

      <div className="login-box">
        <h2 className="login-title">Welcome To Specto</h2>
        <p>Sign In to your account.</p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">Email:</label>
            <input
              type="text"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              autoComplete="email"
            />
            {errors.email && <span className="error">{errors.email}</span>}
          </div>

          <div className="input-group">
            <label htmlFor="password">Password:</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="toggle-password-icon"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
            {errors.password && <span className="error">{errors.password}</span>}
          </div>

          {errors.general && (
            <div className="error general-error">{errors.general}</div>
          )}

          <div className="forgot-password-link">
            <p>
              Forgot your password?{" "}
              <a href="/forgot-password">Reset it here!</a>
            </p>
          </div>

          <button type="submit" className="login-button" disabled={isSubmitting}>
            {isSubmitting ? "A Enviar..." : "Login"}
          </button>
        </form>

        <div className="signup-link">
          <p>
            Don't have an account? <a href="/register">Create one here!</a>
          </p>
        </div>
      </div>
    </div>
  );
}
