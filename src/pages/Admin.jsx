import React, { useState, useEffect } from 'react';

function Admin() {
  const [activeTab, setActiveTab] = useState('ingest'); // 'ingest' or 'review'
  
  // Ingest State
  const [files, setFiles] = useState([]);
  const [metadata, setMetadata] = useState({
    board: 'NCERT',
    grade: 'Class 1',
    bookName: '',
    sourceType: 'textbook'
  });
  const [forceOverwrite, setForceOverwrite] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  // Review State
  const [drafts, setDrafts] = useState([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [publishStatus, setPublishStatus] = useState(null); // success/error message for publishing

  // Fetch drafts when switching to review tab
  useEffect(() => {
    if (activeTab === 'review') {
      fetchDrafts();
    }
  }, [activeTab]);

  const fetchDrafts = async () => {
    setIsLoadingDrafts(true);
    try {
      const response = await fetch('http://localhost:3001/api/drafts');
      const data = await response.json();
      setDrafts(data.drafts || []);
    } catch (error) {
      console.error("Failed to fetch drafts:", error);
    }
    setIsLoadingDrafts(false);
  };

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (files.length === 0) return alert('Please select files first!');

    setIsUploading(true);
    setUploadStatus("Uploading to Local Server...");

    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('metadata', JSON.stringify(metadata));
    formData.append('forceOverwrite', forceOverwrite.toString());

    try {
      const response = await fetch('http://localhost:3001/api/ingest', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Server returned an error');
      }
      
      setUploadStatus(`Success! ${data.message}`);
      setFiles([]); // Clear files after successful upload
    } catch (error) {
      console.error("Upload failed", error);
      setUploadStatus(`Upload failed: ${error.message}`);
    }
    
    setIsUploading(false);
  };

  const handlePublish = async (draftId) => {
    try {
      await fetch(`http://localhost:3001/api/drafts/${draftId}/publish`, { method: 'POST' });
      // Remove from UI
      setDrafts(drafts.filter(d => d.id !== draftId));
      setPublishStatus("✅ Poem published successfully!");
      setTimeout(() => setPublishStatus(null), 3000);
    } catch (error) {
      setPublishStatus("❌ Failed to publish");
      setTimeout(() => setPublishStatus(null), 3000);
    }
  };

  const handleReject = async (draftId) => {
    if (!window.confirm("Are you sure you want to delete this draft?")) return;
    try {
      const response = await fetch(`http://localhost:3001/api/drafts/${draftId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error("Server rejected deletion");
      
      // Remove from UI
      setDrafts(drafts.filter(d => d.id !== draftId));
    } catch (error) {
      console.error(error);
      alert("Failed to delete draft. Check console.");
    }
  };

  const renderIngestTab = () => (
    <div style={{ background: 'var(--color-surface)', padding: '2rem', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
      <h2>Bulk AI Ingestion 🤖</h2>
      <p style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem' }}>
        Upload PDFs or ZIP files. The local server will pass them to Gemini to extract poems.
      </p>

      <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        <div style={{ padding: '2rem', border: '2px dashed var(--color-primary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <input 
            type="file" 
            multiple 
            // webkitdirectory="true" // Uncomment to allow folder uploads!
            accept=".pdf,.zip,.png,.jpg"
            onChange={handleFileChange}
            style={{ marginBottom: '1rem' }}
          />
          <p>{files.length > 0 ? `${files.length} files selected` : 'Select PDFs, ZIPs, or Folders'}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <label>
            Board:
            <input type="text" value={metadata.board} onChange={e => setMetadata({...metadata, board: e.target.value})} style={inputStyle} />
          </label>
          <label>
            Grade:
            <input type="text" value={metadata.grade} onChange={e => setMetadata({...metadata, grade: e.target.value})} style={inputStyle} />
          </label>
          <label>
            Book Name:
            <input type="text" placeholder="e.g., Rimjhim" value={metadata.bookName} onChange={e => setMetadata({...metadata, bookName: e.target.value})} style={inputStyle} />
          </label>
          <label>
            Source Type:
            <select value={metadata.sourceType} onChange={e => setMetadata({...metadata, sourceType: e.target.value})} style={inputStyle}>
              <option value="textbook">Textbook</option>
              <option value="book">Book</option>
              <option value="original">Original</option>
            </select>
          </label>
        </div>

        <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--color-error)' }}>
            <input 
              type="checkbox" 
              checked={forceOverwrite} 
              onChange={(e) => setForceOverwrite(e.target.checked)} 
            />
            <b>Force Overwrite (Re-process even if this file was already ingested)</b>
          </label>
        </div>

        <button 
          type="submit" 
          disabled={isUploading}
          style={{ background: 'var(--color-primary)', color: 'white', padding: '1rem', borderRadius: 'var(--radius-full)', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
        >
          {isUploading ? 'Processing with Gemini...' : 'Start Extraction Pipeline'}
        </button>

        {uploadStatus && <p style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--color-success)' }}>{uploadStatus}</p>}
      </form>
    </div>
  );

  const renderReviewTab = () => (
    <div style={{ background: 'var(--color-surface)', padding: '2rem', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
      <h2>Draft Review Queue 📝</h2>
      <p style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem' }}>
        Review poems extracted by the AI before publishing them to the live site.
      </p>

      {isLoadingDrafts ? <p>Loading drafts...</p> : null}
      
      {publishStatus && (
        <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontWeight: 'bold', textAlign: 'center' }}>
          {publishStatus}
        </div>
      )}
      
      {drafts.length === 0 && !isLoadingDrafts ? (
        <p style={{ textAlign: 'center', padding: '2rem', border: '1px dashed #ccc' }}>No drafts pending review! You're all caught up.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {drafts.map(draft => (
            <div key={draft.id} style={{ border: '1px solid #eee', padding: '1.5rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--color-secondary)' }}>{draft.title}</h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem', color: 'var(--color-text-light)' }}>By: {draft.writer}</p>
                </div>
                <span style={{ background: '#fff3e0', color: '#e65100', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  {draft.education?.board} • {draft.education?.grade}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-light)', margin: 0 }}>Extracted via: {draft.metadata.extractedVia}</p>
                {draft.metadata.poemPdfPath && (
                  <a 
                    href={`http://localhost:3001${draft.metadata.poemPdfPath}`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ fontSize: '0.85rem', background: '#e3f2fd', color: '#1565c0', padding: '0.3rem 0.6rem', borderRadius: '4px', fontWeight: 'bold' }}
                  >
                    📄 View Poem PDF {draft.metadata.sourcePageRange ? `(Source: pp. ${draft.metadata.sourcePageRange})` : ''}
                  </a>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-light)', background: '#f5f5f5', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                  <b>URL:</b> /{draft.urlTitle}
                </p>
                {draft.tags && draft.tags.length > 0 && (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-light)', background: '#e8f5e9', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    <b>Tags:</b> {draft.tags.join(', ')}
                  </p>
                )}
              </div>
              
              <div style={{ background: 'var(--color-background)', padding: '1rem', borderRadius: 'var(--radius-sm)', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                {draft.text}
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => handleReject(draft.id)}
                  style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--color-error)', color: 'var(--color-error)', borderRadius: 'var(--radius-full)', cursor: 'pointer' }}
                >
                  Reject / Delete
                </button>
                <button onClick={() => handlePublish(draft.id)} style={{ padding: '0.5rem 1.5rem', background: 'var(--color-success)', color: 'white', border: 'none', borderRadius: 'var(--radius-full)', fontWeight: 'bold', cursor: 'pointer' }}>
                  ✅ Publish
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '900px' }}>
      <h1 className="title" style={{ marginTop: '2rem', textAlign: 'center' }}>Admin Dashboard</h1>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', justifyContent: 'center' }}>
        <button 
          onClick={() => setActiveTab('ingest')}
          style={{ ...tabStyle, background: activeTab === 'ingest' ? 'var(--color-text)' : '#eee', color: activeTab === 'ingest' ? 'white' : 'black' }}
        >
          1. Upload & Ingest
        </button>
        <button 
          onClick={() => setActiveTab('review')}
          style={{ ...tabStyle, background: activeTab === 'review' ? 'var(--color-text)' : '#eee', color: activeTab === 'review' ? 'white' : 'black' }}
        >
          2. Review & Publish
        </button>
      </div>

      {activeTab === 'ingest' ? renderIngestTab() : renderReviewTab()}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '0.75rem',
  marginTop: '0.25rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid #ccc',
  fontFamily: 'var(--font-main)'
};

const tabStyle = {
  padding: '0.75rem 2rem',
  borderRadius: 'var(--radius-full)',
  fontWeight: 'bold',
  border: 'none',
  cursor: 'pointer',
  transition: 'background 0.2s'
};

export default Admin;
