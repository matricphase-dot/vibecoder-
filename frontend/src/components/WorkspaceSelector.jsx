import React, { useState, useEffect } from 'react';
import { Plus, Users } from 'lucide-react';

export function WorkspaceSelector({ currentWorkspace, onSelect, onCreate }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    const res = await fetch('/workspaces', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    setWorkspaces(data);
  };

  const handleCreate = async () => {
    await fetch('/workspaces', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ name: newName })
    });
    setNewName('');
    setShowCreate(false);
    fetchWorkspaces();
  };

  return (
    <div className="relative">
      <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-purple-500">
        <Users size={16} />
        <span>{currentWorkspace?.name || 'Personal'}</span>
      </button>
      {/* Dropdown would go here – we'll keep it simple for now */}
    </div>
  );
}
