import React from "react";
import ReactDOM from "react-dom/client";
import uiSettings from "./uiSettings.json";

function App() {
  const styles = {
    container: {
      backgroundColor: uiSettings.colors.background,
      fontFamily: uiSettings.font.family,
      fontSize: uiSettings.font.size,
      color: uiSettings.colors.text,
      padding: uiSettings.spacing.padding,
      margin: 0,
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      textAlign: "center",
    },
    title: {
      color: uiSettings.colors.primary,
      marginBottom: uiSettings.spacing.margin,
    },
    subtitle: {
      marginBottom: uiSettings.spacing.margin,
    },
    button: {
      backgroundColor: uiSettings.colors.primary,
      color: "#fff",
      border: "none",
      padding: "10px 20px",
      borderRadius: "5px",
      cursor: "pointer",
      fontSize: "1rem",
    },
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Welcome to Our Landing Page</h1>
      <p style={styles.subtitle}>
        We are glad to have you here. Discover our product and services.
      </p>
      <button
        style={styles.button}
        onClick={() => alert("Thank you for your interest!")}
      >
        Get Started
      </button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
