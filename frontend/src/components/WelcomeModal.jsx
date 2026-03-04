import React, { useEffect, useState } from 'react';
import { X, Rocket, Users, Shield, Sparkles } from 'lucide-react';

const WelcomeModal = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Check if user has seen the welcome modal before
        const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
        if (!hasSeenWelcome) {
            setIsOpen(true);
        }
    }, []);

    const handleClose = () => {
        localStorage.setItem('hasSeenWelcome', 'true');
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 w-96 max-w-lg relative border border-purple-500/30 shadow-2xl">
                <button
                    onClick={handleClose}
                    className="absolute top-2 right-2 text-gray-400 hover:text-white"
                >
                    <X size={20} />
                </button>
                
                <div className="flex items-center gap-2 mb-4">
                    <Rocket className="text-purple-400" size={28} />
                    <h2 className="text-2xl font-bold text-white">Welcome to VibeCoder!</h2>
                </div>
                
                <p className="text-gray-300 mb-4">
                    You're now part of the future of AI-powered development. Here are a few tips to get started:
                </p>
                
                <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-2">
                        <Sparkles className="text-purple-400 mt-1" size={18} />
                        <span className="text-gray-300">Describe your app idea in the prompt box and click <strong>Generate</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <Users className="text-purple-400 mt-1" size={18} />
                        <span className="text-gray-300">Invite team members from the workspace menu to collaborate in real time.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <Shield className="text-purple-400 mt-1" size={18} />
                        <span className="text-gray-300">Run <strong>Compliance</strong> scans to check for accessibility, GDPR, and security issues.</span>
                    </li>
                </ul>
                
                <div className="flex justify-between items-center text-sm">
                    <a href="/privacy" className="text-purple-400 hover:text-purple-300">Privacy</a>
                    <a href="/terms" className="text-purple-400 hover:text-purple-300">Terms</a>
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                        Get Started
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WelcomeModal;
