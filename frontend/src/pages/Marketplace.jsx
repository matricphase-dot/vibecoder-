import React, { useState, useEffect } from 'react';
import { Download, Star, Upload, Filter, Search, ThumbsUp } from 'lucide-react';

const Marketplace = () => {
    const [items, setItems] = useState([]);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
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
    }, [filter, searchTerm]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            let url = `${import.meta.env.VITE_API_URL}/api/marketplace/items`;
            if (filter !== 'all') {
                url += `?type=${filter}`;
            }
            const res = await fetch(url);
            const data = await res.json();
            // Filter by search term client-side (simple)
            const filtered = data.filter(item =>
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setItems(filtered);
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
            alert('Item downloaded! (Stub)');
            console.log('Downloaded content:', data.content);
            // Refresh to update download count
            fetchItems();
        } catch (err) {
            alert('Download failed');
        }
    };

    const rateItem = async (id, rating) => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/marketplace/items/${id}/rate?rating=${rating}`, {
                method: 'POST'
            });
            if (res.ok) {
                fetchItems();
            } else {
                alert('Rating failed');
            }
        } catch (err) {
            alert('Error rating');
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
                    content: JSON.parse(uploadForm.content)
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

    const renderStars = (rating) => {
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5;
        const stars = [];
        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars.push(<Star key={i} size={16} className="text-yellow-500 fill-current" />);
            } else if (i === fullStars && halfStar) {
                stars.push(<Star key={i} size={16} className="text-yellow-500 half" />);
            } else {
                stars.push(<Star key={i} size={16} className="text-gray-400" />);
            }
        }
        return <div className="flex items-center">{stars}</div>;
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

            {/* Search and filter bar */}
            <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search items..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg bg-gray-800/50 border-gray-700/50 text-white"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('template')}
                        className={`px-4 py-2 rounded ${filter === 'template' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                    >
                        Templates
                    </button>
                    <button
                        onClick={() => setFilter('agent')}
                        className={`px-4 py-2 rounded ${filter === 'agent' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                    >
                        Agents
                    </button>
                </div>
            </div>

            {loading && <p className="text-center text-gray-400">Loading...</p>}

            {!loading && items.length === 0 && (
                <p className="text-center text-gray-500">No items found.</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map(item => (
                    <div key={item.id} className="border rounded-lg p-4 shadow hover:shadow-lg transition bg-gray-800/30 border-gray-700/30">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-semibold text-white">{item.name}</h3>
                                <p className="text-gray-400 text-sm mb-2">{item.description}</p>
                                <span className="inline-block px-2 py-1 bg-purple-600/20 text-purple-400 text-xs rounded">
                                    {item.type}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                {renderStars(item.rating)}
                                <span className="text-sm text-gray-400 ml-1">({item.downloads})</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-4">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => rateItem(item.id, 5)}
                                    className="text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-2 py-1 rounded"
                                >
                                    <ThumbsUp size={14} className="inline mr-1" /> Like
                                </button>
                                <span className="text-sm text-gray-500">{item.downloads} downloads</span>
                            </div>
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

            {/* Upload modal (unchanged) */}
            {showUpload && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-900 p-6 rounded-lg w-96">
                        <h2 className="text-xl font-bold mb-4">Publish to Marketplace</h2>
                        <form onSubmit={handleUpload}>
                            <input
                                type="text"
                                placeholder="Name"
                                value={uploadForm.name}
                                onChange={(e) => setUploadForm({...uploadForm, name: e.target.value})}
                                className="w-full p-2 border rounded mb-2 bg-gray-800 border-gray-700 text-white"
                                required
                            />
                            <textarea
                                placeholder="Description"
                                value={uploadForm.description}
                                onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                                className="w-full p-2 border rounded mb-2 bg-gray-800 border-gray-700 text-white"
                                rows="3"
                                required
                            />
                            <select
                                value={uploadForm.type}
                                onChange={(e) => setUploadForm({...uploadForm, type: e.target.value})}
                                className="w-full p-2 border rounded mb-2 bg-gray-800 border-gray-700 text-white"
                            >
                                <option value="template">Template</option>
                                <option value="agent">Agent</option>
                            </select>
                            <textarea
                                placeholder="Content (JSON)"
                                value={uploadForm.content}
                                onChange={(e) => setUploadForm({...uploadForm, content: e.target.value})}
                                className="w-full p-2 border rounded mb-4 font-mono text-sm bg-gray-800 border-gray-700 text-white"
                                rows="6"
                                required
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowUpload(false)}
                                    className="px-4 py-2 bg-gray-700 rounded"
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
