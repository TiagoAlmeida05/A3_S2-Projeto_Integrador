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
          accept=".txt,.md,.rtf,.pdf,.docx,.odt"
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
            <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', gap: '8px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M13 3H8.2C7.0799 3 6.51984 3 6.09202 3.21799C5.71569 3.40973 5.40973 3.71569 5.21799 4.09202C5 4.51984 5 5.0799 5 6.2V17.8C5 18.9201 5 19.4802 5.21799 19.908C5.40973 20.2843 5.71569 20.5903 6.09202 20.782C6.51984 21 7.0799 21 8.2 21H12M13 3L19 9M13 3V7.4C13 7.96005 13 8.24008 13.109 8.45399C13.2049 8.64215 13.3578 8.79513 13.546 8.89101C13.7599 9 14.0399 9 14.6 9H19M19 9V14.5M9 17H11.5M9 13H15M9 9H10M15.5 18.5H20.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {doc.filename}
              </span>
            </div>
              
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