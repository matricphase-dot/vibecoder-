// frontend/src/components/DebugPanel.jsx
import React, { useState } from 'react';

export default function DebugPanel({ previewUrl, onAutoFix }) {
  const [debugging, setDebugging] = useState(false);
  const [errors, setErrors] = useState([]);
  const [screenshot, setScreenshot] = useState(null);
  const [brokenElements, setBrokenElements] = useState([]);

  const runDebug = async () => {
    setDebugging(true);
    try {
      const res = await fetch(`/api/debug/browser?preview_url=${encodeURIComponent(previewUrl)}`, {
        method: 'POST'
      });
      const data = await res.json();
      setErrors(data.errors || []);
      setScreenshot(data.screenshot ? `data:image/png;base64,${data.screenshot}` : null);
      setBrokenElements(data.broken_elements || []);
      if (data.errors.length > 0 && onAutoFix) {
        onAutoFix(data.errors[0].message);
      }
    } catch (err) {
      console.error("Debug failed", err);
    }
    setDebugging(false);
  };

  return (
    <div className="p-4 bg-antigravity-sidebar rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Browser Debugger</h3>
        <button
          onClick={runDebug}
          disabled={debugging}
          className="bg-antigravity-accent px-4 py-2 rounded disabled:opacity-50"
        >
          {debugging ? "Debugging..." : "Run Debug"}
        </button>
      </div>
      {screenshot && (
        <div className="mb-4">
          <p className="text-sm text-gray-400 mb-2">Screenshot:</p>
          <img src={screenshot} alt="Preview screenshot" className="border border-antigravity-border rounded max-w-full h-auto" />
        </div>
      )}
      {errors.length > 0 && (
        <div className="mb-4">
          <p className="text-red-400 font-semibold">Console Errors:</p>
          <ul className="list-disc pl-5 text-sm">
            {errors.map((err, idx) => (
              <li key={idx}>{err.message} (line {err.line})</li>
            ))}
          </ul>
        </div>
      )}
      {brokenElements.length > 0 && (
        <div className="mb-4">
          <p className="text-yellow-400 font-semibold">Broken Elements:</p>
          <ul className="list-disc pl-5 text-sm">
            {brokenElements.map((el, idx) => (
              <li key={idx}>{el.type}: {el.description}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
