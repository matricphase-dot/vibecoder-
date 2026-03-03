import React, { useState, useEffect } from 'react';
import { Download, Star, Upload, Filter } from 'lucide-react';

const Marketplace = () => {
    const [items, setItems] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [uploadForm, setUploadForm] = useState({
        name: '',
        description: '',
        type: 'template',
        content: ''
    });

    useEffect(() => {
        fetchItems();
    }, [filter]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const url = filter === 'all' 
                ? `${import.meta.env.VITE_API_URL}/api/marketplace/items`
                : `${import.meta.env.VITE_API_URL}/api/marketplace/items?type=${filter}`;
            const res = await fetch(url);
            const data = await res.json();
            setItems(data);
        } catch (err) {
            console.error('Failed to fetch marketplace items', err);
        } finally {
            setLoading(false);
        }
    };

    const downloadItem = async (id) => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/marketplace/items/${id}/download`, {
                method: 'POST'
            });
            const data = await res.json();
            // Handle download: save as file or apply to current project
            alert('Item downloaded! (Stub)');
            console.log('Downloaded content:', data.content);
        } catch (err) {
            alert('Download failed');
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/marketplace/items`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...uploadForm,
                    content: JSON.parse(uploadForm.content) // Assume user pastes JSON
                })
            });
            if (res.ok) {
                setShowUpload(false);
                fetchItems();
                alert('Item published!');
            } else {
                alert('Failed to publish');
            }
        } catch (err) {
            alert('Error publishing');
        }
    };

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Community Marketplace</h1>
                <button
                    onClick={() => setShowUpload(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2"
                >
                    <Upload size={16} /> Publish
                </button>
            </div>

            <div className="flex gap-4 mb-6">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1 rounded ${filter === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
                >
                    All
                </button>
                <button
                    onClick={() => setFilter('template')}
                    className={`px-3 py-1 rounded ${filter === 'template' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
                >
                    Templates
                </button>
                <button
                    onClick={() => setFilter('agent')}
                    className={`px-3 py-1 rounded ${filter === 'agent' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
                >
                    Agents
                </button>
            </div>

            {loading && <p>Loading...</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(item => (
                    <div key={item.id} className="border rounded-lg p-4 shadow hover:shadow-lg transition">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-semibold">{item.name}</h3>
                                <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                                <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                                    {item.type}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 text-yellow-500">
                                <Star size={16} fill="currentColor" />
                                <span>{item.rating.toFixed(1)}</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-4">
                            <span className="text-sm text-gray-500">{item.downloads} downloads</span>
                            <button
                                onClick={() => downloadItem(item.id)}
                                className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                                <Download size={14} /> Get
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {showUpload && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96">
                        <h2 className="text-xl font-bold mb-4">Publish to Marketplace</h2>
                        <form onSubmit={handleUpload}>
                            <input
                                type="text"
                                placeholder="Name"
                                value={uploadForm.name}
                                onChange={(e) => setUploadForm({...uploadForm, name: e.target.value})}
                                className="w-full p-2 border rounded mb-2"
                                required
                            />
                            <textarea
                                placeholder="Description"
                                value={uploadForm.description}
                                onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                                className="w-full p-2 border rounded mb-2"
                                rows="3"
                                required
                            />
                            <select
                                value={uploadForm.type}
                                onChange={(e) => setUploadForm({...uploadForm, type: e.target.value})}
                                className="w-full p-2 border rounded mb-2"
                            >
                                <option value="template">Template</option>
                                <option value="agent">Agent</option>
                            </select>
                            <textarea
                                placeholder="Content (JSON)"
                                value={uploadForm.content}
                                onChange={(e) => setUploadForm({...uploadForm, content: e.target.value})}
                                className="w-full p-2 border rounded mb-4 font-mono text-sm"
                                rows="6"
                                required
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowUpload(false)}
                                    className="px-4 py-2 bg-gray-300 rounded"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-purple-600 text-white rounded"
                                >
                                    Publish
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Marketplace;
