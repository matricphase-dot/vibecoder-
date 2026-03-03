import React, { useState, useEffect } from 'react';
import { X, UserPlus, Mail, Shield, Trash2, Clock } from 'lucide-react';
import ActivityPanel from './ActivityPanel';

const MembersModal = ({ workspace, onClose }) => {
    const [members, setMembers] = useState([]);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('viewer');
    const [activeTab, setActiveTab] = useState('members'); // 'members' or 'activity'

    useEffect(() => {
        if (workspace) loadMembers();
    }, [workspace]);

    const loadMembers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL}/workspaces/${workspace.id}/members`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setMembers(data.members || []);
        } catch (err) {
            console.error('Failed to load members', err);
        }
    };

    const inviteMember = async () => {
        if (!inviteEmail) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL}/workspaces/${workspace.id}/members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ user_email: inviteEmail, role: inviteRole })
            });
            if (res.ok) {
                loadMembers();
                setInviteEmail('');
            } else {
                alert('Failed to invite member');
            }
        } catch (err) {
            alert('Error inviting member');
        }
    };

    const removeMember = async (userId) => {
        if (!confirm('Remove this member?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL}/workspaces/${workspace.id}/members/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                loadMembers();
            } else {
                alert('Failed to remove member');
            }
        } catch (err) {
            alert('Error removing member');
        }
    };

    const updateRole = async (userId, newRole) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL}/workspaces/${workspace.id}/members/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ role: newRole })
            });
            if (res.ok) {
                loadMembers();
            } else {
                alert('Failed to update role');
            }
        } catch (err) {
            alert('Error updating role');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg w-[600px] max-h-[80vh] flex flex-col">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Manage Workspace: {workspace?.name}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-700">
                    <button
                        onClick={() => setActiveTab('members')}
                        className={`px-4 py-2 text-sm ${activeTab === 'members' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400'}`}
                    >
                        Members
                    </button>
                    <button
                        onClick={() => setActiveTab('activity')}
                        className={`px-4 py-2 text-sm ${activeTab === 'activity' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400'}`}
                    >
                        Activity
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {activeTab === 'members' ? (
                        <>
                            {/* Invite form */}
                            <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <UserPlus className="w-4 h-4" /> Invite Member
                                </h3>
                                <div className="flex gap-2">
                                    <input
                                        type="email"
                                        placeholder="Email"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        className="flex-1 px-3 py-2 bg-gray-700 rounded border border-gray-600 text-sm"
                                    />
                                    <select
                                        value={inviteRole}
                                        onChange={(e) => setInviteRole(e.target.value)}
                                        className="px-3 py-2 bg-gray-700 rounded border border-gray-600 text-sm"
                                    >
                                        <option value="viewer">Viewer</option>
                                        <option value="editor">Editor</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                    <button
                                        onClick={inviteMember}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm"
                                    >
                                        Invite
                                    </button>
                                </div>
                            </div>

                            {/* Member list */}
                            <div className="space-y-2">
                                {members.map(member => (
                                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                                                <Mail className="w-4 h-4 text-purple-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{member.username}</p>
                                                <p className="text-xs text-gray-400">{member.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={member.role}
                                                onChange={(e) => updateRole(member.id, e.target.value)}
                                                className="px-2 py-1 bg-gray-700 rounded text-xs"
                                            >
                                                <option value="viewer">Viewer</option>
                                                <option value="editor">Editor</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                            <button
                                                onClick={() => removeMember(member.id)}
                                                className="p-1 hover:bg-red-500/20 rounded text-red-400"
                                                title="Remove"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <ActivityPanel workspaceId={workspace?.id} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default MembersModal;
