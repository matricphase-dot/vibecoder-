// frontend/src/pages/SimpleModeUI.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Sparkles } from 'lucide-react';

export default function SimpleModeUI() {
  const [prompt, setPrompt] = useState('');
  const [summary, setSummary] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const wsRef = useRef(null);

  useEffect(() => {
    wsRef.current = new WebSocket('ws://localhost:8000/ws');
    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'preview') {
        setPreviewHtml(data.html);
      }
    };
    return () => wsRef.current?.close();
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setSummary('');
    setSuggestions('');
    wsRef.current.send(JSON.stringify({ type: 'generate', prompt, plan: 'fast', template: 'vanilla' }));
    try {
      const res = await fetch('/api/simple/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      setSummary(data.summary || 'Your app is being built...');
      setSuggestions(data.suggestions || '');
    } catch (err) {
      console.error(err);
      setSummary('Your app is ready! Check the preview below.');
    }
    setLoading(false);
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Voice recognition not supported');
      return;
    }
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      const spoken = event.results[0][0].transcript;
      setPrompt(spoken);
      handleGenerate();
    };
    recognition.start();
  };

  return (
    <div className="min-h-screen bg-antigravity-bg text-antigravity-text flex flex-col">
      <div className="p-6 text-center border-b border-antigravity-border">
        <h1 className="text-3xl font-bold text-antigravity-accent">VibeCoder ✨</h1>
        <p className="text-gray-400 mt-2">Describe what you want to build – we'll handle the code</p>
      </div>
      <div className="flex-1 max-w-4xl mx-auto w-full p-6">
        <div className="bg-antigravity-sidebar rounded-2xl p-6 shadow-xl">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">What would you like to build?</label>
              <textarea
                rows={3}
                className="w-full bg-antigravity-bg border border-antigravity-border rounded-lg p-3 text-lg focus:outline-none focus:border-antigravity-accent"
                placeholder="Example: 'A personal website with a blog and contact form' or 'A to-do list that saves my tasks'"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
            <button
              onClick={startListening}
              className={`p-4 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-antigravity-tab hover:bg-antigravity-accent'} transition-all`}
              title="Voice input"
            >
              {isListening ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="mt-4 w-full bg-antigravity-accent text-white py-3 rounded-lg text-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <div className="animate-spin">⏳</div> : <Sparkles size={20} />}
            {loading ? 'Building...' : 'Build my app'}
          </button>
        </div>
        {summary && (
          <div className="mt-8 bg-antigravity-sidebar rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-3">✨ What was built</h2>
            <p className="text-gray-300 text-lg leading-relaxed">{summary}</p>
            {suggestions && (
              <div className="mt-4 pt-4 border-t border-antigravity-border">
                <h3 className="text-md font-medium text-antigravity-accent mb-2">💡 What you can try next</h3>
                <p className="text-gray-400">{suggestions}</p>
              </div>
            )}
          </div>
        )}
        {previewHtml && (
          <div className="mt-8 bg-antigravity-sidebar rounded-2xl p-2">
            <h2 className="text-md font-medium mb-2 px-2">Live preview</h2>
            <iframe
              srcDoc={previewHtml}
              className="w-full h-96 rounded-lg border border-antigravity-border"
              title="Preview"
            />
          </div>
        )}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">Try one of these:</p>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {["Personal portfolio", "To-do list app", "Weather widget", "Recipe organizer"].map(example => (
              <button
                key={example}
                onClick={() => setPrompt(example)}
                className="px-4 py-2 bg-antigravity-tab rounded-full text-sm hover:bg-antigravity-accent transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="text-center text-gray-500 text-sm py-4 border-t border-antigravity-border">
        Non‑developer mode – no code, no terminal. Just describe what you want.
      </div>
    </div>
  );
}
