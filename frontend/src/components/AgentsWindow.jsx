import { useState, useEffect, useRef } from 'react';
import { apiUrl, wsUrl } from '../config';

const STATUS = {
  pending:  { color: '#6B7280', bg: 'rgba(107,114,128,0.15)', dot: '#6B7280', label: 'Queued' },
  running:  { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', dot: '#3B82F6', label: 'Running' },
  done:     { color: '#10B981', bg: 'rgba(16,185,129,0.12)', dot: '#10B981', label: 'Done' },
  error:    { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', dot: '#EF4444', label: 'Error' },
  cancelled:{ color: '#6B7280', bg: 'rgba(107,114,128,0.1)',  dot: '#6B7280', label: 'Cancelled' },
};

function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  return `${Math.floor(diff/3600)}h ago`;
}

export default function AgentsWindow({ onClose }) {
  const [sessions, setSessions] = useState([]);
  const [logs, setLogs] = useState({});
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const wsRefs = useRef({});
  const pollRef = useRef(null);

  const fetchSessions = async () => {
    try {
      const res = await fetch(apiUrl('/agents'));
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      setSessions([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    pollRef.current = setInterval(fetchSessions, 3000);
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    sessions.forEach(s => {
      if (s.status === 'running' && !wsRefs.current[s.id]) {
        const ws = new WebSocket(wsUrl(`/ws/agent/${s.id}`));
        wsRefs.current[s.id] = ws;
        ws.onmessage = (e) => {
          const evt = JSON.parse(e.data);
          if (evt.type === 'progress') {
            setSessions(prev => prev.map(sess =>
              sess.id === s.id ? { ...sess, progress: evt.progress, current_step: evt.step } : sess
            ));
          } else if (evt.type === 'chunk') {
            setLogs(prev => ({
              ...prev,
              [s.id]: [...(prev[s.id] || []), evt.text].slice(-200)
            }));
          } else if (evt.type === 'done' || evt.type === 'error' || evt.type === 'cancelled') {
            fetchSessions();
            delete wsRefs.current[s.id];
          }
        };
        ws.onerror = () => delete wsRefs.current[s.id];
      }
    });
  }, [sessions]);

  const cancelAgent = async (id) => {
    await fetch(apiUrl(`/agents/${id}`), { method: 'DELETE' });
    fetchSessions();
  };

  const runningCount = sessions.filter(s => s.status === 'running').length;

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, width: 400, maxHeight: '70vh', background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, display: 'flex', flexDirection: 'column', zIndex: 10000, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 'bold', color: '#E5E7EB' }}>🤖 Agents</span>
          {runningCount > 0 && <span style={{ background: '#1D4ED8', fontSize: 10, padding: '2px 8px', borderRadius: 20, color: 'white' }}>{runningCount} running</span>}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 18, cursor: 'pointer' }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {loading && <div style={{ textAlign: 'center', color: '#6B7280', padding: 20 }}>Loading...</div>}
        {!loading && sessions.length === 0 && (
          <div style={{ textAlign: 'center', color: '#4B5563', padding: 20, fontSize: 12 }}>No agents yet. Start one from the prompt.</div>
        )}
        {sessions.map(s => {
          const st = STATUS[s.status] || STATUS.pending;
          const logsOpen = expanded[s.id];
          return (
            <div key={s.id} style={{ marginBottom: 8, background: st.bg, borderRadius: 8, border: `1px solid ${st.color}30`, overflow: 'hidden' }}>
              <div style={{ padding: '8px 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: st.dot }}></span>
                    <span style={{ fontSize: 11, fontWeight: 'bold', color: '#E5E7EB', fontFamily: 'monospace' }}>#{s.id?.slice(0,6) || 'unknown'}</span>
                    <span style={{ fontSize: 10, color: st.color }}>{st.label}</span>
                  </div>
                  <span style={{ fontSize: 10, color: '#6B7280' }}>{timeAgo(s.created_at)}</span>
                </div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.prompt?.slice(0, 60)}
                </div>
                {s.status === 'running' && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${s.progress || 0}%`, height: '100%', background: st.dot, transition: 'width 0.3s' }}></div>
                    </div>
                    <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>{s.current_step || 'Working...'}</div>
                  </div>
                )}
                {s.status === 'error' && s.error_message && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 4, padding: '4px 6px', fontSize: 10, color: '#FCA5A5', marginTop: 4 }}>
                    {s.error_message.slice(0, 120)}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  {s.status === 'running' && (
                    <button onClick={() => cancelAgent(s.id)} style={{ fontSize: 9, background: 'transparent', border: `1px solid ${st.color}`, color: st.color, padding: '2px 8px', borderRadius: 4, cursor: 'pointer' }}>Cancel</button>
                  )}
                  <button onClick={() => setExpanded(prev => ({ ...prev, [s.id]: !prev[s.id] }))} style={{ fontSize: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#9CA3AF', padding: '2px 8px', borderRadius: 4, cursor: 'pointer' }}>
                    {logsOpen ? 'Hide Log' : 'View Log'}
                  </button>
                </div>
                {logsOpen && (
                  <pre style={{ marginTop: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 4, padding: '4px 6px', fontSize: 9, fontFamily: 'monospace', color: '#6B7280', overflowX: 'auto', maxHeight: 100 }}>
                    {(logs[s.id] || []).join('') || 'No output yet...'}
                  </pre>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: 10, color: '#4B5563', textAlign: 'center' }}>
        Agents run in parallel. Start a new agent by typing a prompt and clicking Generate.
      </div>
    </div>
  );
}
