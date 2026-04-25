// frontend/src/components/VisionUploader.jsx
import React, { useState } from 'react';

export default function VisionUploader({ onPromptGenerated }) {
  const [uploading, setUploading] = useState(false);
  const [imageType, setImageType] = useState('diagram');

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`/api/vision/to-code?image_type=${imageType}`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.generation_prompt && onPromptGenerated) {
        onPromptGenerated(data.generation_prompt);
      }
      alert('Image analyzed! Generation prompt created.');
    } catch (err) {
      console.error(err);
      alert('Failed to analyze image');
    }
    setUploading(false);
  };

  return (
    <div className="p-4 bg-antigravity-sidebar rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Upload Design</h3>
      <div className="flex gap-2 mb-3">
        <select value={imageType} onChange={e => setImageType(e.target.value)} className="bg-antigravity-tab p-1 rounded text-sm">
          <option value="diagram">Architecture Diagram</option>
          <option value="erd">ERD (Database)</option>
          <option value="mockup">UI Mockup</option>
          <option value="flowchart">Flowchart</option>
          <option value="whiteboard">Whiteboard Photo</option>
        </select>
      </div>
      <label className="cursor-pointer bg-antigravity-accent px-4 py-2 rounded inline-block">
        {uploading ? 'Uploading...' : '📤 Upload Image'}
        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
      </label>
    </div>
  );
}
