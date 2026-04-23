// frontend/src/components/CompliancePanel.jsx
import React, { useState } from 'react';

export default function CompliancePanel({ existingCode, onApplyFix }) {
  const [standard, setStandard] = useState('hipaa');
  const [prompt, setPrompt] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [checkResult, setCheckResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateCode = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/compliance/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, standard })
      });
      const data = await res.json();
      if (data.code) {
        setGeneratedCode(data.code);
        if (onApplyFix) onApplyFix(data.code);
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Generation failed');
    }
    setLoading(false);
  };

  const checkCompliance = async () => {
    const codeToCheck = existingCode || generatedCode;
    if (!codeToCheck) {
      alert('No code to check');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/compliance/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeToCheck, standard })
      });
      const data = await res.json();
      setCheckResult(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="bg-antigravity-sidebar p-4 rounded-lg">
      <h2 className="text-lg font-semibold mb-3">🔐 Compliance Code Generator</h2>
      <div className="flex gap-4 mb-4">
        <select value={standard} onChange={(e) => setStandard(e.target.value)} className="bg-antigravity-tab p-2 rounded">
          <option value="hipaa">HIPAA</option>
          <option value="gdpr">GDPR</option>
          <option value="soc2">SOC2</option>
          <option value="pci">PCI</option>
        </select>
        <button onClick={checkCompliance} className="bg-yellow-600 px-3 py-1 rounded">Check Compliance</button>
      </div>
      <textarea
        rows={3}
        className="w-full bg-antigravity-bg border border-antigravity-border rounded p-2 mb-2"
        placeholder="Describe what you want to build (compliance-aware)..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <button onClick={generateCode} disabled={loading} className="bg-antigravity-accent px-4 py-2 rounded w-full">
        {loading ? 'Generating...' : 'Generate Compliant Code'}
      </button>
      {generatedCode && (
        <div className="mt-4">
          <p className="text-sm text-green-400 mb-1">Generated Code (preview):</p>
          <pre className="bg-antigravity-bg p-2 rounded text-xs overflow-auto max-h-48">{generatedCode.substring(0, 500)}...</pre>
        </div>
      )}
      {checkResult && (
        <div className={`mt-4 p-2 rounded ${checkResult.passed ? 'bg-green-900' : 'bg-red-900'}`}>
          <p><strong>Compliance: {checkResult.passed ? '✅ Passed' : '❌ Failed'}</strong></p>
          {checkResult.violations?.length > 0 && (
            <div>
              <p className="font-semibold mt-1">Violations:</p>
              <ul className="list-disc pl-5 text-sm">
                {checkResult.violations.map((v, i) => <li key={i}>{v}</li>)}
              </ul>
            </div>
          )}
          {checkResult.recommendations?.length > 0 && (
            <div>
              <p className="font-semibold mt-1">Recommendations:</p>
              <ul className="list-disc pl-5 text-sm">
                {checkResult.recommendations.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
