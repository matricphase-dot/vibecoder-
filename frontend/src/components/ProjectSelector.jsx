import { useState, useEffect } from 'react';
import { apiUrl } from '../config';

export default function ProjectSelector({ onProjectSelected, currentProject }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadProjects = async () => {
    try {
      const res = await fetch(apiUrl('/workspace/list'));
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects', err);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const openProject = async (path) => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/workspace/open'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      const project = await res.json();
      await loadProjects();
      if (onProjectSelected) onProjectSelected(project);
    } catch (err) {
      alert('Failed to open project: ' + err.message);
    }
    setLoading(false);
  };

  const selectExisting = async (project) => {
    if (onProjectSelected) onProjectSelected(project);
  };

  return (
    <div style={{ background: '#1E293B', borderRadius: 8, padding: 8, marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={() => {
            const path = prompt('Enter project folder path:');
            if (path) openProject(path);
          }}
          style={{ background: '#1D4ED8', border: 'none', color: 'white', padding: '4px 12px', borderRadius: 6, cursor: 'pointer' }}
        >
          📂 Open Project
        </button>
        {currentProject && (
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>
            Current: <strong>{currentProject.name}</strong> ({currentProject.path})
          </span>
        )}
        {loading && <span style={{ fontSize: 12, color: '#FBBF24' }}>Loading...</span>}
      </div>
      {projects.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Recent projects:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => selectExisting(p)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #333', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
