import React, { useState, useEffect } from 'react';
import { Clock, User, Mail, Shield, Trash2 } from 'lucide-react';

const ActivityPanel = ({ workspaceId }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (workspaceId) fetchActivity();
    }, [workspaceId]);

    const fetchActivity = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/activity/workspace/${workspaceId}?limit=50`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setLogs(data);
        } catch (err) {
            console.error('Failed to fetch activity', err);
        } finally {
            setLoading(false);
        }
    };

    const getActionIcon = (action) => {
        switch(action) {
            case 'invite': return <Mail className="w-4 h-4 text-green-400" />;
            case 'remove': return <Trash2 className="w-4 h-4 text-red-400" />;
            case 'update_role': return <Shield className="w-4 h-4 text-blue-400" />;
            default: return <Clock className="w-4 h-4 text-gray-400" />;
        }
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleString();
    };

    return (
        <div className="p-4 h-full overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" /> Activity Log
            </h3>
            {loading && <p className="text-gray-400">Loading...</p>}
            {logs.length === 0 && !loading && (
                <p className="text-gray-500">No activity yet.</p>
            )}
            <div className="space-y-3">
                {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-2 rounded bg-gray-800/30 border border-gray-700/30">
                        {getActionIcon(log.action)}
                        <div className="flex-1">
                            <div className="text-sm">
                                <span className="font-medium text-purple-400">{log.action.replace('_', ' ')}</span>
                                {log.details && (
                                    <span className="text-gray-300 ml-2">
                                        {Object.entries(log.details).map(([k,v]) => `${k}: ${v}`).join(', ')}
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-gray-500">{formatTime(log.timestamp)}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ActivityPanel;
