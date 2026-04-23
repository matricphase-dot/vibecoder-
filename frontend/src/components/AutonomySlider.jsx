// frontend/src/components/AutonomySlider.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const AutonomyContext = createContext();

export const useAutonomy = () => useContext(AutonomyContext);

const MODES = [
  { value: 'suggest', label: 'Suggest', desc: 'Ghost completions only' },
  { value: 'assist', label: 'Assist', desc: 'One‑click apply, you approve' },
  { value: 'agent', label: 'Agent', desc: 'Full autonomous pipeline' },
];

export function AutonomyProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('autonomyMode') || 'agent');

  useEffect(() => {
    localStorage.setItem('autonomyMode', mode);
  }, [mode]);

  return (
    <AutonomyContext.Provider value={{ mode, setMode, isSuggest: mode === 'suggest', isAssist: mode === 'assist', isAgent: mode === 'agent' }}>
      {children}
    </AutonomyContext.Provider>
  );
}

export default function AutonomySlider() {
  const { mode, setMode } = useAutonomy();
  const currentIdx = MODES.findIndex(m => m.value === mode);
  const handleChange = (e) => setMode(e.target.value);

  return (
    <div className="flex items-center gap-2 bg-antigravity-tab rounded-md px-2 py-1 text-xs">
      {MODES.map((m, i) => (
        <label key={m.value} className="flex items-center gap-1 cursor-pointer">
          <input type="radio" name="autonomy" value={m.value} checked={mode === m.value} onChange={handleChange} className="w-3 h-3" />
          <span className={mode === m.value ? 'text-antigravity-accent' : 'text-gray-400'}>{m.label}</span>
        </label>
      ))}
    </div>
  );
}
