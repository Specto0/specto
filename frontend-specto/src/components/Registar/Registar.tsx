import "./Registar.css";
import React from "react";
import { useNavigate } from "react-router-dom";

interface SignUpFormData {
  username: string;
  email: string;
  password: string;
}

type FieldErrors = {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  global?: string;
};

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function Registar() {
  const navigate = useNavigate();

  const [formData, setFormData] = React.useState<SignUpFormData>({
    username: "",
    email: "",
    password: "",
  });
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Helpers de validação
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPassword = (password: string) => password.length >= 6;
  const isValidUsername = (username: string) => username.length >= 3 && !/\s/.test(username);
  const getPasswordStrength = (password: string) => {
    if (password.length < 6) return "Fraca";
    if (password.length < 10) return "Média";
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) return "Forte";
    return "Média";
  };

  const setFieldError = (name: keyof FieldErrors, message: string) =>
    setErrors((prev) => ({ ...prev, [name]: message }));

  // onChange
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((s) => ({ ...s, [name]: value }));
    if (errors[name as keyof FieldErrors]) {
      setFieldError(name as keyof FieldErrors, "");
    }
  };

  // onBlur
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let msg = "";
    if (name === "username" && !isValidUsername(value)) {
      msg = "Username deve ter pelo menos 3 caracteres e sem espaços.";
    } else if (name === "email" && !isValidEmail(value)) {
      msg = "Email inválido.";
    } else if (name === "password" && !isValidPassword(value)) {
      msg = "Password deve ter pelo menos 6 caracteres.";
    } else if (name === "confirmPassword" && value !== formData.password) {
      msg = "As passwords não coincidem.";
    }
    if (msg) setFieldError(name as keyof FieldErrors, msg);
  };

  // submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // validação client-side
    const newErrors: FieldErrors = {};
    if (!isValidUsername(formData.username)) newErrors.username = "Username deve ter pelo menos 3 caracteres e sem espaços.";
    if (!isValidEmail(formData.email)) newErrors.email = "Email inválido.";
    if (!isValidPassword(formData.password)) newErrors.password = "Password deve ter pelo menos 6 caracteres.";
    if (confirmPassword !== formData.password) newErrors.confirmPassword = "As passwords não coincidem.";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      setIsSubmitting(true);
      setSuccessMsg(null);
      setFieldError("global", "");

      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        }),
      });

      if (res.status === 201) {
        // sucesso
        setSuccessMsg("Conta criada com sucesso! A redirecionar para login…");
        setTimeout(() => navigate("/login"), 800); // pequeno delay para feedback
        return;
      }

      // erros comuns do backend
      const text = await res.text();
      let detail: string | undefined;
      try {
        const json = JSON.parse(text);
        detail = json?.detail;
      } catch {
        // body não era JSON; fica o texto cru
        detail = text;
      }

      if (res.status === 400) {
        // no nosso backend devolvemos: "Username já existe." OU "Email já existe."
        if (detail?.toLowerCase().includes("username")) setFieldError("username", detail);
        else if (detail?.toLowerCase().includes("email")) setFieldError("email", detail);
        else setFieldError("global", detail || "Pedido inválido.");
      } else if (res.status === 422) {
        setFieldError("global", "Dados inválidos. Verifica o formulário.");
      } else {
        setFieldError("global", detail || `Erro inesperado (${res.status}).`);
      }
    } catch (err) {
      setFieldError("global", "Falha de rede. Tenta novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register-container">
      <img src="/assets/images/spectologo.png" alt="Specto Logo" className="register-logo" />
      <div className="register-box">
        <h2 className="register-title">Join Specto</h2>
        <p>Create your account to get started.</p>

        {errors.global && <div className="error global-error">{errors.global}</div>}
        {successMsg && <div className="success global-success">{successMsg}</div>}

        <form onSubmit={handleSubmit}>
          {/* Username */}
          <div className="input-group">
            <label htmlFor="username">Nome de Utilizador:</label>
            <input
              type="text" id="username" name="username"
              value={formData.username} onChange={handleChange} onBlur={handleBlur} required
            />
            {errors.username && <span className="error">{errors.username}</span>}
          </div>

          {/* Email */}
          <div className="input-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email" id="email" name="email"
              value={formData.email} onChange={handleChange} onBlur={handleBlur} required
            />
            {errors.email && <span className="error">{errors.email}</span>}
          </div>

          {/* Password */}
          <div className="input-group">
            <label htmlFor="password">Palavra-passe:</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password" name="password"
                value={formData.password} onChange={handleChange} onBlur={handleBlur} required
              />
              <button
                type="button" className="toggle-password-icon"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
            {errors.password && <span className="error">{errors.password}</span>}
            {formData.password && (
              <span className={`password-strength ${getPasswordStrength(formData.password).toLowerCase()}`}>
                Força: {getPasswordStrength(formData.password)}
              </span>
            )}
          </div>

          {/* Confirm password */}
          <div className="input-group">
            <label htmlFor="confirmPassword">Confirmar Palavra-passe:</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="confirmPassword" name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setFieldError("confirmPassword", "");
                }}
                onBlur={handleBlur} required
              />
              <button
                type="button" className="toggle-password-icon"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
              >
                {/* mesmo ícone que acima */}
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
            {errors.confirmPassword && <span className="error">{errors.confirmPassword}</span>}
          </div>

          <button type="submit" className="register-button" disabled={isSubmitting}>
            {isSubmitting ? "A registar..." : "Registar"}
          </button>
        </form>

        <div className="login-link">
          <p>Already have an account? <a href="/login">Sign in here!</a></p>
        </div>
      </div>
    </div>
  );
}
