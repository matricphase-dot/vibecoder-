import React, { useState } from 'react';
import { Mail, Send, CheckCircle } from 'lucide-react';

const BetaSignup = () => {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/beta/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            if (res.ok) {
                setSubmitted(true);
                setEmail('');
            } else {
                const data = await res.json();
                setError(data.detail || 'Signup failed');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full">
                <h1 className="text-3xl font-bold text-white mb-2">Join the VibeCoder Beta</h1>
                <p className="text-gray-400 mb-6">
                    Be among the first to try our AI-powered development platform. Enter your email to get early access.
                </p>

                {submitted ? (
                    <div className="text-center">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-white mb-2">You're on the list!</h2>
                        <p className="text-gray-400">We'll notify you when beta starts.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 text-gray-500" size={20} />
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="you@example.com"
                                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                        </div>
                        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? 'Submitting...' : <><Send size={18} /> Sign Up for Beta</>}
                        </button>
                    </form>
                )}

                <p className="mt-6 text-xs text-center text-gray-500">
                    We respect your privacy. No spam, ever.
                </p>
            </div>
        </div>
    );
};

export default BetaSignup;
