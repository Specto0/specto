import "./Login.css";
import React from "react";

interface LogInFormData { 
    email: string;
    password: string;
}

export default function Login() {
    
    // Stores the main form data (email, password)
    const [formData, setFormData] = React.useState<LogInFormData>({
        email: '',
        password: '',
    });

    const [errors, setErrors] = React.useState<Partial<LogInFormData>>({
        email: '',
        password: '',
    });

    const isValidEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };

    const [isSubmitting, setIsSubmitting] = React.useState(false);
    
    // Controls whether password is visible or hidden
    const [showPassword, setShowPassword] = React.useState<boolean>(false);

    // Handles changes in input fields (updates state as user types)
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        console.log("User input:", name, value);
        
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    // Validates input fields when user leaves the field (onBlur)
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        
        let error = '';
        // Only validate email format (password validation happens on server)
        if (name === 'email' && !isValidEmail(value)) {
            error = 'Email inválido.';
        }
        
        setErrors({
            ...errors,
            [name]: error,
        });
    };

    // Handles form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // Prevents page reload
        setIsSubmitting(true); // Disable button during submission
    
        console.log("Form submitted:");
        console.log("Form data:", formData);

        // Validate email format
        const isEmailValid = isValidEmail(formData.email);
        const isPasswordValid = formData.password.length > 0; // Just check if not empty

        // Simulate API call (2 seconds delay)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (isEmailValid && isPasswordValid) {
            console.log("✅ Login concluído!");
            // TODO: Send data to backend API
        } else {
            console.log("❌ Login falhou! Email ou Password inválido!");
        }
        
        setIsSubmitting(false); // Re-enable button
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
        {/* Email input field */}
        <label htmlFor="email">Email:</label>
        <input
          type="text"
          name="email"
          value={formData.email}
          onChange={handleChange}
          onBlur={handleBlur}
          required
        />
        {errors.email && <span className="error">{errors.email}</span>}
        </div>

        {/* Password input field */}
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
          />
          <button
            type="button"
            className="toggle-password-icon"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
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
        </div>

        <div className="forgot-password-link">
        <p>Forgot your password? <a href="/forgot-password">Reset it here!</a></p>
        </div>
        
        <button type="submit" className="login-button" disabled={isSubmitting}>
            {isSubmitting ? 'A Enviar...' : 'Login'}
        </button>
        </form>
        
        <div className="signup-link">
        <p>Don't have an account? <a href="/Registar">Create one here!</a></p>
        </div>
        </div>
    </div>
    );
}