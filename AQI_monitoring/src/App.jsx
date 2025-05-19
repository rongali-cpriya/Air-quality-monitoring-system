// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, useLocation, Navigate } from 'react-router-dom';
import WeatherDetails from './components/WeatherDetails';
import Map from './components/Map';
import Login from './components/Login/Login';
import Register from './components/Login/Register';
import Forum from './components/Forum';
import Profile from './components/Profile';
import PublicContributors from './components/PublicContributors';
import Preferences from './components/Preferences';
import Notifications from './components/Notifications';
import Feedback from './components/Feedback';
import './App.css';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem('access_token')
  );
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('auth_status', 'true');
      const fetchUserRole = async () => {
        try {
          const response = await fetch('http://localhost:8002/users/me', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
          });
          if (response.ok) {
            const userData = await response.json();
            setUserRole(userData.role);
          } else {
            setIsAuthenticated(false);
            localStorage.removeItem('access_token');
            setUserRole(null);
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          setIsAuthenticated(false);
          localStorage.removeItem('access_token');
          setUserRole(null);
        }
      };
      fetchUserRole();
    } else {
      localStorage.removeItem('auth_status');
      localStorage.removeItem('access_token');
      setUserRole(null);
    }
  }, [isAuthenticated]);

  return (
    <Router>
      <MainLayout
        isAuthenticated={isAuthenticated}
        setIsAuthenticated={setIsAuthenticated}
        userRole={userRole}
      />
    </Router>
  );
};

const MainLayout = ({ isAuthenticated, setIsAuthenticated, userRole }) => {
  const location = useLocation();
  const showSidebar = location.pathname !== '/login' && location.pathname !== '/register';
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const userMenuRef = useRef(null);

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('access_token');
    setIsUserMenuOpen(false);
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen((prev) => !prev);
  };

  // Fetch unread notifications count when menu opens
  useEffect(() => {
    if (isUserMenuOpen && isAuthenticated) {
      const fetchUnreadCount = async () => {
        try {
          const response = await fetch('http://localhost:8002/notifications/?is_read=false', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
          });
          if (response.ok) {
            const notifications = await response.json();
            setUnreadCount(notifications.length);
          } else {
            console.error('Failed to fetch unread notifications');
          }
        } catch (error) {
          console.error('Error fetching unread notifications:', error);
        }
      };
      fetchUnreadCount();
    }
  }, [isUserMenuOpen, isAuthenticated]);

  // Desktop popup notifications via polling
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkNewNotifications = async () => {
      try {
        const response = await fetch('http://localhost:8002/notifications/?is_read=false', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        if (response.ok) {
          const newNotifications = await response.json();
          const currentUnread = unreadCount;
          if (newNotifications.length > currentUnread && newNotifications.length > 0) {
            const latestNotification = newNotifications[0];
            if (Notification.permission === 'granted') {
              new Notification(latestNotification.title, {
                body: latestNotification.message,
                icon: '/assets/react.svg'
              });
            } else if (Notification.permission !== 'denied') {
              Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                  new Notification(latestNotification.title, {
                    body: latestNotification.message,
                    icon: '/assets/react.svg'
                  });
                }
              });
            }
          }
          setUnreadCount(newNotifications.length);
        }
      } catch (error) {
        console.error('Error polling notifications:', error);
      }
    };

    const interval = setInterval(checkNewNotifications, 60000); // Poll every 60 seconds
    return () => clearInterval(interval);
  }, [isAuthenticated, unreadCount]);

  // Handle outside click to close popup
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  return (
    <>
      {showSidebar && (
        <nav className="sidebar">
          {isAuthenticated && (
            <div className="sidebar-user-section" ref={userMenuRef}>
              <div className="nav-link user-icon" onClick={toggleUserMenu}>
                <i className="fas fa-user"></i>
              </div>
              {isUserMenuOpen && (
                <div className="user-menu">
                  <Link to="/profile" className="menu-item" onClick={() => setIsUserMenuOpen(false)}>
                    Profile
                  </Link>
                  <Link to="/notifications" className="menu-item" onClick={() => setIsUserMenuOpen(false)}>
                    Notifications {unreadCount > 0 && <span className="notification-dot"></span>}
                  </Link>
                  <Link to="/preferences" className="menu-item" onClick={() => setIsUserMenuOpen(false)}>
                    Preferences
                  </Link>
                  <Link to="/feedback" className="menu-item" onClick={() => setIsUserMenuOpen(false)}>
                    Feedback
                  </Link>
                  <button className="menu-item logout-btn" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
          {!isAuthenticated ? (
            <>
              <Link to="/login" className="nav-link button-link">
                Login
              </Link>
              <Link to="/register" className="nav-link button-link register-btn">
                Register
              </Link>
            </>
          ) : null}
          <Link to="/map" className="nav-link">
            <i className="fas fa-map"></i>
          </Link>
          <Link to="/weather" className="nav-link">
            <i className="fas fa-cloud-sun"></i>
          </Link>
          <Link to="/forum" className="nav-link">
            <i className="fas fa-comments"></i>
          </Link>
          <Link to="/contributors" className="nav-link">
            <i className="fas fa-users"></i>
          </Link>
        </nav>
      )}
      <div className={`content-wrapper ${showSidebar ? 'with-sidebar' : ''}`}>
        <Routes>
          <Route path="/login" element={<Login onLoginSuccess={() => setIsAuthenticated(true)} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/map" element={<Map />} />
          <Route path="/weather" element={<WeatherDetails />} />
          <Route path="/forum" element={<Forum />} />
          <Route
            path="/profile"
            element={isAuthenticated ? <Profile /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/preferences"
            element={isAuthenticated ? <Preferences /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/notifications"
            element={isAuthenticated ? <Notifications /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/feedback"
            element={isAuthenticated ? <Feedback /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/contributors"
            element={
              isAuthenticated
                ? userRole === 'data_contributor'
                  ? <PublicContributors />
                  : <div className="permission-error">You don't have permissions. Only data contributors can access this page.</div>
                : <Navigate to="/login" replace />
            }
          />
          <Route path="/" element={<Navigate to="/map" replace />} />
        </Routes>
      </div>
    </>
  );
};

export default App;