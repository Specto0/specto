import "./Registar.css";
import React from "react";

interface SignUpFormData { 
    username: string;
    email: string;
    password: string;
}

export default function Registar() {
  
  // Stores the main form data (username, email, password)
  const [formData, setFormData] = React.useState<SignUpFormData>({
    username: '',
    email: '',
    password: '',
  });

  // Stores the password confirmation input
  const [confirmPassword, setConfirmPassword] = React.useState<string>('');

  // Controls whether passwords are visible or hidden
  const [showPassword, setShowPassword] = React.useState<boolean>(false);

  // Stores validation errors for each field
  const [errors, setErrors] = React.useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Controls submit button state (loading/disabled)
  const [isSubmitting, setIsSubmitting] = React.useState(false);


  // Validates email format using regex pattern
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validates password length (minimum 6 characters)
  const isValidPassword = (password: string) => {
    return password.length >= 6;
  };

  // Validates username (minimum 3 characters, no spaces)
  const isValidUsername = (username: string) => {
    return username.length >= 3 && !/\s/.test(username);
  };

  // Returns password strength: 'Fraca', 'Média', or 'Forte'
  const getPasswordStrength = (password: string) => {
    if (password.length < 6) return 'Fraca';
    if (password.length < 10) return 'Média';
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) return 'Forte';
    return 'Média';
  };
  
  // Handles input changes and updates form state
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Update form data
    setFormData({
      ...formData,
      [name]: value,
    });

    // Clear error when user starts typing (gives immediate feedback)
    if (errors[name as keyof typeof errors]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  // Validates field when user leaves it (onBlur)
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let errorMessage = '';

    // Validate based on field name
    switch (name) {
      case 'username':
        if (!isValidUsername(value)) {
          errorMessage = 'Username deve ter pelo menos 3 caracteres e sem espaços.';
        }
        break;
      case 'email':
        if (!isValidEmail(value)) {
          errorMessage = 'Email inválido.';
        }
        break;
      case 'password':
        if (!isValidPassword(value)) {
          errorMessage = 'Password deve ter pelo menos 6 caracteres.';
        }
        break;
      case 'confirmPassword':
        if (value !== formData.password) {
          errorMessage = 'As passwords não coincidem.';
        }
        break;
    }

    // Update error state
    setErrors({
      ...errors,
      [name]: errorMessage,
    });
  };

  // Handles form submission and validates all fields
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevents page reload
    
    // Disable button during submission
    setIsSubmitting(true);

    console.log("Form submitted:");
    console.log("Form data:", formData);

    // Validate all fields
    const isEmailValid = isValidEmail(formData.email);
    const isPasswordValid = isValidPassword(formData.password);
    const doPasswordsMatch = formData.password === confirmPassword;
    const isUsernameValid = isValidUsername(formData.username);

    console.log(" Valid Email?", isEmailValid);
    console.log(" Valid Password?", isPasswordValid);
    console.log(" Passwords Match?", doPasswordsMatch);
    console.log(" Valid Username?", isUsernameValid);

    // Check if all validations pass
    if (isEmailValid && isPasswordValid && doPasswordsMatch && isUsernameValid) {
      console.log("✅ Formulário válido! A enviar...");
      
      // Simulate API call (remove this and add your real API call)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log("✅ Registo concluído!");
    } else {
      console.log("❌ Formulário inválido!");
    }

    // Re-enable button after submission
    setIsSubmitting(false);
  };

  return (
    <div className="register-container">
      <img 
        src="/assets/images/spectologo.png" 
        alt="Specto Logo" 
        className="register-logo"
      />
      <div className="register-box">
        <h2 className="register-title">Join Specto</h2>
        <p>Create your account to get started.</p>

        <form onSubmit={handleSubmit}>
          {/* Username input field */}
          <div className="input-group">
            <label htmlFor="username">Nome de Utilizador:</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              onBlur={handleBlur}
              required
            />
            {errors.username && <span className="error">{errors.username}</span>}
          </div>

          {/* Email input field */}
          <div className="input-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              required
            />
            {errors.email && <span className="error">{errors.email}</span>}
          </div>

          {/* Password input field - type changes based on showPassword state */}
          <div className="input-group">
            <label htmlFor="password">Palavra-passe:</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                required
              />
              <button
                type="button"
                className="toggle-password-icon"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
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

          {/* Confirm password input field */}
          <div className="input-group">
            <label htmlFor="confirmPassword">Confirmar Palavra-passe:</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  // Clear error when user starts typing
                  if (errors.confirmPassword) {
                    setErrors({ ...errors, confirmPassword: '' });
                  }
                }}
                onBlur={handleBlur}
                required
              />
              <button
                type="button"
                className="toggle-password-icon"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
            {errors.confirmPassword && <span className="error">{errors.confirmPassword}</span>}
          </div>

          {/* Submit button - triggers handleSubmit function */}
          <button 
            type="submit" 
            className="register-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'A registar...' : 'Registar'}
          </button>
        </form>

        <div className="login-link">
          <p>Already have an account? <a href="/login">Sign in here!</a></p>
        </div>
      </div>
    </div>
  );
}