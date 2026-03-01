import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Globe, Users, Rocket, Shield, Code, Sparkles, ChevronRight } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 text-white">
      {/* Navigation */}
      <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          VibeCoder
        </h1>
        <div className="space-x-4">
          <Link to="/app" className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition">
            Launch App
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h2 className="text-5xl md:text-6xl font-bold mb-6">
          Build Anything,{' '}
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Just by Vibing
          </span>
        </h2>
        <p className="text-xl text-gray-300 mb-10 max-w-3xl mx-auto">
          The most advanced AI‑powered development platform. Describe your app, and our multi‑agent system builds, tests, reviews, and deploys it – all autonomously.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/app"
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-lg font-semibold hover:scale-105 transition flex items-center gap-2"
          >
            Start Building <ChevronRight size={20} />
          </Link>
          <a
            href="#features"
            className="px-8 py-4 bg-gray-800 rounded-lg text-lg font-semibold hover:bg-gray-700 transition"
          >
            See Features
          </a>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20">
        <h3 className="text-4xl font-bold text-center mb-12">Why VibeCoder?</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Zap className="w-8 h-8 text-yellow-400" />}
            title="Lightning Fast"
            description="Parallel agent execution – build apps in seconds, not minutes."
          />
          <FeatureCard
            icon={<Users className="w-8 h-8 text-blue-400" />}
            title="Real‑Time Collaboration"
            description="Code together with your team, live sync and chat."
          />
          <FeatureCard
            icon={<Rocket className="w-8 h-8 text-green-400" />}
            title="One‑Click Deploy"
            description="Push to Vercel, GitHub, or download as ZIP instantly."
          />
          <FeatureCard
            icon={<Shield className="w-8 h-8 text-red-400" />}
            title="Self‑Improving"
            description="Learns from successes and failures – gets smarter over time."
          />
          <FeatureCard
            icon={<Code className="w-8 h-8 text-indigo-400" />}
            title="Multi‑Agent System"
            description="Planner, Coder, Debugger, Reviewer, Deployer work as a team."
          />
          <FeatureCard
            icon={<Sparkles className="w-8 h-8 text-pink-400" />}
            title="Voice & Multi‑Model"
            description="Voice input, choose between Groq, Gemini, or your fine‑tuned model."
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h3 className="text-4xl font-bold mb-6">Ready to Start Vibing?</h3>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Join the future of development. Describe your idea and watch it come to life.
        </p>
        <Link
          to="/app"
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-lg font-semibold hover:scale-105 transition inline-block"
        >
          Launch VibeCoder
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 text-center text-gray-400">
        <p>© 2026 VibeCoder. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-gray-800/50 backdrop-blur p-6 rounded-xl border border-gray-700 hover:border-purple-500 transition">
      <div className="mb-4">{icon}</div>
      <h4 className="text-xl font-semibold mb-2">{title}</h4>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}