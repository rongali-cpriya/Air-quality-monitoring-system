import React from "react";
import { Link, useLocation } from "react-router-dom";
import { FiHome, FiUsers, FiMapPin, FiArchive, FiBell, FiAlertCircle, FiMessageSquare } from "react-icons/fi";
import { MdLogout } from "react-icons/md";
import AdminService from "../../api/adminApi";

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Dashboard", icon: <FiHome size={20} /> },
    { path: "/users", label: "Users", icon: <FiUsers size={20} /> },
    { path: "/stations", label: "Stations", icon: <FiMapPin size={20} /> },
    { path: "/contributions", label: "Contributions", icon: <FiArchive size={20} /> },
    { path: "/measurements", label: "Measurements", icon: <FiAlertCircle size={20} /> },
    { path: "/notifications", label: "Notifications", icon: <FiBell size={20} /> },
    { path: "/feedback", label: "Feedback", icon: <FiMessageSquare size={20} /> },
  ];

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    window.location.href = "/login";
  };

  return (
    <div style={styles.sidebar(isOpen)}>
      <div style={styles.logo}>AQMS Admin</div>

      <nav style={styles.nav}>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={styles.navItem(location.pathname === item.path)}
            onClick={() => !isOpen && toggleSidebar()}
          >
            {item.icon}
            <span style={styles.navText}>{item.label}</span>
          </Link>
        ))}
      </nav>

      <button onClick={handleLogout} style={styles.logoutButton}>
        <MdLogout size={20} />
        <span style={styles.navText}>Log Out</span>
      </button>
    </div>
  );
};

const styles = {
  sidebar: (isOpen) => ({
    width: "250px",
    height: "100vh",
    backgroundColor: "#1e293b",
    color: "white",
    position: "fixed",
    left: 0,
    top: 0,
    bottom: 0,
    transform: isOpen ? "translateX(0)" : "translateX(-250px)",
    transition: "transform 0.3s ease",
    display: "flex",
    flexDirection: "column",
    zIndex: 1000,
    boxShadow: isOpen ? "0 0 10px rgba(0,0,0,0.1)" : "none",
  }),
  logo: {
    padding: "1.5rem",
    fontSize: "1.25rem",
    fontWeight: "bold",
    borderBottom: "1px solid #334155",
    textAlign: "center",
  },
  nav: {
    flex: 1,
    padding: "1rem 0",
    overflowY: "auto",
  },
  navItem: (isActive) => ({
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    padding: "1rem 1.5rem",
    color: isActive ? "#2563eb" : "#94a3b8",
    backgroundColor: isActive ? "#1e3a8a20" : "transparent",
    textDecoration: "none",
    transition: "background-color 0.2s, color 0.2s",
  }),
  navText: {
    fontSize: "0.95rem",
  },
  logoutButton: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    padding: "1rem 1.5rem",
    background: "none",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    transition: "background-color 0.2s, color 0.2s",
    textAlign: "left",
    width: "100%",
  },
};

export default Sidebar;