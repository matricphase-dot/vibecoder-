import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl, wsUrl } from '../config';

export default function SimpleModeUI() {
  const [prompt, setPrompt] = useState('');
  const [generatedHtml, setGeneratedHtml] = useState('<h1>Your app will appear here</h1>');
  const [loading, setLoading] = useState(false);
  const ws = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket(wsUrl('/ws'));
    ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'file' && data.path === 'index.html') {
        setGeneratedHtml(data.content);
        setLoading(false);
      } else if (data.type === 'complete') {
        setLoading(false);
      }
    };
    return () => ws.current?.close();
  }, []);

  const generate = () => {
    if (!prompt.trim()) return;
    setLoading(true);
    ws.current.send(JSON.stringify({ type: 'generate', prompt }));
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0a0a', color: 'white' }}>
      <div style={{ padding: 20, borderBottom: '1px solid #333', display: 'flex', gap: 10 }}>
        <input
          type="text"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="e.g., 'a to-do list with a blue button'"
          style={{ flex: 1, background: '#1e1e1e', border: '1px solid #333', padding: 12, borderRadius: 8, color: 'white', fontSize: 16 }}
        />
        <button onClick={generate} disabled={loading} style={{ background: '#1D4ED8', border: 'none', padding: '0 24px', borderRadius: 8, color: 'white', fontSize: 16, cursor: 'pointer' }}>
          {loading ? 'Creating...' : 'Create'}
        </button>
        <Link to="/" style={{ background: '#2d2d2d', border: 'none', padding: '0 16px', borderRadius: 8, color: 'white', cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>← Back</Link>
      </div>
      <div style={{ flex: 1, padding: 20 }}>
        <iframe srcDoc={generatedHtml} style={{ width: '100%', height: '100%', border: 'none', background: 'white', borderRadius: 8 }} title="preview" />
      </div>
    </div>
  );
}
