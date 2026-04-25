// frontend/src/components/VerificationPanel.jsx
import React, { useState } from 'react';

export default function VerificationPanel({ fileContent, onShowFix }) {
  const [results, setResults] = useState([]);
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/verify/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: fileContent })
      });
      const data = await res.json();
      setResults(data.results || []);
      setReport(data.report || '');
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="p-4 bg-antigravity-sidebar rounded-lg">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold">Formal Verification (Z3)</h3>
        <button onClick={verify} className="text-xs bg-antigravity-accent px-2 py-1 rounded">
          {loading ? 'Verifying...' : 'Verify'}
        </button>
      </div>
      {report && (
        <pre className="bg-black p-2 rounded text-xs font-mono whitespace-pre-wrap">
          {report}
        </pre>
      )}
      {results.map((res, idx) => (
        <div key={idx} className={`mt-2 p-2 border rounded ${res.verified ? 'border-green-800' : 'border-red-800'}`}>
          <strong>{res.function}</strong>: {res.verified ? '✅ Verified' : '❌ Failed'}
          {res.counterexample && <div className="text-xs text-gray-400">Counterexample: {res.counterexample}</div>}
        </div>
      ))}
    </div>
  );
}
