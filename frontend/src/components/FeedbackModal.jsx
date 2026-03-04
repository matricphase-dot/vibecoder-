import React, { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';

const FeedbackModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [rating, setRating] = useState(5);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/feedback/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message,
                    rating,
                    page: window.location.pathname
                })
            });
            if (res.ok) {
                setSuccess(true);
                setTimeout(() => {
                    setIsOpen(false);
                    setSuccess(false);
                    setMessage('');
                    setRating(5);
                }, 2000);
            } else {
                alert('Failed to send feedback. Please try again.');
            }
        } catch (err) {
            alert('Error sending feedback.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            {/* Floating feedback button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 left-4 z-40 bg-purple-600 hover:bg-purple-700 text-white rounded-full p-3 shadow-lg transition-all duration-300 hover:scale-110"
                title="Send feedback"
            >
                <MessageCircle size={24} />
            </button>

            {/* Feedback modal */}
            {isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-900 p-6 rounded-lg w-96 max-w-lg relative border border-purple-500/30">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-2 right-2 text-gray-400 hover:text-white"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <MessageCircle className="text-purple-400" />
                            Send Feedback
                        </h2>

                        {success ? (
                            <div className="text-center py-8">
                                <p className="text-green-400 text-lg mb-2">Thank you!</p>
                                <p className="text-gray-300">Your feedback helps us improve.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <div className="mb-4">
                                    <label className="block text-sm text-gray-400 mb-1">Your feedback</label>
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white"
                                        rows="4"
                                        placeholder="Tell us what you think, report a bug, or suggest a feature..."
                                        required
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm text-gray-400 mb-1">Satisfaction (1-5)</label>
                                    <select
                                        value={rating}
                                        onChange={(e) => setRating(parseInt(e.target.value))}
                                        className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white"
                                    >
                                        {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} star{n>1?'s':''}</option>)}
                                    </select>
                                </div>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {submitting ? 'Sending...' : <><Send size={16} /> Send Feedback</>}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default FeedbackModal;
