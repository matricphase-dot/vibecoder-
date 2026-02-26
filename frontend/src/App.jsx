import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Sparkles, Terminal, Zap, Globe, Eye, History, Send, Play, Bug, Code, RefreshCw, Clipboard, Search, Rocket } from 'lucide-react';

function App() {
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
    { name: 'Planner', status: 'idle', icon: <Clipboard size={14} /> },
    { name: 'Coder', status: 'idle', icon: <Code size={14} /> },
    { name: 'Debugger', status: 'idle', icon: <Search size={14} /> },
    { name: 'Reviewer', status: 'idle', icon: <Eye size={14} /> },
    { name: 'Deployer', status: 'idle', icon: <Rocket size={14} /> }
  ]);
  const ws = useRef(null);
  const previewRef = useRef(null);

  useEffect(() => {
    loadProjects();
    return () => {
      if (ws.current) ws.current.close();
    };
  }, []);

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch('http://localhost:8000/projects/list');
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

    ws.current = new WebSocket('ws://localhost:8000/ws');
    
    ws.current.onopen = () => {
      addLog('Connected to server');
      ws.current.send(JSON.stringify({ prompt }));
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

  const loadProject = async (url) => {
    setPreviewUrl(url);
  };

  const deployProject = async (projectId, task) => {
    try {
      const res = await fetch('http://localhost:8000/deploy', {
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

  const downloadProject = (projectId) => {
    window.open(`http://localhost:8000/export/${projectId}`, '_blank');
  };  const fixFailure = async (testDescription) => {
    if (!result) return;
    setFixing(true);
    try {
      const res = await fetch('http://localhost:8000/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: result.project_id,
          test_description: testDescription
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`? Fixed files: ${data.fixed_files.join(', ')}`);
        loadProject(result.url);
      } else {
        alert(`? Fix failed: ${data.message || 'Unknown error'}`);
      }
    } catch (err) {
      alert('Fix request failed');
    } finally {
      setFixing(false);
    }
  };

  const pushToGithub = async () => {
    if (!selectedProject) return;
    setPushing(true);
    try {
      const res = await fetch('http://localhost:8000/github/push', {
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
  const extractProjectId = (url) => {
    const match = url.match(/\/projects\/([^/]+)/);
    return match ? match[1] : null;
  };

  const handleEditorChange = (value) => {
    setFiles(prev => ({ ...prev, [activeFile]: value }));
  };

  const examples = [
    "Build a counter app with plus/minus buttons",
    "Create a todo list with local storage",
    "Make a weather dashboard with mock data",
    "Build a markdown preview editor"
  ];
  const [testResults, setTestResults] = useState(null);
  const [fixing, setFixing] = useState(false);
  const [preferencesModalOpen, setPreferencesModalOpen] = useState(false);
  const [dashboardModalOpen, setDashboardModalOpen] = useState(false);
  const [allProjects, setAllProjects] = useState([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);  const [preferences, setPreferences] = useState({});
  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 p-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          VibeCoder
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setDashboardModalOpen(true); loadAllProjects(); }}
            className="p-2 hover:bg-gray-800 rounded-lg text-xl"
            title="Deployment Dashboard"
          >
            ??
          </button>
          <button
            onClick={() => setPreferencesModalOpen(true)}
            className="p-2 hover:bg-gray-800 rounded-lg text-xl"
            title="Preferences"
          >
            ??
          </button>
          <input
            type="text"
            placeholder="Describe your app..."
            className="w-96 px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
          />
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || isGenerating}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {isGenerating ? <RefreshCw className="animate-spin" size={18} /> : <Zap size={18} />}
            {isGenerating ? 'Building...' : 'Generate'}
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar: Project history */}
        <div className="w-64 bg-gray-900 border-r border-gray-800 p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <History size={16} /> Past Projects
          </h3>
          {loadingProjects ? (
            <p className="text-gray-500">Loading...</p>
          ) : projects.length === 0 ? (
            <p className="text-gray-500">No projects yet</p>
          ) : (
            <ul className="space-y-1">
              {projects.map((proj, idx) => {
                const projId = extractProjectId(proj.url);
                return (
                  <li key={idx} className="flex items-center justify-between group">
                    <button
                      onClick={() => loadProject(proj.url)}
                      className="flex-1 text-left p-2 rounded hover:bg-gray-800 text-sm truncate"
                    >
                      {proj.task}
                    </button>
                    {projId && (
                      <button
                        onClick={() => deployProject(projId, proj.task)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-blue-400 hover:text-blue-300"
                        title="Deploy to Vercel"
                      >
                        <Globe size={14} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Center: Code editor with file tabs */}
        <div className="flex-1 flex flex-col bg-gray-900">
          <div className="border-b border-gray-800 px-2 flex items-center overflow-x-auto">
            {Object.keys(files).length > 0 ? (
              Object.keys(files).map(file => (
                <button
                  key={file}
                  onClick={() => setActiveFile(file)}
                  className={`px-4 py-2 text-sm font-mono border-b-2 ${activeFile === file ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400'}`}
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
              theme="vs-dark"
              options={{ readOnly: false, minimap: { enabled: false } }}
            />
          </div>
        </div>

        {/* Right: Live preview */}
        <div className="w-96 bg-gray-900 border-l border-gray-800 p-4 overflow-hidden flex flex-col">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Eye size={16} /> Live Preview
          </h3>
          <div className="flex-1 bg-white rounded-lg overflow-hidden">
            {previewUrl ? (
              <iframe
                ref={previewRef}
                src={previewUrl}
                className="w-full h-full"
                title="App Preview"
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Your app will appear here
              </div>
            )}
          </div>
          {result && (
            <a
              href={result.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white flex items-center justify-center gap-2 text-sm"
            >
              <Globe size={16} /> Open in new tab
            </a>
          )}
        </div>
      </div>

      {/* Bottom panel: Agent status and logs */}
      <div className="h-64 border-t border-gray-800 bg-gray-900 flex flex-col">
        {/* Agent status */}
        <div className="flex gap-4 p-2 border-b border-gray-800">
          {agents.map(agent => (
            <div key={agent.name} className="flex items-center gap-1 text-sm">
              <span className="text-gray-400">{agent.icon}</span>
              <span className="text-gray-400">{agent.name}:</span>
              <span className={
                agent.status === 'working' ? 'text-yellow-400' :
                agent.status === 'done' ? 'text-green-400' : 'text-gray-500'
              }>
                {agent.status}
              </span>
            </div>
          ))}
        </div>
        {/* Logs */}
                            <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
            {testResults && testResults.details && testResults.details.map((test, idx) => (
              <div key={idx} className="mb-2 border-b border-gray-700 pb-1">
                <div className="flex items-center justify-between">
                  <span className={test.passed ? 'text-green-400' : 'text-red-400'}>
                    {test.passed ? '?' : '?'} {test.test}
                  </span>
                  {!test.passed && !fixing && (
                    <button
                      onClick={() => fixFailure(test.test)}
                      className="px-2 py-0.5 text-xs bg-blue-600 hover:bg-blue-700 rounded text-white"
                    >
                      Fix
                    </button>
                  )}
                </div>
                <div className="text-gray-400 text-xs ml-4">{test.details}</div>
              </div>
            ))}
            {logs.map((log, i) => (
              <div key={i} className="text-gray-300 border-l-2 border-purple-500 pl-2 mb-1">
                <span className="text-gray-500">[{log.time}]</span> {log.text}
              </div>
            ))}
          </div>
        </div>      {preferencesModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Preferences</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Preferred Framework</label>
                <select
                  value={preferences.framework || ''}
                  onChange={(e) => savePreference('framework', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700"
                >
                  <option value="">None</option>
                  <option value="react">React</option>
                  <option value="vue">Vue</option>
                  <option value="svelte">Svelte</option>
                  <option value="vanilla">Vanilla JS</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Styling</label>
                <select
                  value={preferences.styling || ''}
                  onChange={(e) => savePreference('styling', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700"
                >
                  <option value="">None</option>
                  <option value="css">Plain CSS</option>
                  <option value="tailwind">Tailwind</option>
                  <option value="bootstrap">Bootstrap</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Include Tests</label>
                <input
                  type="checkbox"
                  checked={preferences.includeTests === 'true'}
                  onChange={(e) => savePreference('includeTests', e.target.checked.toString())}
                  className="mr-2"
                />
                <span>Generate test files</span>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setPreferencesModalOpen(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}      {preferencesModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Preferences</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Preferred Framework</label>
                <select
                  value={preferences.framework || ''}
                  onChange={(e) => savePreference('framework', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700"
                >
                  <option value="">None</option>
                  <option value="react">React</option>
                  <option value="vue">Vue</option>
                  <option value="svelte">Svelte</option>
                  <option value="vanilla">Vanilla JS</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Styling</label>
                <select
                  value={preferences.styling || ''}
                  onChange={(e) => savePreference('styling', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700"
                >
                  <option value="">None</option>
                  <option value="css">Plain CSS</option>
                  <option value="tailwind">Tailwind</option>
                  <option value="bootstrap">Bootstrap</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Include Tests</label>
                <input
                  type="checkbox"
                  checked={preferences.includeTests === 'true'}
                  onChange={(e) => savePreference('includeTests', e.target.checked.toString())}
                  className="mr-2"
                />
                <span>Generate test files</span>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setPreferencesModalOpen(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}      {dashboardModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg w-3/4 max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Deployment Dashboard</h2>
              <button
                onClick={() => setDashboardModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ?
              </button>
            </div>
            {loadingDashboard ? (
              <p className="text-center text-gray-400">Loading...</p>
            ) : allProjects.length === 0 ? (
              <p className="text-center text-gray-400">No projects yet</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2">Project</th>
                    <th className="text-left py-2">URL</th>
                    <th className="text-left py-2">Deployed At</th>
                    <th className="text-left py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allProjects.map((proj, idx) => (
                    <tr key={idx} className="border-b border-gray-800">
                      <td className="py-2">{proj.task}</td>
                      <td className="py-2">
                        <a
                          href={proj.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:underline"
                        >
                          {proj.url}
                        </a>
                      </td>
                      <td className="py-2">{new Date(proj.timestamp).toLocaleString()}</td>
                                                                      <td className="py-2 flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedProject(proj);
                              setRepoName(`vibecoder-${extractProjectId(proj.url)}`);
                              setGithubModalOpen(true);
                            }}
                            className="px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs"
                            title="Push to GitHub"
                          >
                            ??
                          </button>
                          <button
                            onClick={() => downloadProject(extractProjectId(proj.url))}
                            className="px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs"
                            title="Download ZIP"
                          >
                            ??
                          </button>
                          <button
                            onClick={() => {
                              setPreviewUrl(proj.url);
                              setDashboardModalOpen(false);
                            }}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                          >
                            Preview
                          </button>
                          <button
                            onClick={() => deployProject(extractProjectId(proj.url), proj.task)}
                            className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
                          >
                            Redeploy
                          </button>
                        </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setDashboardModalOpen(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}      {githubModalOpen && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Push to GitHub</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Repository Name</label>
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700"
                  placeholder="my-awesome-app"
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={repoPrivate}
                    onChange={(e) => setRepoPrivate(e.target.checked)}
                  />
                  <span>Private repository</span>
                </label>
              </div>
              <div className="text-sm text-gray-400">
                Pushing project: <span className="text-white">{selectedProject.task}</span>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setGithubModalOpen(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                disabled={pushing}
              >
                Cancel
              </button>
              <button
                onClick={pushToGithub}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded flex items-center gap-2"
                disabled={pushing}
              >
                {pushing ? 'Pushing...' : 'Push to GitHub'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
  );
}

export default App;







