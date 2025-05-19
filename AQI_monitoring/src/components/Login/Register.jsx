import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const navigate = useNavigate();

  const API_URL = 'http://localhost:8002';

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [id]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError(true);
      setServerError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError(false);
    setServerError('');

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Registration failed');
      }

      navigate('/login', { state: { message: 'Registration successful! Please log in.' } });
    } catch (err) {
      setError(true);
      setServerError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderSpans = () => {
    const spans = [];
    for (let i = 0; i < 300; i++) {
      spans.push(<span key={i}></span>);
    }
    return spans;
  };

  return (
    <div className="register-wrapper">
      <section className="register-section">
        {renderSpans()}

        <div className="signup">
          <div className="content">
            <h2 className="register-title">Create Account</h2>

            {serverError && (
              <div className="error">
                <h4>{serverError}</h4>
              </div>
            )}

            <div className="form">
              <form onSubmit={handleSubmit}>
                <div className="inputBox">
                  <input
                    type="text"
                    id="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                  <i>Username</i>
                </div>

                <div className="inputBox">
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                  <i>Email</i>
                </div>

                <div className="inputBox">
                  <input
                    type="password"
                    id="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                  <i>Password</i>
                </div>

                <div className="inputBox">
                  <input
                    type="password"
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                  <i>Confirm Password</i>
                </div>

                <div className="links">
                  <Link to="/login">Already have an account? Sign In</Link>
                </div>

                <div className="inputBox submit-box">
                  <input
                    type="submit"
                    value={isLoading ? "Creating Account..." : "Sign Up"}
                    disabled={isLoading}
                  />
                </div>
              </form>
            </div>
          </div>

          {isLoading && (
            <div className="loading-overlay">
              <div className="spinner"></div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Register;