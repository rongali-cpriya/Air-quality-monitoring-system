import React from "react";
import { FiMenu } from "react-icons/fi";

const TopNav = ({ toggleSidebar, isSidebarOpen }) => {
  return (
    <div style={styles.navbar(isSidebarOpen)}>
      <button
        onClick={toggleSidebar}
        style={styles.menuButton}
        aria-label="Toggle sidebar"
      >
        <FiMenu size={24} />
      </button>
      <div style={styles.title}>Air Quality Monitoring System</div>
    </div>
  );
};

const styles = {
  navbar: (isSidebarOpen) => ({
    display: "flex",
    alignItems: "center",
    padding: "1rem 2rem",
    backgroundColor: "white",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    position: "fixed",
    top: 0,
    right: 0,
    left: isSidebarOpen ? "250px" : "0",
    height: "64px", // Fixed height for calculations
    zIndex: 999,
    transition: "left 0.3s ease",
  }),
  menuButton: {
    background: "none",
    border: "none",
    fontSize: "1.5rem",
    cursor: "pointer",
    padding: "0.5rem",
    color: "#1e293b",
  },
  title: {
    marginLeft: "1rem",
    fontSize: "1.1rem",
    fontWeight: "500",
    color: "#1e293b",
  },
};

export default TopNav;