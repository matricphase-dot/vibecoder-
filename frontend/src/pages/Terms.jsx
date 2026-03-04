import React from 'react';
import { Link } from 'react-router-dom';

const Terms = () => {
    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 p-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold text-purple-400 mb-6">Terms of Service</h1>
                <p className="mb-4">Last updated: March 2026</p>
                <p className="mb-4">
                    Welcome to VibeCoder. By using our platform, you agree to these terms. Please read them carefully.
                </p>
                <h2 className="text-2xl font-semibold text-purple-300 mt-6 mb-3">1. Acceptance of Terms</h2>
                <p className="mb-4">
                    By accessing or using VibeCoder, you agree to be bound by these Terms and our Privacy Policy. If you do not agree, you may not use the service.
                </p>
                <h2 className="text-2xl font-semibold text-purple-300 mt-6 mb-3">2. Use of Service</h2>
                <p className="mb-4">
                    You may use VibeCoder only for lawful purposes and in accordance with these Terms. You agree not to misuse the platform or interfere with its operation.
                </p>
                <h2 className="text-2xl font-semibold text-purple-300 mt-6 mb-3">3. Accounts</h2>
                <p className="mb-4">
                    You are responsible for maintaining the confidentiality of your account credentials. You are liable for all activities that occur under your account.
                </p>
                <h2 className="text-2xl font-semibold text-purple-300 mt-6 mb-3">4. Intellectual Property</h2>
                <p className="mb-4">
                    VibeCoder and its original content, features, and functionality are owned by us and are protected by international copyright, trademark, and other laws.
                </p>
                <h2 className="text-2xl font-semibold text-purple-300 mt-6 mb-3">5. User Content</h2>
                <p className="mb-4">
                    You retain ownership of any content you submit, post, or display on or through VibeCoder. By submitting content, you grant us a worldwide, royalty-free license to use, reproduce, and display that content solely to provide the service.
                </p>
                <h2 className="text-2xl font-semibold text-purple-300 mt-6 mb-3">6. Termination</h2>
                <p className="mb-4">
                    We may terminate or suspend your access immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users.
                </p>
                <h2 className="text-2xl font-semibold text-purple-300 mt-6 mb-3">7. Limitation of Liability</h2>
                <p className="mb-4">
                    To the fullest extent permitted by law, VibeCoder shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the service.
                </p>
                <h2 className="text-2xl font-semibold text-purple-300 mt-6 mb-3">8. Changes to Terms</h2>
                <p className="mb-4">
                    We reserve the right to modify these terms at any time. We will provide notice of significant changes. Your continued use of the service after such modifications constitutes acceptance.
                </p>
                <h2 className="text-2xl font-semibold text-purple-300 mt-6 mb-3">9. Contact Us</h2>
                <p className="mb-4">
                    If you have any questions about these Terms, please contact us at legal@vibecoder.com.
                </p>
                <div className="mt-8">
                    <Link to="/" className="text-purple-400 hover:text-purple-300">? Back to Home</Link>
                </div>
            </div>
        </div>
    );
};

export default Terms;
