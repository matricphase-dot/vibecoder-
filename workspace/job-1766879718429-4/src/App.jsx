import React, { useState } from "react";
import uiSettings from "./uiSettings.json";

function App() {
  const [count, setCount] = useState(0);

  const styles = {
    app: {
      fontFamily: uiSettings.fontFamily,
      backgroundColor: uiSettings.backgroundColor,
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center"
    },
    counter: {
      fontSize: uiSettings.fontSize,
      color: uiSettings.counterColor,
      marginBottom: "20px"
    },
    button: {
      backgroundColor: uiSettings.buttonColor,
      color: uiSettings.buttonTextColor,
      padding: uiSettings.buttonPadding,
      border: "none",
      borderRadius: uiSettings.buttonBorderRadius,
      cursor: "pointer",
      margin: "0 10px",
      fontSize: "18px"
    },
    buttonContainer: {
      display: "flex",
      flexDirection: "row"
    }
  };

  return (
    <div style={styles.app}>
      <div style={styles.counter}>{count}</div>
      <div style={styles.buttonContainer}>
        <button style={styles.button} onClick={() => setCount(count - 1)}>-</button>
        <button style={styles.button} onClick={() => setCount(count + 1)}>+</button>
      </div>
    </div>
  );
}

export default App;
