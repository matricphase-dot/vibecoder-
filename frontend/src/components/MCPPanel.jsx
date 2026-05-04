import { useState, useEffect } from 'react';
import { apiUrl } from '../config';

export default function MCPPanel({ onClose }) {
  const [servers, setServers] = useState([]);
  const [tools, setTools] = useState([]);
  const [newServer, setNewServer] = useState({ name: '', command: '', args: '' });
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      const [sRes, tRes] = await Promise.all([
        fetch(apiUrl('/mcp/servers')),
        fetch(apiUrl('/mcp/tools'))
      ]);
      const serversData = await sRes.json();
      const toolsData = await tRes.json();
      setServers(Array.isArray(serversData) ? serversData : []);
      setTools(Array.isArray(toolsData) ? toolsData : []);
      setError(null);
    } catch(e) {
      console.error('MCP fetch error:', e);
      setError(e.message);
      setServers([]);
      setTools([]);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const registerServer = async () => {
    const args = newServer.args.split(' ').filter(a => a);
    try {
      await fetch(apiUrl('/mcp/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newServer, args })
      });
      setNewServer({ name: '', command: '', args: '' });
      await fetchData();
    } catch(e) { alert('Register failed: ' + e.message); }
  };

  const deleteServer = async (name) => {
    try {
      await fetch(apiUrl(`/mcp/servers/${name}`), { method: 'DELETE' });
      await fetchData();
    } catch(e) { alert('Delete failed: ' + e.message); }
  };

  const callTool = async (server, tool) => {
    const args = prompt('Enter arguments as JSON (e.g., {"path":"."})');
    if (!args) return;
    try {
      const res = await fetch(apiUrl('/mcp/call'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server, tool, arguments: JSON.parse(args) })
      });
      const data = await res.json();
      alert(JSON.stringify(data, null, 2));
    } catch(e) { alert('Error: ' + e.message); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 20000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '80%', height: '80%', background: '#0C0B10', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: '#1E293B', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>🔌 MCP Servers & Tools</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {error && <div style={{ color: '#EF4444', marginBottom: 12 }}>Error: {error}</div>}
          <h3 style={{ color: '#e5e5e5', marginBottom: 8 }}>Register New Server</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input placeholder="Name" value={newServer.name} onChange={e => setNewServer({...newServer, name: e.target.value})} style={{ background: '#1e1e1e', border: '1px solid #333', color: 'white', padding: '6px', borderRadius: 4 }} />
            <input placeholder="Command (e.g., npx)" value={newServer.command} onChange={e => setNewServer({...newServer, command: e.target.value})} style={{ background: '#1e1e1e', border: '1px solid #333', color: 'white', padding: '6px', borderRadius: 4 }} />
            <input placeholder="Args (space separated)" value={newServer.args} onChange={e => setNewServer({...newServer, args: e.target.value})} style={{ background: '#1e1e1e', border: '1px solid #333', color: 'white', padding: '6px', borderRadius: 4 }} />
            <button onClick={registerServer} style={{ background: '#1D4ED8', border: 'none', padding: '6px 12px', borderRadius: 4, color: 'white', cursor: 'pointer' }}>Register</button>
          </div>
          <h3 style={{ color: '#e5e5e5', marginBottom: 8 }}>Active Servers</h3>
          {servers.map(s => (
            <div key={s.name} style={{ marginBottom: 16, background: '#1e1e1e', borderRadius: 8, padding: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ color: '#60A5FA' }}>{s.name}</strong>
                <button onClick={() => deleteServer(s.name)} style={{ background: '#DC2626', border: 'none', padding: '2px 8px', borderRadius: 4, color: 'white', fontSize: 11 }}>Delete</button>
              </div>
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>Command: {s.command} | Tools: {s.tools}</div>
            </div>
          ))}
          <h3 style={{ color: '#e5e5e5', marginBottom: 8 }}>Available Tools</h3>
          {tools.map(t => (
            <div key={`${t.server}-${t.name}`} style={{ marginBottom: 8, background: '#2d2d2d', borderRadius: 6, padding: 6 }}>
              <span style={{ fontWeight: 'bold', color: '#FBBF24' }}>{t.server}.{t.name}</span> – {t.description}
              <button onClick={() => callTool(t.server, t.name)} style={{ marginLeft: 12, background: '#1D4ED8', border: 'none', padding: '2px 8px', borderRadius: 4, color: 'white', fontSize: 10, cursor: 'pointer' }}>Call</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
