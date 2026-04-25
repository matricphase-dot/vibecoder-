// frontend/src/components/FileTreeLive.jsx
import React, { useState, useEffect, useRef } from 'react';

export default function FileTreeLive({ onFileSelect }) {
  const [files, setFiles] = useState({});
  const [progress, setProgress] = useState({ stage: 'planning', done: 0, total: 0 });
  const wsRef = useRef(null);

  useEffect(() => {
    wsRef.current = new WebSocket('ws://localhost:8000/ws/generate');
    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'file') {
        setFiles(prev => ({ ...prev, [data.path]: data.content }));
        setProgress({ stage: data.stage || 'coding', done: data.done || Object.keys(files).length + 1, total: data.total || 0 });
      } else if (data.type === 'progress') {
        setProgress(data);
      } else if (data.type === 'complete') {
        setProgress({ stage: 'done', done: Object.keys(files).length, total: Object.keys(files).length });
      }
    };
    return () => wsRef.current?.close();
  }, []);

  const renderTree = (obj, path = '') => {
    return Object.keys(obj).sort().map(key => {
      const fullPath = path ? `${path}/${key}` : key;
      return (
        <div key={fullPath} className="pl-4">
          <div
            className="cursor-pointer hover:bg-antigravity-tab py-0.5 px-2 rounded"
            onClick={() => onFileSelect(fullPath, obj[key])}
          >
            📄 {key}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="p-2">
      <div className="text-xs text-gray-400 mb-2">
        {progress.stage === 'planning' && '📋 Planning...'}
        {progress.stage === 'coding' && `⚡ Coding... ${progress.done}/${progress.total} files`}
        {progress.stage === 'done' && `✅ Complete (${progress.done} files)`}
      </div>
      <div className="overflow-auto max-h-[calc(100vh-200px)]">
        {renderTree(files)}
      </div>
    </div>
  );
}
