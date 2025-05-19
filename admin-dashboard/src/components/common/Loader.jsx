import React from "react";

const Loader = ({ size = "medium" }) => {
  const sizeStyles = {
    small: { width: "20px", height: "20px", borderWidth: "2px" },
    medium: { width: "40px", height: "40px", borderWidth: "4px" },
    large: { width: "60px", height: "60px", borderWidth: "6px" },
  };

  return (
    <div style={styles.container}>
      <div
        style={{
          ...styles.spinner,
          ...sizeStyles[size],
        }}
      ></div>
      <p style={styles.text}>Loading...</p>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  spinner: {
    border: "4px solid #f3f3f3",
    borderTop: "4px solid #2563eb",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  text: {
    marginTop: "1rem",
    color: "#2563eb",
    fontSize: "1rem",
  },
};

// Inject keyframes into the document
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default Loader;