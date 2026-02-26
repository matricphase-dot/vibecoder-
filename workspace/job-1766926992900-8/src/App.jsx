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
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      padding: 20
    },
    counter: {
      margin: uiSettings.counterMargin,
      fontWeight: uiSettings.counterFontWeight,
      fontSize: uiSettings.fontSize * 2
    },
    button: {
      backgroundColor: uiSettings.buttonBackground,
      color: uiSettings.buttonTextColor,
      border: "none",
      borderRadius: uiSettings.buttonRadius,
      padding: uiSettings.buttonPadding,
      cursor: "pointer",
      fontSize: uiSettings.fontSize,
      margin: "0 10px",
      minWidth: 60
    },
    buttonContainer: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center"
    }
  };

  return (
    <div style={styles.app}>
      <div style={styles.counter} aria-live="polite" aria-atomic="true">{count}</div>
      <div style={styles.buttonContainer}>
        <button
          style={styles.button}
          onClick={() => setCount(count - 1)}
          aria-label="Decrease count"
          type="button"
        >
          -
        </button>
        <button
          style={styles.button}
          onClick={() => setCount(count + 1)}
          aria-label="Increase count"
          type="button"
        >
          +
        </button>
      </div>
    </div>
  );
}
