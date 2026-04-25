// frontend/src/components/MissionPanel.jsx
import React, { useState } from 'react';

export default function MissionPanel({ onMissionStart }) {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const startMission = async () => {
    if (!description.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/mission/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });
      const data = await res.json();
      alert('Mission started! Check console for progress.');
      if (onMissionStart) onMissionStart(description);
    } catch (err) {
      console.error(err);
      alert('Failed to start mission');
    }
    setLoading(false);
  };

  return (
    <div className="p-4 bg-antigravity-sidebar rounded-lg">
      <h3 className="text-lg font-semibold mb-2">🎯 Mission Mode (Full Autonomy)</h3>
      <textarea
        rows={3}
        className="w-full bg-antigravity-bg border border-antigravity-border rounded p-2 mb-2"
        placeholder="Describe what you want to build (e.g., 'Create a task manager with user auth, database, and React dashboard')"
        value={description}
        onChange={e => setDescription(e.target.value)}
      />
      <button
        onClick={startMission}
        disabled={loading}
        className="bg-antigravity-accent px-4 py-2 rounded w-full"
      >
        {loading ? 'Starting Mission...' : '🚀 Start Mission'}
      </button>
    </div>
  );
}
