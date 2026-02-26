import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import uiSettings from './uiSettings.json';

function App() {
  const [count, setCount] = useState(0);

  const increment = () => setCount(count + 1);
  const decrement = () => setCount(count - 1);

  return (
    <div style={uiSettings.container}>
      <div style={uiSettings.counter}>{count}</div>
      <div>
        <button style={uiSettings.button} onClick={decrement}>-</button>
        <button style={uiSettings.button} onClick={increment}>+</button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
