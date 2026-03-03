import React, { useState } from 'react';
import { X, AlertTriangle, Shield } from 'lucide-react';

const CompliancePanel = ({ projectId, onClose }) => {
    const [scanning, setScanning] = useState(false);
    const [issues, setIssues] = useState([]);
    const [summary, setSummary] = useState(null);
    const [error, setError] = useState(null);

    const runScan = async () => {
    if (!projectId) {
        setError("No project selected. Please open a project first.");
        return;
    }
        setScanning(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${(import.meta.env.VITE_API_URL || "http://localhost:8000")}/api/compliance/scan/${projectId}`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ scan_type: 'both' })
            });
            if (!res.ok) throw new Error('Scan failed');
            const data = await res.json();
            setIssues(data.issues);
            setSummary(data.summary);
        } catch (err) {
            setError(`Scan failed: ${err.message}`); if (err.response) { const text = await err.response.text(); setError(`Server: ${text}`); }} finally {
            setScanning(false);
        }
    };

    const fixIssue = async (issueId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${(import.meta.env.VITE_API_URL || "http://localhost:8000")}/api/compliance/fix/${projectId}?issue_id=${issueId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Fix failed');
            runScan();
        } catch (err) {
            alert(err.message);
        }
    };

    const getImpactColor = (impact) => {
        switch(impact) {
            case 'critical': return 'text-red-600 bg-red-100';
            case 'serious': return 'text-orange-600 bg-orange-100';
            case 'moderate': return 'text-yellow-600 bg-yellow-100';
            default: return 'text-blue-600 bg-blue-100';
        }
    };

    return (
        <div className="p-4 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Shield className="w-5 h-5" /> Compliance Check
                </h3>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {!summary && !scanning && !error && (
                <button
                    onClick={runScan}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 self-start"
                >
                    Run Compliance Scan
                </button>
            )}

            {scanning && <p className="text-gray-600">Scanning...</p>}

            {error && <p className="text-red-600">Error: {error}</p>}

            {summary && (
                <div className="mt-4">
                    <div className="grid grid-cols-4 gap-2 mb-4">
                        <div className="bg-red-100 p-2 rounded text-center">
                            <span className="text-xl font-bold text-red-700">{summary.critical}</span>
                            <p className="text-xs text-red-600">Critical</p>
                        </div>
                        <div className="bg-orange-100 p-2 rounded text-center">
                            <span className="text-xl font-bold text-orange-700">{summary.serious}</span>
                            <p className="text-xs text-orange-600">Serious</p>
                        </div>
                        <div className="bg-yellow-100 p-2 rounded text-center">
                            <span className="text-xl font-bold text-yellow-700">{summary.moderate}</span>
                            <p className="text-xs text-yellow-600">Moderate</p>
                        </div>
                        <div className="bg-blue-100 p-2 rounded text-center">
                            <span className="text-xl font-bold text-blue-700">{summary.minor || 0}</span>
                            <p className="text-xs text-blue-600">Minor</p>
                        </div>
                    </div>

                    <div className="overflow-y-auto">
                        {issues.map((issue, idx) => (
                            <div key={idx} className="border rounded p-3 mb-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className={`w-4 h-4 mt-1 ${getImpactColor(issue.impact).split(' ')[0]}`} />
                                        <div>
                                            <p className="font-medium">{issue.description}</p>
                                            <p className="text-sm text-gray-600">Rule: {issue.rule_id}</p>
                                            {issue.fix_suggestion && (
                                                <p className="text-sm text-green-600 mt-1">{issue.fix_suggestion}</p>
                                            )}
                                        </div>
                                    </div>
                                    {issue.fixable && (
                                        <button
                                            onClick={() => fixIssue(issue.rule_id)}
                                            className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                                        >
                                            Fix
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompliancePanel;



