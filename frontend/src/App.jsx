import React, { useState, useEffect, useRef } from 'react';

const BACKEND_URL = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/ws';

function App() {
  const [connected, setConnected] = useState(false);
  const [files, setFiles] = useState({});
  const [currentFile, setCurrentFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('editor');
  const [previewHtml, setPreviewHtml] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [agents, setAgents] = useState([
    { name: 'Architect', status: 'wait', progress: 0 },
    { name: 'Planner', status: 'wait', progress: 0 },
    { name: 'Coder', status: 'wait', progress: 0 },
    { name: 'Reviewer', status: 'wait', progress: 0 },
    { name: 'Debugger', status: 'wait', progress: 0 }
  ]);
  const wsRef = useRef(null);
  const terminalRef = useRef(null);
  const termRef = useRef(null);
  const terminalWsRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'file') {
        setFiles(prev => ({ ...prev, [data.path]: data.content }));
        if (!currentFile) setCurrentFile(data.path);
        setLogs(prev => [...prev, `✅ Generated: ${data.path}`]);
        setAgents(prev => prev.map(a => a.name === 'Coder' ? { ...a, status: 'done', progress: 100 } : a));
      } else if (data.type === 'agent') {
        setAgents(prev => prev.map(a => a.name === data.agent ? { ...a, status: 'running', progress: data.progress || 50 } : a));
      } else if (data.type === 'complete') {
        setGenerating(false);
        setAgents(prev => prev.map(a => ({ ...a, status: 'done', progress: 100 })));
      } else if (data.type === 'preview') {
        setPreviewHtml(data.html);
      } else if (data.type === 'log') {
        setLogs(prev => [...prev, data.message]);
      } else if (data.type === 'error') {
        setLogs(prev => [...prev, `❌ ${data.message}`]);
        setGenerating(false);
      }
    };
    wsRef.current = ws;
    return () => ws.close();
  }, []);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setLogs(prev => [...prev, `🚀 Starting: ${prompt}`]);
    setAgents(prev => prev.map(a => (a.name === 'Architect' ? { ...a, status: 'running', progress: 20 } : { ...a, status: 'wait', progress: 0 })));
    wsRef.current.send(JSON.stringify({ type: 'generate', prompt, plan: 'fast', template: 'react' }));
    let step = 1;
    const steps = ['Architect', 'Planner', 'Coder', 'Reviewer', 'Debugger'];
    const interval = setInterval(() => {
      if (step < steps.length) {
        setAgents(prev => prev.map(a => a.name === steps[step] ? { ...a, status: 'running', progress: 20 + step * 20 } : a));
        step++;
      } else clearInterval(interval);
    }, 1500);
  };

  const handleVoice = () => {
    if (!('webkitSpeechRecognition' in window)) { alert('Voice not supported'); return; }
    const recog = new webkitSpeechRecognition();
    recog.onstart = () => setIsListening(true);
    recog.onend = () => setIsListening(false);
    recog.onresult = async (e) => {
      const spoken = e.results[0][0].transcript;
      setPrompt(spoken);
      const res = await fetch(`${BACKEND_URL}/voice/command`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: spoken }) });
      const cmd = await res.json();
      if (cmd.action === 'generate') handleGenerate();
      else if (cmd.action === 'deploy') handleDeploy();
      else if (cmd.action === 'git_commit') handleCommit();
    };
    recog.start();
  };

  const handleCommit = async () => {
    const msg = prompt('Commit message:');
    if (!msg) return;
    await fetch(`${BACKEND_URL}/git/commit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg }) });
    alert('Committed');
  };

  const handleDeploy = async () => {
    const res = await fetch(`${BACKEND_URL}/deploy`, { method: 'POST' });
    const data = await res.json();
    alert(`Deployed: ${data.url || 'https://your-app.vercel.app'}`);
  };

  const handleExportZip = async () => {
    const res = await fetch(`${BACKEND_URL}/export/zip`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'project.zip'; a.click();
  };

  // Terminal initialization (simplified for now)
  useEffect(() => {
    if (activeTab === 'terminal' && terminalRef.current && !termRef.current) {
      import('@xterm/xterm').then(({ Terminal }) => {
        import('@xterm/addon-fit').then(({ FitAddon }) => {
          const term = new Terminal({ theme: { background: '#0C0B10', cursor: '#FFF' }, cursorBlink: true });
          const fitAddon = new FitAddon();
          term.loadAddon(fitAddon);
          term.open(terminalRef.current);
          fitAddon.fit();
          termRef.current = term;
          const ws = new WebSocket(`${BACKEND_URL.replace(/^http/, 'ws')}/terminal`);
          terminalWsRef.current = ws;
          ws.onopen = () => term.write('\r\n\x1b[32mConnected\x1b[0m\r\n$ ');
          ws.onmessage = (e) => { term.write(e.data); term.write('\r\n$ '); };
          term.onData(data => {
            if (data === '\r') {
              const line = term.buffer.active.getLine(term.buffer.active.cursorY);
              if (line) {
                let cmd = line.translateToString().replace(/^\$ /, '').trim();
                if (cmd && ws.readyState === WebSocket.OPEN) ws.send(cmd);
              }
              term.write('\r\n');
            } else term.write(data);
          });
        });
      });
    }
    return () => {
      if (terminalWsRef.current) terminalWsRef.current.close();
      if (termRef.current) termRef.current.dispose();
      termRef.current = null;
    };
  }, [activeTab]);

  const renderFileTree = (obj, path = '') => {
    const [expanded, setExpanded] = useState({});
    const toggle = (p) => setExpanded(prev => ({ ...prev, [p]: !prev[p] }));
    const render = (obj, path = '') => {
      return Object.keys(obj).sort().map(key => {
        const fullPath = path ? `${path}/${key}` : key;
        const isDir = typeof obj[key] === 'object' && obj[key] !== null;
        if (isDir) {
          return (
            <div key={fullPath}>
              <div onClick={() => toggle(fullPath)} style={{ padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {expanded[fullPath] ? '📂' : '📁'} {key}
              </div>
              {expanded[fullPath] && <div style={{ marginLeft: '16px' }}>{render(obj[key], fullPath)}</div>}
            </div>
          );
        }
        return (
          <div key={fullPath} onClick={() => { setCurrentFile(fullPath); setFileContent(obj[key]); }} style={{ padding: '4px 8px', paddingLeft: '24px', cursor: 'pointer', background: currentFile === fullPath ? '#1E1E24' : 'transparent' }}>
            📄 {key}
          </div>
        );
      });
    };
    return render(obj, path);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0C0B10', color: '#FFFFFF', fontFamily: 'system-ui' }}>
      {/* Header */}
      <div style={{ height: '52px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#FF3B5C' }}>VC</span>
          <span style={{ fontWeight: '600' }}>VibeCoder</span>
        </div>
        <div style={{ flex: 1, maxWidth: '540px', margin: '0 16px' }}>
          <textarea rows="1" placeholder="Describe what to build... (Ctrl+Enter)" value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => e.ctrlKey && e.key === 'Enter' && handleGenerate()} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', padding: '8px 16px', color: '#FFF', resize: 'none' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={handleVoice} style={{ background: isListening ? '#FF3B5C' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', color: '#FFF' }}>🎤</button>
          <button onClick={handleGenerate} disabled={generating} style={{ background: '#FF3B5C', border: 'none', borderRadius: '8px', padding: '6px 16px', cursor: 'pointer', color: '#FFF', fontWeight: 'bold' }}>
            {generating ? '⏳' : '✨'} Generate
          </button>
          <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ fontSize: '10px', fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: connected ? '#00C853' : '#FF3B5C', marginRight: '6px' }}></span>
            ollama/codellama
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ width: '240px', background: '#0E0D14', borderRight: '1px solid rgba(255,255,255,0.05)', overflowY: 'auto', padding: '8px 0' }}>
          <div style={{ padding: '8px 12px', fontWeight: 'bold', fontSize: '10px', letterSpacing: '1px', color: '#888' }}>WORKSPACE</div>
          {renderFileTree(files)}
        </div>

        {/* Editor / Preview / Terminal */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0 12px' }}>
            {['editor', 'preview', 'terminal'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: activeTab === tab ? '#FF3B5C' : '#888', cursor: 'pointer', borderBottom: activeTab === tab ? '2px solid #FF3B5C' : 'none' }}>
                {tab === 'editor' ? 'Editor' : tab === 'preview' ? 'Preview' : 'Terminal'}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {activeTab === 'editor' && (
              <textarea value={fileContent} onChange={e => setFileContent(e.target.value)} style={{ width: '100%', height: '100%', background: '#090812', border: 'none', padding: '16px', fontFamily: 'monospace', color: '#FFF', resize: 'none' }} />
            )}
            {activeTab === 'preview' && (
              <iframe srcDoc={previewHtml || files['index.html'] || '<div style="padding:20px;background:white">Generate an app to see preview</div>'} style={{ width: '100%', height: '100%', border: 'none' }} title="Preview" />
            )}
            {activeTab === 'terminal' && <div ref={terminalRef} style={{ width: '100%', height: '100%' }} />}
          </div>
        </div>

        {/* Console */}
        <div style={{ width: '280px', background: '#0E0D14', borderLeft: '1px solid rgba(255,255,255,0.05)', overflowY: 'auto', padding: '12px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Console</div>
          {logs.map((log, i) => <div key={i} style={{ fontFamily: 'monospace', fontSize: '11px', marginBottom: '4px', borderLeft: '2px solid #FF3B5C', paddingLeft: '8px' }}>{log}</div>)}
        </div>
      </div>

      {/* Agent strip */}
      <div style={{ height: '32px', background: '#080710', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px', padding: '0 16px', overflowX: 'auto' }}>
        <span style={{ fontSize: '9px', fontWeight: 'bold', letterSpacing: '1px', color: '#555' }}>AGENTS</span>
        {agents.map(agent => (
          <div key={agent.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 8px', borderRadius: '12px', background: agent.status === 'running' ? 'rgba(26,86,255,0.1)' : agent.status === 'done' ? 'rgba(0,200,83,0.1)' : 'transparent', fontSize: '10px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: agent.status === 'running' ? '#1A56FF' : agent.status === 'done' ? '#00C853' : '#555', animation: agent.status === 'running' ? 'pulse 1s infinite' : 'none' }}></div>
            {agent.name}
            {agent.status === 'running' && <span style={{ fontSize: '9px' }}>{agent.progress}%</span>}
            {agent.status === 'done' && <span>✓</span>}
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div style={{ height: '40px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', padding: '0 16px', background: '#0E0D14' }}>
        <button onClick={handleCommit} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer', color: '#FFF' }}>Commit</button>
        <button onClick={handleDeploy} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer', color: '#FFF' }}>Deploy</button>
        <button onClick={handleExportZip} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer', color: '#FFF' }}>Export ZIP</button>
      </div>
    </div>
  );
}

export default App;
