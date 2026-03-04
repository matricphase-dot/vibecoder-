return (
      <WelcomeModal />
    <div className="group relative flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300">
      <span className="text-gray-300 group-hover:text-purple-400 transition-colors">{agent.icon}</span>
      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{agent.name}</span>
      <StatusIndicator status={agent.status} />
            <div className="absolute bottom-2 right-4 text-xs text-gray-500 flex gap-4">
          <a href="/privacy" className="hover:text-purple-400">Privacy</a>
          <a href="/terms" className="hover:text-purple-400">Terms</a>
        </div>

}

function ProjectItem({ project, onLoad, onJoin, onGitHub, onDownload }) {
  const [hover, setHover] = useState(false);
