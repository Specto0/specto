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
      <h2>Registar</h2>
      <form onSubmit={handleSubmit} className="register-form">
        
        {/* Username input field */}
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

        {/* Email input field */}
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

        {/* Password input field - type changes based on showPassword state */}
        <label htmlFor="password">Palavra-passe:</label>
        <input
          type={showPassword ? "text" : "password"}
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          onBlur={handleBlur}
          required
        />
        {errors.password && <span className="error">{errors.password}</span>}
        {formData.password && (
          <span className={`password-strength ${getPasswordStrength(formData.password).toLowerCase()}`}>
            Força: {getPasswordStrength(formData.password)}
          </span>
        )}

        {/* Confirm password input field */}
        <label htmlFor="confirmPassword">Confirmar Palavra-passe:</label>
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
        {errors.confirmPassword && <span className="error">{errors.confirmPassword}</span>}

        {/* Toggle button to show/hide both password fields */}
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? 'Ocultar Palavra-passe' : 'Mostrar Palavra-passe'}
        </button>

        {/* Submit button - triggers handleSubmit function */}
        <button 
          type="submit" 
          disabled={isSubmitting}
          className={isSubmitting ? 'submitting' : ''}
        >
          {isSubmitting ? 'A registar...' : 'Registar'}
        </button>
        
      </form>
    </div>
  );
}