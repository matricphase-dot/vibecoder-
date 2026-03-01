import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Sparkles, Terminal, Zap, Globe, Eye, History, 
  Send, Play, Bug, Code, RefreshCw, Clipboard, 
  Search, Rocket, LogOut, User, Settings, Moon, Sun,
  Github, Download, Share2, X, ChevronRight, 
  Activity, Cpu, Shield, ZapOff, CheckCircle, AlertCircle,
  PlayCircle, PauseCircle, Loader2
} from 'lucide-react';
import { io } from 'socket.io-client';
import { WorkflowBuilder } from './components/WorkflowBuilder';

// API base URL from environment
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace(/^http/, 'ws') + '/ws'
  : 'ws://localhost:8000/ws';

// Agent icons with animation
const agentIcons = {
  planner: <Cpu className="w-4 h-4" />,
  coder: <Code className="w-4 h-4" />,
  debugger: <Search className="w-4 h-4" />,
  reviewer: <Shield className="w-4 h-4" />,
  deployer: <Rocket className="w-4 h-4" />
};

// Status indicator with pulse animation
function StatusIndicator({ status }) {
  const colors = {
    idle: 'bg-gray-500',
    working: 'bg-yellow-500 animate-pulse',
    done: 'bg-green-500'
  };
  const className = `w-2 h-2 rounded-full ${colors[status]} shadow-lg`;
  return <div className={className} />;
}

function AgentStatus({ agent }) {
  return (
    <div className="group relative flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300">
      <span className="text-gray-300 group-hover:text-purple-400 transition-colors">{agent.icon}</span>
      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{agent.name}</span>
      <StatusIndicator status={agent.status} />
    </div>
  );
}

function ProjectItem({ project, onLoad, onJoin, onGitHub, onDownload }) {
  const [hover, setHover] = useState(false);
  const projId = extractProjectId(project.url);

  return (
    <div
      className="group relative flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-gray-800/40 to-gray-900/40 backdrop-blur-sm border border-gray-700/50 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 cursor-pointer"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onLoad(project.url)}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-200 truncate group-hover:text-purple-400 transition-colors">{project.task}</p>
        <p className="text-xs text-gray-500">{new Date(project.timestamp).toLocaleDateString()}</p>
      </div>
      <div className={`flex gap-1 transition-all duration-300 ${hover ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'}`}>
        <button
          onClick={(e) => { e.stopPropagation(); onJoin(projId); }}
          className="p-1.5 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition"
          title="Collaborate"
        >
          <Share2 size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onGitHub(project); }}
          className="p-1.5 rounded-md bg-gray-600/10 hover:bg-gray-600/20 text-gray-400 transition"
          title="Push to GitHub"
        >
          <Github size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDownload(projId); }}
          className="p-1.5 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 transition"
          title="Download ZIP"
        >
          <Download size={14} />
        </button>
      </div>
    </div>
  );
}

function extractProjectId(url) {
  const match = url.match(/\/projects\/([^/]+)/);
  return match ? match[1] : null;
}

