import { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);

  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#f0f0f0",
  };

  const countStyle = {
    fontSize: "4rem",
    margin: "20px 0",
  };

  const buttonContainerStyle = {
    display: "flex",
    gap: "20px",
  };

  const buttonStyle = {
    fontSize: "2rem",
    padding: "10px 20px",
    cursor: "pointer",
    borderRadius: "5px",
    border: "1px solid #ccc",
    backgroundColor: "white",
    userSelect: "none",
  };

  return (
    <div style={containerStyle}>
      <div style={countStyle}>{count}</div>
      <div style={buttonContainerStyle}>
        <button
          style={buttonStyle}
          onClick={() => setCount((c) => c - 1)}
          aria-label="Decrease count"
        >
          −
        </button>
        <button
          style={buttonStyle}
          onClick={() => setCount((c) => c + 1)}
          aria-label="Increase count"
        >
          +
        </button>
      </div>
    </div>
  );
}