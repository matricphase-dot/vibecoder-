import React, { useState, useEffect, useRef, useCallback } from 'react';
import Analytics from './pages/Analytics';
import Editor from '@monaco-editor/react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { 
  FolderTree, FileCode, Terminal as TerminalIcon, 
  Play, GitBranch, Upload, Download, Mic, MicOff,
  Settings, Zap, CheckCircle, AlertCircle, Loader2,
  X, Maximize2, Minimize2, Plus, ChevronRight, ChevronDown,
  Copy, Check, Sparkles, Bug, TestTube, Rocket, Search, Shield
} from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import { motion, AnimatePresence } from 'framer-motion';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import AdminPanel from './pages/AdminPanel';
import SimpleModeUI from './pages/SimpleModeUI';
import DebugPanel from './components/DebugPanel';
import CompliancePanel from './components/CompliancePanel';

const WS_URL = 'ws://localhost:8000/ws';

function App() {
  if (window.location.pathname === '/analytics') {
    return <Analytics />;
  }

  // Route handling for Simple Mode
  if (window.location.pathname === '/simple') {
    return <SimpleModeUI />;
  }
  if (window.location.pathname === '/admin') {
    return <AdminPanel />;
  }

  // Core state
  const [connected, setConnected] = useState(false);
  const [files, setFiles] = useState({});
  const [currentFile, setCurrentFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('editor');
  const [previewHtml, setPreviewHtml] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [terminalReady, setTerminalReady] = useState(false);
  const [plan, setPlan] = useState('fast');
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [template, setTemplate] = useState('vanilla');
  const [isListening, setIsListening] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [refactoring, setRefactoring] = useState(false);
  const [refactorTarget, setRefactorTarget] = useState('typescript');
  const [selfHealingEnabled, setSelfHealingEnabled] = useState(true);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [showCompliancePanel, setShowCompliancePanel] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Refs
  const wsRef = useRef(null);
  const terminalRef = useRef(null);
  const termRef = useRef(null);
  const fitAddonRef = useRef(null);
  const editorRef = useRef(null);
  const suggestionTimeout = useRef(null);
  const lastCodeRef = useRef('');
  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);
  const terminalWsRef = useRef(null);
  const previewIframeRef = useRef(null);

  const addLog = (message, type = 'info') => {
    setLogs(prev => [...prev, { message, type, timestamp: new Date() }]);
  };

  // WebSocket (AI generation)
  useEffect(() => {
    const connect = () => {
      wsRef.current = new WebSocket(WS_URL);
      wsRef.current.onopen = () => {
        setConnected(true);
        addLog('Connected to backend', 'success');
      };
      wsRef.current.onclose = () => {
        setConnected(false);
        addLog('Disconnected, reconnecting...', 'error');
        setTimeout(connect, 3000);
      };
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };
    };
    connect();
    return () => wsRef.current?.close();
  }, []);

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'file':
        setFiles(prev => ({ ...prev, [data.path]: data.content }));
        if (!currentFile) setCurrentFile(data.path);
        addLog(`Generated: ${data.path}`, 'success');
        break;
      case 'log':
        addLog(data.message, 'info');
        break;
      case 'preview':
        setPreviewHtml(data.html);
        break;
      case 'error':
        addLog(data.message, 'error');
        break;
      case 'complete':
        setGenerating(false);
        addLog('Generation complete!', 'success');
        break;
    }
  };

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    addLog(`Generating: ${prompt} (Plan: ${plan})`, 'info');
    wsRef.current.send(JSON.stringify({
      type: 'generate',
      prompt: prompt,
      plan: plan,
      template: template
    }));
  };

  const handleSaveFile = () => {
    if (currentFile && fileContent !== files[currentFile]) {
      setFiles(prev => ({ ...prev, [currentFile]: fileContent }));
      addLog(`Saved: ${currentFile}`, 'success');
    }
  };

  const handleDeploy = () => {
    addLog('Deploying to Vercel...', 'info');
    fetch('http://localhost:8000/api/deploy/vercel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files })
    }).then(() => addLog('Deployed successfully!', 'success'))
      .catch(err => addLog(`Deploy failed: ${err}`, 'error'));
  };

  const handleExportZip = () => {
    window.open('http://localhost:8000/api/export/zip');
    addLog('Exporting ZIP...', 'info');
  };

  // Predictive pre‑fetch
  const fetchPrediction = async (code, cursorPos, language) => {
    if (!code.trim() || code.length < 10) return;
    try {
      const response = await fetch('http://localhost:8000/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_code: code, cursor_position: cursorPos, language })
      });
      const data = await response.json();
      setSuggestion(data.suggestion || '');
    } catch (err) {
      setSuggestion('');
    }
  };

  const handleEditorChange = (value) => {
    setFileContent(value);
    if (suggestionTimeout.current) clearTimeout(suggestionTimeout.current);
    const cursorPos = editorRef.current?.getPosition()?.column || 0;
    suggestionTimeout.current = setTimeout(() => {
      if (value !== lastCodeRef.current) {
        lastCodeRef.current = value;
        fetchPrediction(value, cursorPos, 'javascript');
      }
    }, 800);
  };

  useHotkeys('tab', (e) => {
    if (suggestion) {
      e.preventDefault();
      const newContent = fileContent + suggestion;
      setFileContent(newContent);
      setSuggestion('');
      editorRef.current?.setValue(newContent);
    }
  });

  // Voice commands
  const executeVoiceCommand = async (commandText) => {
    try {
      const response = await fetch('http://localhost:8000/api/voice/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: commandText,
          current_file: currentFile,
          selected_text: editorRef.current?.getModel()?.getValueInRange(editorRef.current.getSelection()) || ''
        })
      });
      const cmd = await response.json();
      switch(cmd.action) {
        case 'refactor':
          addLog(`Refactoring: ${cmd.target}`, 'info');
          setPrompt(`Refactor ${cmd.target}`);
          handleGenerate();
          break;
        case 'toggle_comment':
          editorRef.current?.trigger('keyboard', 'editor.action.commentLine');
          break;
        case 'run_tests':
          addLog('Running tests...', 'info');
          break;
        case 'deploy':
          handleDeploy();
          break;
        case 'git_commit':
          const msg = prompt('Commit message:');
          if (msg) fetch('http://localhost:8000/api/git/commit', { method: 'POST', body: JSON.stringify({ message: msg }), headers: { 'Content-Type': 'application/json' } });
          break;
        case 'git_checkout':
          addLog(`Switching to branch: ${cmd.branch}`, 'info');
          break;
        case 'open_file':
          const file = Object.keys(files).find(f => f.toLowerCase().includes(cmd.filename.toLowerCase()));
          if (file) { setCurrentFile(file); setFileContent(files[file]); }
          break;
        case 'undo':
          editorRef.current?.trigger('keyboard', 'undo');
          break;
        case 'save_all':
          Object.keys(files).forEach(f => { if (files[f] !== fileContent) handleSaveFile(); });
          break;
        case 'clear_console':
          setLogs([]);
          break;
        case 'stop_generation':
          setGenerating(false);
          wsRef.current?.send(JSON.stringify({ type: 'stop' }));
          break;
        case 'open_settings':
          setShowSettings(true);
          break;
        case 'show_help':
          addLog('Commands: refactor, comment, run tests, deploy, commit, switch to [branch], open [file], undo, save all, clear, stop, help', 'info');
          break;
        case 'generate':
          setPrompt(cmd.prompt);
          handleGenerate();
          break;
        default:
          addLog(`Unknown command: ${cmd.action}`, 'error');
      }
    } catch (err) {
      addLog(`Voice error: ${err}`, 'error');
    }
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      addLog('Voice not supported', 'error');
      return;
    }
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      const spoken = event.results[0][0].transcript;
      addLog(`You said: "${spoken}"`, 'info');
      executeVoiceCommand(spoken);
    };
    recognition.start();
  };

  // Semantic search
  const performSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const response = await fetch('http://localhost:8000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, n_results: 5 })
      });
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (err) {
      addLog(`Search error: ${err}`, 'error');
    }
    setSearching(false);
  };

  const openSearchResult = (filePath) => {
    if (files[filePath]) {
      setCurrentFile(filePath);
      setFileContent(files[filePath]);
    } else {
      addLog(`File not found: ${filePath}`, 'error');
    }
  };

  // Refactoring
  const performRefactor = async () => {
    if (!currentFile || !fileContent) {
      addLog('No file open to refactor', 'error');
      return;
    }
    setRefactoring(true);
    try {
      const response = await fetch('http://localhost:8000/api/refactor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: fileContent,
          source_lang: 'javascript',
          target_lang: refactorTarget,
          file_path: currentFile
        })
      });
      const data = await response.json();
      if (data.refactored_code) {
        setFileContent(data.refactored_code);
        if (data.file_path && data.file_path !== currentFile) {
          const newFiles = { ...files };
          delete newFiles[currentFile];
          newFiles[data.file_path] = data.refactored_code;
          setFiles(newFiles);
          setCurrentFile(data.file_path);
        } else {
          setFiles(prev => ({ ...prev, [currentFile]: data.refactored_code }));
        }
        addLog(`Refactored to ${refactorTarget}`, 'success');
      }
    } catch (err) {
      addLog(`Refactor failed: ${err}`, 'error');
    }
    setRefactoring(false);
  };

  // Self‑healing
  const triggerHeal = async (errorMsg, filePath) => {
    if (!selfHealingEnabled) return;
    try {
      const response = await fetch('http://localhost:8000/api/heal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: errorMsg, file: filePath })
      });
      const data = await response.json();
      if (data.fixed_code) {
        addLog(`🩺 Self‑healed ${filePath}`, 'success');
        setFiles(prev => ({ ...prev, [filePath]: data.fixed_code }));
        if (currentFile === filePath) setFileContent(data.fixed_code);
      }
    } catch (err) {
      addLog(`Self‑healing failed: ${err}`, 'error');
    }
  };

  const capturePreviewError = async (errorMsg, filePath) => {
    addLog(`🔴 Error detected: ${errorMsg}`, 'error');
    if (selfHealingEnabled) {
      await triggerHeal(errorMsg, filePath);
    }
  };

  // Yjs collaboration
  const initCollaboration = (editor) => {
    if (!editor || ydocRef.current) return;
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const provider = new WebsocketProvider('ws://localhost:1234', 'vibecoder-workspace', ydoc);
    providerRef.current = provider;
    const type = ydoc.getText('monaco');
    const binding = new MonacoBinding(type, editor.getModel(), new Set([editor]), provider);
    bindingRef.current = binding;
    provider.on('status', event => {
      addLog(`Collaboration ${event.status}`, event.status === 'connected' ? 'success' : 'info');
    });
  };

  // Real terminal
  const initRealTerminal = () => {
    if (!terminalRef.current || termRef.current) return;
    const term = new Terminal({ theme: { background: '#0D1117' }, cursorBlink: true });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();
    termRef.current = term;
    fitAddonRef.current = fitAddon;
    terminalWsRef.current = new WebSocket('ws://localhost:8000/terminal');
    terminalWsRef.current.onopen = () => {
      term.write('\r\n\x1b[32mConnected to VibeCoder terminal\x1b[0m\r\n$ ');
    };
    terminalWsRef.current.onmessage = (event) => {
      term.write(event.data);
      term.write('\r\n$ ');
    };
    terminalWsRef.current.onerror = () => {
      term.write('\r\n\x1b[31mTerminal error\x1b[0m\r\n$ ');
    };
    term.onData((data) => {
      if (data === '\r') {
        const line = term.buffer.active.getLine(term.buffer.active.cursorY);
        if (line) {
          let cmd = line.translateToString().replace(/^\$ /, '').trim();
          if (cmd && terminalWsRef.current?.readyState === WebSocket.OPEN) {
            terminalWsRef.current.send(cmd);
          }
        }
        term.write('\r\n');
      } else {
        term.write(data);
      }
    });
  };

  useEffect(() => {
    if (activeTab === 'terminal') {
      setTimeout(initRealTerminal, 100);
    }
    return () => {
      if (terminalWsRef.current) terminalWsRef.current.close();
      if (termRef.current) termRef.current.dispose();
      termRef.current = null;
    };
  }, [activeTab]);

  // Preview error listener
  useEffect(() => {
    const handleIframeMessage = (event) => {
      if (event.data && event.data.type === 'preview-error') {
        capturePreviewError(event.data.error, event.data.file || 'index.html');
      }
    };
    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, []);

  // Keyboard shortcuts
  useHotkeys('ctrl+s', () => handleSaveFile());
  useHotkeys('ctrl+p', () => setShowCommandPalette(true));
  useHotkeys('ctrl+shift+v', () => startListening());
  useHotkeys('ctrl+`', () => setActiveTab('terminal'));
  useHotkeys('ctrl+shift+p', () => setShowSettings(true));
  useHotkeys('ctrl+f', (e) => { e.preventDefault(); document.getElementById('search-input')?.focus(); });

  // File tree component
  const FileTree = ({ files, onSelect, currentFile }) => {
    const [expanded, setExpanded] = useState({});
    const toggle = (path) => setExpanded(prev => ({ ...prev, [path]: !prev[path] }));
    const renderTree = (obj, path = '') => {
      return Object.keys(obj).sort().map(key => {
        const fullPath = path ? `${path}/${key}` : key;
        const isDir = typeof obj[key] === 'object' && obj[key] !== null;
        if (isDir) {
          return (
            <div key={fullPath}>
              <div className="flex items-center gap-1 px-2 py-1 hover:bg-antigravity-tab cursor-pointer text-antigravity-text" onClick={() => toggle(fullPath)}>
                {expanded[fullPath] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <FolderTree size={14} />
                <span className="text-sm">{key}</span>
              </div>
              {expanded[fullPath] && <div className="ml-4">{renderTree(obj[key], fullPath)}</div>}
            </div>
          );
        } else {
          return (
            <div key={fullPath} className={`flex items-center gap-1 px-2 py-1 pl-6 hover:bg-antigravity-tab cursor-pointer text-antigravity-text ${currentFile === fullPath ? 'bg-antigravity-activeTab' : ''}`} onClick={() => onSelect(fullPath, obj[key])}>
              <FileCode size={14} />
              <span className="text-sm">{key}</span>
            </div>
          );
        }
      });
    };
    return <div className="h-full overflow-auto">{renderTree(files)}</div>;
  };

  // Mockup upload handler
  const handleMockupUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('http://localhost:8000/api/mockup/to-code', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.html) {
        setFiles(prev => ({ ...prev, ['mockup_output.html']: data.html }));
        setCurrentFile('mockup_output.html');
        setFileContent(data.html);
        addLog('Mockup converted to HTML', 'success');
      }
    } catch (err) {
      addLog(`Mockup failed: ${err}`, 'error');
    }
    setUploading(false);
  };

  // CI/CD generate
  const generateCICD = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/cicd/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_type: 'web', test_command: 'npm test', build_command: 'npm run build', deploy_target: 'vercel' })
      });
      const data = await response.json();
      addLog('CI/CD workflow generated: .github/workflows/deploy.yml', 'success');
    } catch (err) {
      addLog(`CI/CD failed: ${err}`, 'error');
    }
  };

  // Plugins state and functions
  const [plugins, setPlugins] = useState([]);
  const [loadingPlugins, setLoadingPlugins] = useState(false);
  const fetchPlugins = async () => {
    setLoadingPlugins(true);
    try {
      const res = await fetch('http://localhost:8000/api/plugins');
      const data = await res.json();
      setPlugins(data.plugins || []);
    } catch (err) {
      addLog(`Failed to load plugins: ${err}`, 'error');
    }
    setLoadingPlugins(false);
  };
  const installSamplePlugin = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/plugins/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: 'sample' })
      });
      const data = await res.json();
      addLog(`Plugin installed: ${data.plugin}`, 'success');
      fetchPlugins();
    } catch (err) {
      addLog(`Install failed: ${err}`, 'error');
    }
  };
  useEffect(() => {
    fetchPlugins();
  }, []);

  return (
    <div className="h-screen flex flex-col bg-antigravity-bg text-antigravity-text">
      {/* Command Palette */}
      <AnimatePresence>
        {showCommandPalette && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCommandPalette(false)}>
            <motion.div initial={{ y: -20 }} animate={{ y: 0 }} exit={{ y: -20 }} className="bg-antigravity-sidebar rounded-lg shadow-xl w-96 p-2" onClick={e => e.stopPropagation()}>
              <input autoFocus type="text" placeholder="Type a command..." className="w-full bg-antigravity-tab text-antigravity-text p-2 rounded outline-none" value={commandQuery} onChange={e => setCommandQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { if (commandQuery === 'save') handleSaveFile(); if (commandQuery === 'deploy') handleDeploy(); if (commandQuery === 'export') handleExportZip(); if (commandQuery === 'voice') startListening(); setShowCommandPalette(false); } }} />
              <div className="mt-2 max-h-48 overflow-auto">
                <div className="p-1 hover:bg-antigravity-tab cursor-pointer" onClick={() => { handleSaveFile(); setShowCommandPalette(false); }}>save</div>
                <div className="p-1 hover:bg-antigravity-tab cursor-pointer" onClick={() => { handleDeploy(); setShowCommandPalette(false); }}>deploy</div>
                <div className="p-1 hover:bg-antigravity-tab cursor-pointer" onClick={() => { handleExportZip(); setShowCommandPalette(false); }}>export</div>
                <div className="p-1 hover:bg-antigravity-tab cursor-pointer" onClick={() => { startListening(); setShowCommandPalette(false); }}>voice</div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panels (Compliance, Debug) */}
      {showCompliancePanel && (
        <div className="fixed right-0 top-20 w-96 bg-antigravity-sidebar border-l border-antigravity-border p-4 z-50 shadow-xl">
          <CompliancePanel existingCode={fileContent} onApplyFix={(code) => { setFileContent(code); setFiles(prev => ({...prev, [currentFile]: code})); }} />
          <button onClick={() => setShowCompliancePanel(false)} className="absolute top-2 right-2 text-gray-400">✕</button>
        </div>
      )}
      {showDebugPanel && (
        <div className="fixed right-0 top-20 w-96 bg-antigravity-sidebar border-l border-antigravity-border p-4 z-50 shadow-xl">
          <DebugPanel previewUrl="http://localhost:5173" onAutoFix={(error) => { setPrompt(`Fix: ${error}`); handleGenerate(); }} />
          <button onClick={() => setShowDebugPanel(false)} className="absolute top-2 right-2 text-gray-400">✕</button>
        </div>
      )}

      {/* Top Bar */}
      <div className="h-8 bg-antigravity-sidebar border-b border-antigravity-border flex items-center justify-between px-4 text-xs">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-antigravity-accent" />
          <span className="font-mono">VibeCoder</span>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={() => window.location.href = '/simple'} className="hover:text-antigravity-accent">✨ Simple Mode</button>
          <button onClick={() => window.location.href = '/admin'} className="hover:text-antigravity-accent"><Shield size={14} /></button>
          <button onClick={() => setShowCompliancePanel(!showCompliancePanel)} className="hover:text-antigravity-accent">🔒 Compliance</button>
          <button onClick={() => setShowDebugPanel(!showDebugPanel)} className="hover:text-antigravity-accent">🐞 Debug</button>
          <label className="cursor-pointer hover:text-antigravity-accent" title="Upload UI mockup (image)">
            <Upload size={14} />
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleMockupUpload} />
          </label>
          <button onClick={performRefactor} disabled={refactoring} className="hover:text-antigravity-accent" title="Refactor code">
            {refactoring ? <Loader2 size={14} className="animate-spin" /> : <Settings size={14} />}
          </button>
          <select value={refactorTarget} onChange={e => setRefactorTarget(e.target.value)} className="bg-antigravity-tab text-antigravity-text text-xs rounded px-1 py-0.5">
            <option value="typescript">→ TS</option>
            <option value="functional_component">→ Functional</option>
            <option value="class_component">→ Class</option>
          </select>
          <button onClick={generateCICD} className="hover:text-antigravity-accent" title="Generate CI/CD workflow">
            <GitBranch size={14} />
          </button>
          <button onClick={handleDeploy} className="hover:text-antigravity-accent"><Rocket size={14} /></button>
          <button onClick={handleExportZip} className="hover:text-antigravity-accent"><Download size={14} /></button>
          <label className="flex items-center gap-1 text-xs">
            <input type="checkbox" checked={selfHealingEnabled} onChange={e => setSelfHealingEnabled(e.target.checked)} />
            Auto‑heal
          </label>
        <button onClick={() => window.location.href = "/analytics"} className="hover:text-antigravity-accent">📊 Analytics</button></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-64 bg-antigravity-sidebar border-r border-antigravity-border flex flex-col">
            <div className="p-2 border-b border-antigravity-border flex justify-between">
              <span className="text-sm font-semibold">Explorer</span>
              <button onClick={() => setSidebarOpen(false)}><X size={14} /></button>
            </div>
            <div className="flex-1 overflow-auto">
              <FileTree files={files} onSelect={(path, content) => { setCurrentFile(path); setFileContent(content); }} currentFile={currentFile} />
            </div>
            <div className="p-2 border-t border-antigravity-border">
              <select value={template} onChange={e => setTemplate(e.target.value)} className="w-full bg-antigravity-tab text-antigravity-text p-1 rounded text-sm">
                <option value="vanilla">Vanilla HTML/CSS/JS</option>
                <option value="react">React</option>
                <option value="vue">Vue</option>
                <option value="svelte">Svelte</option>
              </select>
            </div>
            {/* Semantic Search UI */}
            <div className="p-2 border-t border-antigravity-border">
              <div className="relative">
                <input id="search-input" type="text" placeholder="🔍 Semantic search..." className="w-full bg-antigravity-tab text-antigravity-text p-1 rounded text-sm pl-6" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && performSearch()} />
                {searching && <Loader2 size={12} className="absolute left-1 top-2 animate-spin" />}
              </div>
              {searchResults.length > 0 && (
                <div className="mt-2 max-h-32 overflow-auto text-xs">
                  {searchResults.map((res, idx) => (
                    <div key={idx} className="p-1 hover:bg-antigravity-activeTab cursor-pointer truncate" onClick={() => openSearchResult(res.file)}>
                      📄 {res.file} – {res.snippet.substring(0, 50)}...
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Plugin Store */}
            <div className="p-2 border-t border-antigravity-border">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold">Plugins</span>
                <button onClick={installSamplePlugin} className="text-xs text-antigravity-accent hover:underline">+ Install Sample</button>
              </div>
              {loadingPlugins ? (
                <Loader2 size={12} className="animate-spin mx-auto mt-1" />
              ) : (
                <div className="mt-1 max-h-24 overflow-auto text-xs">
                  {plugins.length === 0 && <div className="text-gray-500">No plugins installed</div>}
                  {plugins.map(p => (
                    <div key={p.name} className="flex justify-between items-center py-0.5">
                      <span>{p.info.name}</span>
                      <span className="text-gray-400 text-[10px]">{p.info.version}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Editor/Preview/Terminal */}
        <div className="flex-1 flex flex-col">
          <div className="flex bg-antigravity-sidebar border-b border-antigravity-border">
            {['editor', 'preview', 'terminal'].map(tab => (
              <button key={tab} className={`px-4 py-1 text-sm ${activeTab === tab ? 'bg-antigravity-activeTab border-b-2 border-antigravity-accent' : 'hover:bg-antigravity-tab'}`} onClick={() => setActiveTab(tab)}>
                {tab === 'editor' && <FileCode size={14} className="inline mr-1" />}
                {tab === 'preview' && <Play size={14} className="inline mr-1" />}
                {tab === 'terminal' && <TerminalIcon size={14} className="inline mr-1" />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden">
            {activeTab === 'editor' && (
              <Editor 
                height="100%"
                language="javascript"
                theme="vs-dark"
                value={fileContent}
                onChange={handleEditorChange}
                onMount={(editor) => { editorRef.current = editor; initCollaboration(editor); }}
                options={{ fontSize: 13, minimap: { enabled: false } }}
              />
            )}
            {activeTab === 'preview' && (
              <div className="relative w-full h-full">
                <iframe ref={previewIframeRef} srcDoc={previewHtml} className="w-full h-full border-0" title="Preview" />
                <div className="absolute top-2 right-2 z-10">
                  <button onClick={() => setShowDebugPanel(!showDebugPanel)} className="bg-antigravity-tab px-2 py-1 rounded text-xs">🐞 Debug</button>
                </div>
              </div>
            )}
            {activeTab === 'terminal' && (
              <div ref={terminalRef} className="w-full h-full" />
            )}
          </div>
        </div>

        {/* Logs Panel */}
        <div className="w-80 bg-antigravity-sidebar border-l border-antigravity-border flex flex-col">
          <div className="p-2 border-b border-antigravity-border font-semibold text-sm">Console</div>
          <div className="flex-1 overflow-auto p-2 text-xs font-mono">
            {logs.map((log, i) => (
              <div key={i} className={`mb-1 ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : 'text-antigravity-text'}`}>
                [{log.timestamp.toLocaleTimeString()}] {log.message}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-antigravity-border bg-antigravity-sidebar p-2">
        <div className="flex gap-2 items-center">
          <button onClick={() => setShowPlanSelector(!showPlanSelector)} className="px-2 py-1 bg-antigravity-tab rounded text-xs">Plan: {plan}</button>
          {showPlanSelector && (
            <div className="absolute bottom-12 bg-antigravity-tab rounded shadow-lg p-1">
              {['fast', 'scalable', 'clean'].map(p => (
                <div key={p} className="px-2 py-1 hover:bg-antigravity-activeTab cursor-pointer" onClick={() => { setPlan(p); setShowPlanSelector(false); }}>{p}<button onClick={() => window.location.href = "/analytics"} className="hover:text-antigravity-accent">📊 Analytics</button></div>
              ))}
            </div>
          )}
          <input type="text" className="flex-1 bg-antigravity-bg border border-antigravity-border rounded px-3 py-1 text-sm focus:outline-none focus:border-antigravity-accent" placeholder="Ask anything, @ to mention, / for workflows, or click mic for voice commands" value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleGenerate()} />
          <button onClick={startListening} className={`p-2 rounded-full transition-all ${isListening ? 'bg-red-500 animate-pulse' : 'hover:bg-antigravity-tab'}`} title="Voice command (Ctrl+Shift+V)">
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <button onClick={handleGenerate} disabled={generating} className="bg-antigravity-accent text-white px-3 py-1 rounded text-sm flex items-center gap-1 disabled:opacity-50">
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Generate
          </button>
        </div>
        {suggestion && (
          <div className="text-xs text-gray-400 mt-1 pl-2">
            💡 Tab: {suggestion}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
