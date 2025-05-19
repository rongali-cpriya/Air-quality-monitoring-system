import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Login.css';

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const API_URL = 'http://localhost:8002';

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(false);
    setServerError('');
    setSuccessMessage('');

    try {
      const response = await fetch(`${API_URL}/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: username,
          password: password,
          grant_type: 'password'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      localStorage.setItem('access_token', data.access_token);
      onLoginSuccess();
      navigate('/map'); // Navigate to /map after successful login
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
    <div className="login-wrapper">
      <section className="login-section">
        {renderSpans()}

        <div className="signin">
          <div className="content">
            <h2 className="login-title">Weather Dashboard Login</h2>

            {successMessage && (
              <div className="success-message">
                <h4>{successMessage}</h4>
              </div>
            )}

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
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <i>Username</i>
                </div>

                <div className="inputBox">
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <i>Password</i>
                </div>

                <div className="links">
                  <a href="#">Forgot Password</a>
                  <Link to="/register">Create Account</Link>
                </div>

                <div className="inputBox submit-box">
                  <input
                    type="submit"
                    value={isLoading ? "Authenticating..." : "Sign In"}
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

export default Login;