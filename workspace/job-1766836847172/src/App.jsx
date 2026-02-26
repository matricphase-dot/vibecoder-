import { useState } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app">
      <h1>Counter App</h1>
      <div className="counter">
        <button onClick={() => setCount(count - 1)} aria-label="Decrease count">-</button>
        <span className="count">{count}</span>
        <button onClick={() => setCount(count + 1)} aria-label="Increase count">+</button>
      </div>
    </div>
  );
}

export default App;
