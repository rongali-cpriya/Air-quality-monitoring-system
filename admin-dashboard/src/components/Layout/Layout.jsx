import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopNav from "./TopNav";

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  return (
    <div style={styles.container}>
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <TopNav isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div style={styles.contentWrapper(isSidebarOpen)}>
        <main style={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "#f1f5f9",
    position: "relative",
  },
  contentWrapper: (isSidebarOpen) => ({
    flexGrow: 1,
    marginLeft: isSidebarOpen ? "250px" : "0",
    transition: "margin-left 0.3s ease",
    marginTop: "64px", // Height of TopNav
    width: isSidebarOpen ? "calc(100% - 250px)" : "100%",
  }),
  main: {
    padding: "2rem",
    minHeight: "calc(100vh - 64px)", // Subtract TopNav height
  },
};

export default Layout;