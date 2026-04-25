import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { 
  FolderTree, FileCode, Terminal as TerminalIcon, Play, 
  Mic, MicOff, Settings, Zap, Loader2, X, ChevronRight, ChevronDown,
  Sparkles, Rocket, Download
} from 'lucide-react';

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const wsRef = useRef(null);
  const terminalRef = useRef(null);
  const termRef = useRef(null);
  const fitAddonRef = useRef(null);
  const editorRef = useRef(null);

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [...prev, { message: msg, type, timestamp: new Date() }]);
  };

  useEffect(() => {
    const connect = () => {
      wsRef.current = new WebSocket(WS_URL);
      wsRef.current.onopen = () => { setConnected(true); addLog('Connected', 'success'); };
      wsRef.current.onclose = () => { setConnected(false); addLog('Reconnecting...', 'error'); setTimeout(connect, 3000); };
      wsRef.current.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'file') {
          setFiles(prev => ({ ...prev, [data.path]: data.content }));
          if (!currentFile) setCurrentFile(data.path);
          addLog(`Generated: ${data.path}`, 'success');
        } else if (data.type === 'preview') setPreviewHtml(data.html);
        else if (data.type === 'complete') setGenerating(false);
        else if (data.type === 'log') addLog(data.message, 'info');
      };
    };
    connect();
    return () => wsRef.current?.close();
  }, []);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    wsRef.current.send(JSON.stringify({ type: 'generate', prompt, plan: 'fast', template: 'vanilla' }));
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) return;
    const recog = new webkitSpeechRecognition();
    recog.onstart = () => setIsListening(true);
    recog.onend = () => setIsListening(false);
    recog.onresult = (e) => setPrompt(e.results[0][0].transcript);
    recog.start();
  };

  // Terminal init (simplified)
  useEffect(() => {
    if (activeTab === 'terminal' && terminalRef.current && !termRef.current) {
      const term = new Terminal({ theme: { background: '#0F0F12' }, cursorBlink: true });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(terminalRef.current);
      fit.fit();
      termRef.current = term;
      fitAddonRef.current = fit;
      term.write('$ ');
    }
  }, [activeTab]);

  const FileTree = ({ files, onSelect, currentFile }) => {
    const [expanded, setExpanded] = useState({});
    const toggle = (p) => setExpanded(prev => ({ ...prev, [p]: !prev[p] }));
    const render = (obj, path = '') => Object.keys(obj).sort().map(k => {
      const full = path ? `${path}/${k}` : k;
      const isDir = typeof obj[k] === 'object';
      if (isDir) return (
        <div key={full}>
          <div className="flex items-center gap-1 px-2 py-1 hover:bg-gray-800 cursor-pointer" onClick={() => toggle(full)}>
            {expanded[full] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <FolderTree size={14} /><span>{k}</span>
          </div>
          {expanded[full] && <div className="ml-4">{render(obj[k], full)}</div>}
        </div>
      );
      return (
        <div key={full} className={`flex items-center gap-1 px-2 py-1 pl-6 hover:bg-gray-800 cursor-pointer ${currentFile === full ? 'bg-gray-700' : ''}`} onClick={() => onSelect(full, obj[k])}>
          <FileCode size={14} /><span>{k}</span>
        </div>
      );
    });
    return <div className="h-full overflow-auto">{render(files)}</div>;
  };

  return (
    <div className="h-screen flex flex-col bg-[#0F0F12] text-gray-200">
      {/* Top Bar */}
      <div className="h-10 bg-[#15161A] border-b border-gray-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-blue-400" />
          <span className="font-mono">VibeCoder</span>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
        </div>
        <div className="flex gap-2">
          <button onClick={startListening} className={`p-1 rounded ${isListening ? 'bg-red-500' : 'hover:bg-gray-800'}`}>
            {isListening ? <MicOff size={14} /> : <Mic size={14} />}
          </button>
          <button onClick={handleGenerate} disabled={generating} className="bg-blue-600 px-3 py-1 rounded text-sm flex items-center gap-1">
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Generate
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {sidebarOpen && (
          <div className="w-64 bg-[#15161A] border-r border-gray-800 flex flex-col">
            <div className="p-2 border-b flex justify-between">
              <span>Explorer</span>
              <button onClick={() => setSidebarOpen(false)}><X size={14} /></button>
            </div>
            <div className="flex-1 overflow-auto">
              <FileTree files={files} onSelect={(p,c) => { setCurrentFile(p); setFileContent(c); }} currentFile={currentFile} />
            </div>
          </div>
        )}
        <div className="flex-1 flex flex-col">
          <div className="flex border-b border-gray-800">
            {['editor','preview','terminal'].map(tab => (
              <button key={tab} className={`px-4 py-1 text-sm ${activeTab === tab ? 'bg-[#2A2B30] border-b-2 border-blue-500' : 'hover:bg-gray-800'}`} onClick={() => setActiveTab(tab)}>
                {tab === 'editor' && <FileCode size={14} className="inline mr-1" />}
                {tab === 'preview' && <Play size={14} className="inline mr-1" />}
                {tab === 'terminal' && <TerminalIcon size={14} className="inline mr-1" />}
                {tab}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden">
            {activeTab === 'editor' && <Editor height="100%" language="javascript" theme="vs-dark" value={fileContent} onChange={setFileContent} onMount={e => editorRef.current=e} options={{ fontSize:13, minimap:{enabled:false} }} />}
            {activeTab === 'preview' && <iframe srcDoc={previewHtml} className="w-full h-full border-0" title="Preview" />}
            {activeTab === 'terminal' && <div ref={terminalRef} className="w-full h-full" />}
          </div>
        </div>
        <div className="w-80 bg-[#15161A] border-l border-gray-800 flex flex-col">
          <div className="p-2 border-b">Console</div>
          <div className="flex-1 overflow-auto p-2 text-xs font-mono">
            {logs.map((log,i) => <div key={i} className={`mb-1 ${log.type==='error'?'text-red-400':log.type==='success'?'text-green-400':'text-gray-300'}`}>[{log.timestamp.toLocaleTimeString()}] {log.message}</div>)}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800 bg-[#15161A] p-2">
        <div className="flex gap-2">
          <input type="text" className="flex-1 bg-black border border-gray-700 rounded px-3 py-1 text-sm" placeholder="Ask anything..." value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleGenerate()} />
          <button onClick={startListening} className={`p-2 rounded-full ${isListening?'bg-red-500':'hover:bg-gray-800'}`}>{isListening?<MicOff size={18}/>:<Mic size={18}/>}</button>
          <button onClick={handleGenerate} disabled={generating} className="bg-blue-600 px-4 py-1 rounded">{generating?<Loader2 className="animate-spin"/>:<Sparkles/>} Generate</button>
        </div>
      </div>
    </div>
  );
}
export default App;
