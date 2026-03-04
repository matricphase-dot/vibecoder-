import React, { useState, useEffect } from 'react';
import { Trash2, RefreshCw } from 'lucide-react';

const AdminFeedback = () => {
    const [feedback, setFeedback] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchFeedback = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/feedback`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setFeedback(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const deleteFeedback = async (id) => {
        if (!confirm('Delete this feedback?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/feedback/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchFeedback();
            } else {
                alert('Failed to delete');
            }
        } catch (err) {
            alert('Error deleting');
        }
    };

    useEffect(() => {
        fetchFeedback();
    }, []);

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleString();
    };

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Admin: User Feedback</h1>
            <button
                onClick={fetchFeedback}
                className="mb-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2"
            >
                <RefreshCw size={16} /> Refresh
            </button>

            {loading && <p className="text-gray-400">Loading...</p>}
            {error && <p className="text-red-400">Error: {error}</p>}

            {!loading && !error && feedback.length === 0 && (
                <p className="text-gray-500">No feedback yet.</p>
            )}

            <div className="space-y-4">
                {feedback.map(item => (
                    <div key={item.id} className="border border-gray-700 rounded-lg p-4 bg-gray-800/30">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-sm text-gray-400">User ID: {item.user_id || 'Anonymous'}</span>
                                    <span className="text-xs text-gray-500">• {formatDate(item.created_at)}</span>
                                </div>
                                <p className="text-white mb-2">{item.message}</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-1 rounded">Rating: {item.rating}/5</span>
                                    {item.page && <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">Page: {item.page}</span>}
                                </div>
                            </div>
                            <button
                                onClick={() => deleteFeedback(item.id)}
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

export default AdminFeedback;
