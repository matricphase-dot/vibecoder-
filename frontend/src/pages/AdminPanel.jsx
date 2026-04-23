// frontend/src/pages/AdminPanel.jsx
import React, { useState, useEffect } from 'react';

export default function AdminPanel() {
  const [enterpriseMode, setEnterpriseMode] = useState(false);
  const [auditReport, setAuditReport] = useState(null);
  const [integrity, setIntegrity] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEnterpriseStatus();
  }, []);

  const fetchEnterpriseStatus = async () => {
    const res = await fetch('/admin/enterprise/status');
    const data = await res.json();
    setEnterpriseMode(data.enterprise_mode);
  };

  const fetchAuditReport = async () => {
    setLoading(true);
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    const res = await fetch(`/admin/audit/export?start_date=${start.toISOString()}&end_date=${end.toISOString()}`);
    const data = await res.json();
    setAuditReport(data);
    setLoading(false);
  };

  const verifyIntegrity = async () => {
    const res = await fetch('/admin/audit/verify');
    const data = await res.json();
    setIntegrity(data);
  };

  const toggleEnterprise = async (enabled) => {
    await fetch('/admin/enterprise/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    fetchEnterpriseStatus();
  };

  return (
    <div className="p-6 bg-antigravity-bg min-h-screen text-antigravity-text">
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>
      <div className="grid gap-6">
        {/* Enterprise Mode */}
        <div className="bg-antigravity-sidebar p-4 rounded-lg border border-antigravity-border">
          <h2 className="text-lg font-semibold mb-2">Enterprise Mode</h2>
          <p className="text-sm text-gray-400 mb-4">When enabled, VibeCoder makes zero outbound network calls (local Ollama only).</p>
          <div className="flex gap-4">
            <button
              onClick={() => toggleEnterprise(true)}
              className={`px-4 py-2 rounded ${enterpriseMode ? 'bg-green-600' : 'bg-antigravity-tab'}`}
            >
              Enable
            </button>
            <button
              onClick={() => toggleEnterprise(false)}
              className={`px-4 py-2 rounded ${!enterpriseMode ? 'bg-red-600' : 'bg-antigravity-tab'}`}
            >
              Disable
            </button>
          </div>
          <div className="mt-2 text-sm">Current: {enterpriseMode ? '🔒 ENTERPRISE (offline)' : '🌐 Standard (cloud allowed)'}</div>
        </div>

        {/* Audit Logs */}
        <div className="bg-antigravity-sidebar p-4 rounded-lg border border-antigravity-border">
          <h2 className="text-lg font-semibold mb-2">Audit Logs</h2>
          <div className="flex gap-4 mb-4">
            <button onClick={fetchAuditReport} className="bg-antigravity-accent px-4 py-2 rounded">Generate Report (last 30 days)</button>
            <button onClick={verifyIntegrity} className="bg-antigravity-tab px-4 py-2 rounded">Verify Integrity</button>
          </div>
          {loading && <p>Loading...</p>}
          {auditReport && (
            <div className="text-sm space-y-2">
              <p><strong>Period:</strong> {auditReport.period_days} days</p>
              <p><strong>Total events:</strong> {auditReport.total_events}</p>
              <p><strong>Unique users:</strong> {auditReport.unique_users.join(', ')}</p>
              <p><strong>Models used:</strong> {auditReport.models_used.join(', ')}</p>
              <p><strong>Total tokens:</strong> {auditReport.total_tokens}</p>
              <p><strong>Events by type:</strong> {JSON.stringify(auditReport.events_by_type)}</p>
            </div>
          )}
          {integrity && (
            <div className={`mt-4 p-2 rounded ${integrity.valid ? 'bg-green-900' : 'bg-red-900'}`}>
              Integrity: {integrity.valid ? '✅ Valid' : `❌ Tampered rows: ${integrity.tampered_rows.join(', ')}`}
            </div>
          )}
        </div>

        {/* PII Test */}
        <div className="bg-antigravity-sidebar p-4 rounded-lg border border-antigravity-border">
          <h2 className="text-lg font-semibold mb-2">PII Redaction Test (HIPAA)</h2>
          <textarea id="pii-input" className="w-full bg-antigravity-bg p-2 rounded" rows="3" placeholder="Enter text with phone numbers, emails, SSN..."></textarea>
          <button
            onClick={async () => {
              const text = document.getElementById('pii-input').value;
              const res = await fetch('/admin/pii/redact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `text=${encodeURIComponent(text)}`
              });
              const data = await res.json();
              alert(`Redacted:\n${data.redacted}`);
            }}
            className="mt-2 bg-antigravity-accent px-4 py-2 rounded"
          >
            Redact PII
          </button>
        </div>
      </div>
    </div>
  );
}