export default function MainApp() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [files, setFiles] = useState({});
  const [activeFile, setActiveFile] = useState('index.html');
  const [agents, setAgents] = useState([
    { name: 'Planner', status: 'idle', icon: agentIcons.planner },
    { name: 'Coder', status: 'idle', icon: agentIcons.coder },
    { name: 'Debugger', status: 'idle', icon: agentIcons.debugger },
    { name: 'Reviewer', status: 'idle', icon: agentIcons.reviewer },
    { name: 'Deployer', status: 'idle', icon: agentIcons.deployer }
  ]);
  const [testResults, setTestResults] = useState(null);
  const [fixing, setFixing] = useState(false);
  const [preferencesModalOpen, setPreferencesModalOpen] = useState(false);
  const [dashboardModalOpen, setDashboardModalOpen] = useState(false);
  const [allProjects, setAllProjects] = useState([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [githubModalOpen, setGithubModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [repoName, setRepoName] = useState('');
  const [repoPrivate, setRepoPrivate] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [collabEnabled, setCollabEnabled] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [isListening, setIsListening] = useState(false);
  const [template, setTemplate] = useState('vanilla');
  const [model, setModel] = useState(localStorage.getItem('model') || 'groq');
  const [showDiff, setShowDiff] = useState(false);
  const [diffData, setDiffData] = useState(null);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [workflows, setWorkflows] = useState([]);
  const [currentWorkflow, setCurrentWorkflow] = useState(null);

  const ws = useRef(null);
  const previewRef = useRef(null);

  // Load projects and user on mount
  useEffect(() => {
    loadProjects();
    if (token) fetchUser();
    return () => {
      if (ws.current) ws.current.close();
    };
  }, [token]);

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/projects/list`, { headers });
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err) {
      console.error('Failed to load projects', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const addLog = (message) => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: message }]);
  };

  const updateAgentStatus = (agentName, status) => {
    setAgents(prev => prev.map(a => a.name === agentName ? { ...a, status } : a));
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setLogs([]);
    setResult(null);
    setPreviewUrl(null);
    setFiles({});

    ws.current = new WebSocket(WS_URL);
    
    ws.current.onopen = () => {
      addLog('Connected to server');
      ws.current.send(JSON.stringify({ prompt, template, token }));
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      addLog(data.message);
      
      if (data.type === 'plan') {
        updateAgentStatus('Planner', 'done');
        updateAgentStatus('Coder', 'working');
      } else if (data.type === 'files') {
        setFiles(data.files);
        updateAgentStatus('Coder', 'done');
        updateAgentStatus('Debugger', 'working');
      } else if (data.type === 'verification' && data.results) {
        setTestResults(data.results);
        updateAgentStatus('Debugger', 'done');
        if (!data.results.passed) {
          updateAgentStatus('Reviewer', 'working');
        }
      } else if (data.type === 'complete') {
        setResult(data);
        setPreviewUrl(data.url);
        updateAgentStatus('Reviewer', 'done');
        updateAgentStatus('Deployer', 'working');
        setIsGenerating(false);
        ws.current.close();
        loadProjects();
      } else if (data.type === 'error') {
        addLog(`? Error: ${data.message}`);
        setIsGenerating(false);
      }
    };

    ws.current.onerror = (error) => {
      addLog(`WebSocket error: ${error.message}`);
      setIsGenerating(false);
    };

    ws.current.onclose = () => {
      addLog('Disconnected');
      updateAgentStatus('Deployer', 'done');
    };
  };

  const loadProject = (url) => {
    setPreviewUrl(url);
  };

  const deployProject = async (projectId, task) => {
    try {
      const res = await fetch(`${API_BASE}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, project_name: task.replace(/\s+/g, '-').toLowerCase() })
      });
      const data = await res.json();
      if (data.url) {
        alert(`? Deployed to ${data.url}`);
        loadProjects();
      } else {
        alert(`? Deployment failed: ${data.error}`);
      }
    } catch (err) {
      alert('Deployment request failed');
    }
  };

  const handleEditorChange = (value) => {
    setFiles(prev => ({ ...prev, [activeFile]: value }));
    if (socket && roomId) {
      socket.emit('code_change', {
        room_id: roomId,
        filename: activeFile,
        content: value
      });
    }
  };

  const loadAllProjects = async () => {
    setLoadingDashboard(true);
    try {
      const res = await fetch(`${API_BASE}/projects/list`);
      const data = await res.json();
      setAllProjects(data.projects || []);
    } catch (err) {
      console.error('Failed to load projects', err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const downloadProject = (projectId) => {
    window.open(`${API_BASE}/export/${projectId}`, '_blank');
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setPrompt(transcript);
    };
    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };
    recognition.start();
  };

  const fixFailure = async (testDescription) => {
    if (!result) return;
    setFixing(true);
    try {
      const res = await fetch(`${API_BASE}/debug`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: result.project_id,
          test_description: testDescription
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.diffs) {
          setDiffData(data.diffs);
          setShowDiff(true);
        } else {
          alert(`? Fixed files: ${data.fixed_files.join(', ')}`);
          loadProject(result.url);
        }
      } else {
        alert(`? Fix failed: ${data.message || 'Unknown error'}`);
      }
    } catch (err) {
      alert('Fix request failed');
    } finally {
      setFixing(false);
    }
  };

  const toggleCollab = () => {
    setCollabEnabled(!collabEnabled);
  };

  const joinRoom = (projectId) => {
    if (!socket) return;
    socket.emit('join_room', { room_id: projectId });
    setRoomId(projectId);
    addLog(`?? Joining room ${projectId}...`);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const savePreference = async (key, value) => {
    try {
      await fetch(`${API_BASE}/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
      loadPreferences();
    } catch (err) {
      console.error('Failed to save preference', err);
    }
  };

  const loadPreferences = async () => {
    try {
      const res = await fetch(`${API_BASE}/preferences`);
      const data = await res.json();
      // setPreferences(data);
    } catch (err) {
      console.error('Failed to load preferences', err);
    }
  };

  const saveModel = (newModel) => {
    setModel(newModel);
    localStorage.setItem('model', newModel);
    savePreference('model', newModel);
  };

  const pushToGithub = async () => {
    if (!selectedProject) return;
    setPushing(true);
    try {
      const res = await fetch(`${API_BASE}/github/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: extractProjectId(selectedProject.url),
          repo_name: repoName || `vibecoder-${extractProjectId(selectedProject.url)}`,
          private: repoPrivate,
          description: selectedProject.task
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`? Pushed to GitHub: ${data.repo_url}`);
        setGithubModalOpen(false);
      } else {
        alert(`? Push failed: ${data.error}`);
      }
    } catch (err) {
      alert('Push request failed');
    } finally {
      setPushing(false);
    }
  };

  // Collaboration socket
  useEffect(() => {
    if (!collabEnabled) return;
    const newSocket = io(API_BASE, { path: '/collab/socket.io' });
    setSocket(newSocket);
    newSocket.on('connect', () => {
      console.log('Connected to collaboration server');
      addLog('?? Collaboration connected');
    });
    newSocket.on('room_joined', (data) => {
      setRoomId(data.room_id);
      addLog(`?? Joined room: ${data.room_id}`);
    });
    newSocket.on('code_update', (data) => {
      if (data.sender !== newSocket.id) {
        setFiles(prev => ({ ...prev, [data.filename]: data.content }));
        addLog(`?? Received update for ${data.filename}`);
      }
    });
    newSocket.on('disconnect', () => {
      addLog('?? Collaboration disconnected');
    });
    return () => newSocket.close();
  }, [collabEnabled]);

  // Auth functions
  const fetchUser = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        localStorage.removeItem('token');
        setToken(null);
      }
    } catch (err) {
      console.error('Failed to fetch user', err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    const formData = new URLSearchParams();
    formData.append('username', authUsername);
    formData.append('password', authPassword);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.access_token);
        setToken(data.access_token);
        setAuthModalOpen(false);
        setAuthUsername('');
        setAuthPassword('');
        setAuthEmail('');
      } else {
        alert(data.detail || 'Login failed');
      }
    } catch (err) {
      alert('Login request failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: authUsername,
          password: authPassword,
          email: authEmail
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Registration successful! Please log in.');
        setAuthMode('login');
        setAuthUsername('');
        setAuthPassword('');
        setAuthEmail('');
      } else {
        alert(data.detail || 'Registration failed');
      }
    } catch (err) {
      alert('Registration request failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  // Workflow functions
  const loadWorkflows = async () => {
    try {
      const res = await fetch(`${API_BASE}/workflows`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      setWorkflows(data.workflows || []);
    } catch (err) {
      console.error('Failed to load workflows', err);
    }
  };

  const saveWorkflow = async (workflow) => {
    try {
      const res = await fetch(`${API_BASE}/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(workflow)
      });
      if (res.ok) {
        alert('Workflow saved!');
        loadWorkflows();
      } else {
        alert('Failed to save workflow');
      }
    } catch (err) {
      alert('Error saving workflow');
    }
  };

  const examples = [
    "Build a counter app with plus/minus buttons",
    "Create a todo list with local storage",
    "Make a weather dashboard with mock data",
    "Build a markdown preview editor"
  ];

  return (
    <div className={`h-screen flex flex-col ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
      {/* Animated background gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -inset-[10px] opacity-50">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>
      </div>

      {/* Header */}
      <header className={`relative z-10 border-b ${theme === 'dark' ? 'border-gray-800/50 bg-gray-900/30' : 'border-gray-200/50 bg-white/30'} backdrop-blur-xl p-4 flex items-center justify-between`}>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent bg-[length:200%] animate-gradient">
            VibeCoder
          </h1>
          {isGenerating && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Building...</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* User section */}
                    <div className="flex items-center gap-2">
            {user && (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                  <User className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-gray-300">{user.username}</span>
                </div>
                <button
                  onClick={() => setShowWorkspaceModal(true)}
                  className="p-2 rounded-full hover:bg-gray-800/50 text-gray-400 transition"
                  title="Create Workspace"
                >
                  <Users className="w-5 h-5" />
                </button>
                <select
                  value={currentWorkspace?.id}
                  onChange={(e) => {
                    const ws = workspaces.find(w => w.id === parseInt(e.target.value));
                    setCurrentWorkspace(ws);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm border ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700/50 text-white' : 'bg-white/50 border-gray-200/50 text-gray-900'} backdrop-blur-sm focus:ring-2 focus:ring-purple-500`}
                >
                  {workspaces.map(ws => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </select>
              </>
            )}
          </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all"
            >
              Sign In
            </button>
          )}

          {/* Action buttons */}
          <button
            onClick={toggleCollab}
            className={`p-2 rounded-full transition-all ${collabEnabled ? 'bg-green-500/20 text-green-400' : 'hover:bg-gray-800/50 text-gray-400'}`}
            title={collabEnabled ? 'Collaboration On' : 'Collaboration Off'}
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button
            onClick={startListening}
            className={`p-2 rounded-full transition-all ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'hover:bg-gray-800/50 text-gray-400'}`}
            title="Voice input"
          >
            <Sparkles className="w-5 h-5" />
          </button>
          <button
            onClick={() => { setDashboardModalOpen(true); loadAllProjects(); }}
            className="p-2 rounded-full hover:bg-gray-800/50 text-gray-400 transition-all"
            title="Deployment Dashboard"
          >
            <Globe className="w-5 h-5" />
          </button>
          <button
            onClick={() => setPreferencesModalOpen(true)}
            className="p-2 rounded-full hover:bg-gray-800/50 text-gray-400 transition-all"
            title="Preferences"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={() => { setWorkflowModalOpen(true); loadWorkflows(); }}
            className="p-2 rounded-full hover:bg-gray-800/50 text-gray-400 transition-all"
            title="Workflow Builder"
          >
            <Activity className="w-5 h-5" />
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-800/50 text-gray-400 transition-all"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Template selector */}
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className={`px-3 py-2 rounded-lg text-sm border ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700/50 text-white' : 'bg-white/50 border-gray-200/50 text-gray-900'} backdrop-blur-sm focus:ring-2 focus:ring-purple-500`}
          >
            <option value="vanilla">Vanilla</option>
            <option value="react">React</option>
            <option value="vue">Vue</option>
          </select>

          {/* Prompt input */}
          <div className="relative w-96">
            <input
              type="text"
              placeholder="Describe your app..."
              className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700/50 text-white' : 'bg-white/50 border-gray-200/50 text-gray-900'} backdrop-blur-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-10`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
            />
            {isListening && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || isGenerating}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>Generate</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Left sidebar - Projects */}
        <div className={`w-72 ${theme === 'dark' ? 'bg-gray-900/30 border-r border-gray-800/50' : 'bg-white/30 border-r border-gray-200/50'} backdrop-blur-xl p-4 overflow-y-auto`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-gray-400">
              <History className="w-4 h-4" /> Past Projects
            </h3>
            {loadingProjects && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
          </div>
          {projects.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8">
              No projects yet
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((proj, idx) => (
                <ProjectItem
                  key={idx}
                  project={proj}
                  onLoad={loadProject}
                  onJoin={joinRoom}
                  onGitHub={(p) => {
                    setSelectedProject(p);
                    setRepoName(`vibecoder-${extractProjectId(p.url)}`);
                    setGithubModalOpen(true);
                  }}
                  onDownload={downloadProject}
                />
              ))}
            </div>
          )}
        </div>

        {/* Center - Code editor */}
        <div className={`flex-1 flex flex-col ${theme === 'dark' ? 'bg-gray-800/20' : 'bg-gray-50/20'} backdrop-blur-sm`}>
          <div className={`border-b px-2 flex items-center overflow-x-auto ${theme === 'dark' ? 'border-gray-800/50' : 'border-gray-200/50'}`}>
            {Object.keys(files).length > 0 ? (
              Object.keys(files).map(file => (
                <button
                  key={file}
                  onClick={() => setActiveFile(file)}
                  className={`px-4 py-2 text-sm font-mono border-b-2 transition-all ${activeFile === file 
                    ? 'border-purple-500 text-purple-400' 
                    : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                >
                  {file}
                </button>
              ))
            ) : (
              <span className="px-4 py-2 text-sm text-gray-500">No files generated yet</span>
            )}
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              defaultLanguage="html"
              language={activeFile.endsWith('.css') ? 'css' : activeFile.endsWith('.js') ? 'javascript' : 'html'}
              value={files[activeFile] || ''}
              onChange={handleEditorChange}
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              options={{ 
                readOnly: false, 
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: 'JetBrains Mono, monospace',
                scrollBeyondLastLine: false,
                renderLineHighlight: 'all',
                lineNumbers: 'on',
                folding: true,
                automaticLayout: true
              }}
            />
          </div>
        </div>

        {/* Right - Live preview */}
        <div className={`w-96 ${theme === 'dark' ? 'bg-gray-900/30 border-l border-gray-800/50' : 'bg-white/30 border-l border-gray-200/50'} backdrop-blur-xl p-4 overflow-hidden flex flex-col`}>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-gray-400">
            <Eye className="w-4 h-4" /> Live Preview
          </h3>
          <div className="flex-1 bg-white rounded-xl overflow-hidden shadow-2xl border border-gray-700/20">
            {previewUrl ? (
              <iframe
                ref={previewRef}
                src={previewUrl}
                className="w-full h-full"
                title="App Preview"
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 bg-gradient-to-br from-gray-50 to-gray-100">
                Your app will appear here
              </div>
            )}
          </div>
          {result && (
            <a
              href={result.url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg text-white flex items-center justify-center gap-2 text-sm hover:shadow-lg hover:shadow-blue-500/25 transition-all"
            >
              <Globe className="w-4 h-4" /> Open in new tab
            </a>
          )}
        </div>
      </div>

      {/* Bottom panel - Agent status and logs */}
      <div className={`h-64 border-t ${theme === 'dark' ? 'border-gray-800/50 bg-gray-900/30' : 'border-gray-200/50 bg-white/30'} backdrop-blur-xl flex flex-col`}>
        {/* Agent status */}
        <div className="flex gap-2 p-3 border-b border-gray-800/30 overflow-x-auto">
          {agents.map(agent => (
            <AgentStatus key={agent.name} agent={agent} />
          ))}
        </div>
        {/* Logs with test results */}
        <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
          {testResults && testResults.details && testResults.details.map((test, idx) => (
            <div key={idx} className="mb-2 border-b border-gray-700/30 pb-1">
              <div className="flex items-center justify-between">
                <span className={test.passed ? 'text-green-400' : 'text-red-400'}>
                  {test.passed ? '?' : '?'} {test.test}
                </span>
                {!test.passed && !fixing && (
                  <button
                    onClick={() => fixFailure(test.test)}
                    className="px-2 py-0.5 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded transition"
                  >
                    Fix
                  </button>
                )}
              </div>
              <div className="text-gray-500 text-xs ml-4">{test.details}</div>
            </div>
          ))}
          {logs.map((log, i) => (
            <div key={i} className="text-gray-400 border-l-2 border-purple-500 pl-2 mb-1">
              <span className="text-gray-500">[{log.time}]</span> {log.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

