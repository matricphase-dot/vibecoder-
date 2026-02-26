import React, { useState } from "react";
import uiSettings from "./uiSettings.json";

export default function App() {
  const [count, setCount] = useState(0);

  const styles = {
    app: {
      backgroundColor: uiSettings.background,
      color: uiSettings.textColor,
      fontFamily: uiSettings.fontFamily,
      fontSize: uiSettings.fontSize,
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      margin: 0,
      padding: 0
    },
    count: {
      fontSize: uiSettings.fontSize * 2,
      marginBottom: 20
    },
    button: {
      backgroundColor: uiSettings.buttonBackground,
      color: uiSettings.buttonTextColor,
      border: "none",
      borderRadius: uiSettings.buttonRadius,
      padding: uiSettings.buttonPadding,
      margin: "0 10px",
      cursor: "pointer",
      fontSize: uiSettings.fontSize,
      userSelect: "none"
    },
    buttonContainer: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center"
    }
  };

  return (
    <div style={styles.app}>
      <div style={styles.count}>{count}</div>
      <div style={styles.buttonContainer}>
        <button
          style={styles.button}
          onClick={() => setCount(count - 1)}
          aria-label="Decrease count"
        >
          -
        </button>
        <button
          style={styles.button}
          onClick={() => setCount(count + 1)}
          aria-label="Increase count"
        >
          +
        </button>
      </div>
    </div>
  );
}
