import { useState } from 'react';

function DocumentSidebar({ 
  documents, 
  activeDocumentId, 
  uploadStatus, 
  onFileUpload, 
  onDocumentClick, 
  onDeleteDocument 
}) {
  const [hoveredDocId, setHoveredDocId] = useState(null);

  return (
    <>
      <h3>Documents</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <input
          type="file"
          multiple
          id="file-upload"
          accept=".txt,.md,.rtf"
          style={{ display: 'none' }}
          onChange={onFileUpload}
        />
        <label htmlFor="file-upload" style={{ padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white', borderRadius: '4px', cursor: 'pointer', display: 'block', textAlign: 'center' }}>
          ➕ Import Documents
        </label>
        <div style={{ marginTop: '10px', color: '#646cff', fontSize: '14px', textAlign: 'center' }}>{uploadStatus}</div>
      </div>

      <ul style={{ listStyleType: 'none', padding: 0, overflowY: 'auto', flex: 1 }}>
        {documents.length === 0 ? (
          <p style={{ color: '#888' }}>No documents yet.</p>
        ) : (
          documents.map(doc => (
            <li 
              key={doc.id} 
              onClick={() => onDocumentClick(doc.id)} 
              onMouseEnter={() => setHoveredDocId(doc.id)}
              onMouseLeave={() => setHoveredDocId(null)}
              style={{ 
                padding: '10px', 
                backgroundColor: activeDocumentId === doc.id ? '#646cff' : '#2a2a2a', 
                color: 'white', 
                marginBottom: '5px', 
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',                 
                justifyContent: 'space-between', 
                alignItems: 'center',
                width: '100%', 
                boxSizing: 'border-box',
                transition: 'background-color 0.2s'
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                📄 {doc.filename}
              </span>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation(); 
                  onDeleteDocument(doc.id, doc.filename);
                }}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#ff4444',
                  cursor: 'pointer',
                  padding: '6px',
                  fontSize: '16px',
                  borderRadius: '4px',
                  visibility: hoveredDocId === doc.id ? 'visible' : 'hidden',
                  opacity: hoveredDocId === doc.id ? 1 : 0,
                  transition: 'opacity 0.2s ease-in-out' 
                }}
                title="Delete Document"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </li>
          ))
        )}
      </ul>
    </>
  );
}

export default DocumentSidebar;