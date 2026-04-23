// frontend/src/pages/Analytics.jsx
import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    fetchSummary();
  }, [days]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/summary?days=${days}`);
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const exportCSV = async () => {
    window.open(`/api/analytics/export?days=${days}`);
  };

  if (loading) return <div className="p-8 text-center">Loading analytics...</div>;
  if (!summary) return <div className="p-8 text-center">No data available. Generate some code first.</div>;

  const COLORS = ['#58A6FF', '#3FB950', '#D2A8FF', '#F0883E', '#FF7B72'];

  return (
    <div className="min-h-screen bg-antigravity-bg text-antigravity-text p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Team Analytics Dashboard</h1>
          <div className="flex gap-4">
            <select value={days} onChange={e => setDays(parseInt(e.target.value))} className="bg-antigravity-tab p-2 rounded">
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button onClick={exportCSV} className="bg-antigravity-accent px-4 py-2 rounded">Export CSV</button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-antigravity-sidebar p-4 rounded-lg">
            <div className="text-sm text-gray-400">Total Events</div>
            <div className="text-2xl font-bold">{summary.total_events}</div>
          </div>
          <div className="bg-antigravity-sidebar p-4 rounded-lg">
            <div className="text-sm text-gray-400">Total Tokens</div>
            <div className="text-2xl font-bold">{summary.total_tokens.toLocaleString()}</div>
          </div>
          <div className="bg-antigravity-sidebar p-4 rounded-lg">
            <div className="text-sm text-gray-400">Acceptance Rate</div>
            <div className="text-2xl font-bold">{(summary.acceptance_rate * 100).toFixed(1)}%</div>
          </div>
          <div className="bg-antigravity-sidebar p-4 rounded-lg">
            <div className="text-sm text-gray-400">Hours Saved</div>
            <div className="text-2xl font-bold">{summary.hours_saved.toFixed(1)}</div>
          </div>
        </div>

        {/* Chart: Tokens per day */}
        <div className="bg-antigravity-sidebar p-4 rounded-lg mb-8">
          <h2 className="text-lg font-semibold mb-4">Tokens per Day</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={summary.tokens_per_day}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
              <XAxis dataKey="date" stroke="#8B949E" />
              <YAxis stroke="#8B949E" />
              <Tooltip contentStyle={{ backgroundColor: '#161B22', border: '1px solid #30363D' }} />
              <Legend />
              <Line type="monotone" dataKey="tokens" stroke="#58A6FF" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Two column: Top Models & Events by Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-antigravity-sidebar p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Top Models</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={summary.top_models}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
                <XAxis dataKey="model" stroke="#8B949E" />
                <YAxis stroke="#8B949E" />
                <Tooltip contentStyle={{ backgroundColor: '#161B22', border: '1px solid #30363D' }} />
                <Bar dataKey="count" fill="#58A6FF" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-antigravity-sidebar p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Events by Type</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={Object.entries(summary.events_by_type).map(([name, value]) => ({ name, value }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {Object.entries(summary.events_by_type).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#161B22', border: '1px solid #30363D' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Users list */}
        <div className="bg-antigravity-sidebar p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Active Users</h2>
          <div className="flex flex-wrap gap-2">
            {summary.users.map(user => (
              <span key={user} className="bg-antigravity-tab px-3 py-1 rounded-full text-sm">{user}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
