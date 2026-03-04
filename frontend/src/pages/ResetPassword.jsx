import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [mode, setMode] = useState(token ? 'reset' : 'request');

    const handleRequest = async (e) => {
        e.preventDefault();
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/password-reset/request?email=${encodeURIComponent(email)}`, {
            method: 'POST'
        });
        const data = await res.json();
        setMessage(data.message);
    };

    const handleReset = async (e) => {
        e.preventDefault();
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/password-reset/confirm?token=${token}&new_password=${encodeURIComponent(password)}`, {
            method: 'POST'
        });
        const data = await res.json();
        setMessage(data.message || data.detail);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-96">
                <h1 className="text-2xl font-bold text-white mb-6">VibeCoder</h1>
                {mode === 'request' ? (
                    <form onSubmit={handleRequest}>
                        <p className="text-gray-300 mb-4">Enter your email to receive a password reset link.</p>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Your email"
                            className="w-full p-2 mb-4 bg-gray-700 border border-gray-600 rounded text-white"
                            required
                        />
                        <button type="submit" className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                            Send Reset Link
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleReset}>
                        <p className="text-gray-300 mb-4">Enter your new password.</p>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="New password"
                            className="w-full p-2 mb-4 bg-gray-700 border border-gray-600 rounded text-white"
                            required
                        />
                        <button type="submit" className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                            Reset Password
                        </button>
                    </form>
                )}
                {message && <p className="mt-4 text-center text-purple-400">{message}</p>}
            </div>
        </div>
    );
};

export default ResetPassword;
