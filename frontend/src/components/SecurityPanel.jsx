// frontend/src/components/SecurityPanel.jsx
import React, { useState, useEffect } from 'react';

export default function SecurityPanel({ currentFile, fileContent, onApplyFix }) {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentFile && fileContent) {
      scanFile();
    }
  }, [currentFile, fileContent]);

  const scanFile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/security/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [currentFile]: fileContent })
      });
      const data = await res.json();
      setFindings(data[currentFile] || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const applyFix = async (vuln) => {
    const res = await fetch('/api/security/fix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_path: currentFile, vulnerability: vuln, code: fileContent })
    });
    const data = await res.json();
    if (data.fixed_code && onApplyFix) {
      onApplyFix(data.fixed_code);
    }
  };

  return (
    <div className="p-4 bg-antigravity-sidebar rounded-lg">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold">Security Scanner</h3>
        <button onClick={scanFile} className="text-xs bg-antigravity-tab px-2 py-1 rounded">Scan</button>
      </div>
      {loading && <p>Scanning...</p>}
      {findings.length === 0 && !loading && <p className="text-green-400">No vulnerabilities found.</p>}
      {findings.map((vuln, idx) => (
        <div key={idx} className="mb-3 p-2 border border-red-800 rounded">
          <div className="flex justify-between">
            <span className="font-bold text-red-400">{vuln.severity}</span>
            <span className="text-xs">{vuln.cwe_id}</span>
          </div>
          <p className="text-sm mt-1">{vuln.description}</p>
          <button onClick={() => applyFix(vuln)} className="mt-2 text-xs bg-antigravity-accent px-2 py-1 rounded">Auto-fix</button>
        </div>
      ))}
    </div>
  );
}
