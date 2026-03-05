import React, { useState, useEffect } from 'react';
import { Trash2, RefreshCw, Mail } from 'lucide-react';

const AdminBetaSignups = () => {
    const [signups, setSignups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchSignups = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/beta/signups`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setSignups(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const deleteSignup = async (id) => {
        if (!confirm('Delete this signup?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/beta/signups/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchSignups();
            } else {
                alert('Failed to delete');
            }
        } catch (err) {
            alert('Error deleting');
        }
    };

    useEffect(() => {
        fetchSignups();
    }, []);

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleString();
    };

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Admin: Beta Signups</h1>
            <button
                onClick={fetchSignups}
                className="mb-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2"
            >
                <RefreshCw size={16} /> Refresh
            </button>

            {loading && <p className="text-gray-400">Loading...</p>}
            {error && <p className="text-red-400">Error: {error}</p>}

            {!loading && !error && signups.length === 0 && (
                <p className="text-gray-500">No signups yet.</p>
            )}

            <div className="space-y-4">
                {signups.map(item => (
                    <div key={item.id} className="border border-gray-700 rounded-lg p-4 bg-gray-800/30">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <Mail className="w-4 h-4 text-purple-400" />
                                    <span className="text-white">{item.email}</span>
                                </div>
                                <p className="text-xs text-gray-500">Signed up: {formatDate(item.created_at)}</p>
                            </div>
                            <button
                                onClick={() => deleteSignup(item.id)}
                                className="text-red-400 hover:text-red-300 p-1"
                                title="Delete"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminBetaSignups;
