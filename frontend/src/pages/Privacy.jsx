import React from 'react';
import { Link } from 'react-router-dom';

const Privacy = () => {
    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 p-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold text-purple-400 mb-6">Privacy Policy</h1>
                <p className="mb-4">Last updated: March 2026</p>
                <p className="mb-4">
                    Your privacy is important to us. This policy explains how we collect, use, and protect your information when you use VibeCoder.
                </p>
                <h2 className="text-2xl font-semibold text-purple-300 mt-6 mb-3">1. Information We Collect</h2>
                <p className="mb-4">
                    We collect information you provide directly, such as when you create an account, generate projects, or interact with the marketplace. This may include your name, email address, and project data.
                </p>
                <h2 className="text-2xl font-semibold text-purple-300 mt-6 mb-3">2. How We Use Information</h2>
                <p className="mb-4">
                    We use the information to operate, maintain, and improve VibeCoder, to communicate with you, and to personalize your experience. We do not sell your personal data.
                </p>
                <h2 className="text-2xl font-semibold text-purple-300 mt-6 mb-3">3. Data Sharing</h2>
                <p className="mb-4">
                    We may share information with third-party service providers (e.g., hosting, email delivery) who assist us in operating the platform. These providers are contractually obligated to protect your data.
                </p>
                <h2 className="text-2xl font-semibold text-purple-300 mt-6 mb-3">4. Security</h2>
                <p className="mb-4">
                    We take reasonable measures to protect your information from unauthorized access, loss, or alteration. However, no internet transmission is completely secure.
                </p>
                <h2 className="text-2xl font-semibold text-purple-300 mt-6 mb-3">5. Your Choices</h2>
                <p className="mb-4">
                    You may update or delete your account information by contacting us. You can opt out of marketing emails at any time.
                </p>
                <h2 className="text-2xl font-semibold text-purple-300 mt-6 mb-3">6. Contact Us</h2>
                <p className="mb-4">
                    If you have questions about this Privacy Policy, please contact us at privacy@vibecoder.com.
                </p>
                <div className="mt-8">
                    <Link to="/" className="text-purple-400 hover:text-purple-300">? Back to Home</Link>
                </div>
            </div>
        </div>
    );
};

export default Privacy;
