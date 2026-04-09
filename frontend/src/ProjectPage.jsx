import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

function ProjectPage() {
  const { id } = useParams(); 
  const [documents, setDocuments] = useState([]);
  const [uploadStatus, setUploadStatus] = useState("");
  const [projectName, setProjectName] = useState("");
  const [activeDocument, setActiveDocument] = useState(null);
  const [hoveredDocId, setHoveredDocId] = useState(null);
  const [conflictDialog, setConflictDialog] = useState({
    isOpen: false,
    filename: "",
    suggestedName: "",
    resolve: null
  });

  const fetchProjectName = () => {
    fetch(`http://127.0.0.1:8000/projects/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.name) {
          setProjectName(data.name);
        }
      })
      .catch(err => console.error(err));
  };

  const fetchDocuments = () => {
    fetch(`http://127.0.0.1:8000/projects/${id}/documents/`)
      .then(res => res.json())
      .then(data => setDocuments(data))
      .catch(err => console.error(err));
  };

  const handleDocumentClick = (docId) => {
    fetch(`http://127.0.0.1:8000/projects/${id}/documents/${docId}`)
      .then(res => res.json())
      .then(data => setActiveDocument(data))
      .catch(err => console.error("Failed to fetch document content:", err));
  };

  useEffect(() => {
    fetchDocuments();
    fetchProjectName();
  }, [id]);

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files)  ;
    if (files.length === 0) return;

    setUploadStatus("Checking files...");
    const formData = new FormData();

    let existingNames = documents.map(doc => doc.filename);
    let filesToUploadCount = 0;
    
    for (let i = 0; i < files.length; i++) {

      let cur = files[i];
      let shouldUpload = true;
      let finalName = cur.name;
      
      let isNameValid = !existingNames.includes(finalName);

      while (!isNameValid && shouldUpload) {

          const DotIndex = finalName.lastIndexOf('.');
          const ext = DotIndex !== -1 ? finalName.substring(DotIndex) : "";
          const base = DotIndex !== -1 ? finalName.substring(0, DotIndex) : finalName;
          const suggestedN = `${base}_copy${ext}`;

          const userChoice = await new Promise((resolve) => {
            setConflictDialog({
              isOpen: true,
              filename: finalName,
              suggestedName: suggestedN,
              resolve: resolve //modal buttons
            });
         });

          if (userChoice.action === 'skip') {
            shouldUpload = false;
            break;
          }

          else if (userChoice.action === 'replace') {
            const oldDoc = documents.find(d => d.filename === finalName);
            if (oldDoc) {
              setUploadStatus(`Replacing ${finalName}...`);
              try {
                const delRes = await fetch(`http://127.0.0.1:8000/projects/${id}/documents/${oldDoc.id}`, { method: 'DELETE' });
                if (delRes.ok) {
                  isNameValid = true;
                  if (activeDocument && activeDocument.id === oldDoc.id) setActiveDocument(null);
                  existingNames = existingNames.filter(n => n !== finalName);
                } else {
                  window.alert(" Server failed to delete. Skipping.");
                  shouldUpload = false;
                }
              } catch (err) {
                window.alert("❌ Network error. Skipping.");
                shouldUpload = false;
              }
            }
        }
          else if (userChoice.action === 'rename') {
            let trimmedInput = userChoice.value.trim();
              // If they just hit enter on a blank box, restart the loop and ask again
              if (trimmedInput === "") {
                continue; 
              }
            // Put the extension back if they deleted it from the name
            if (ext && !trimmedInput.toLowerCase().endsWith(ext.toLowerCase())) {
              trimmedInput += ext;
            }
            finalName = trimmedInput;

            if (!existingNames.includes(finalName)) {
              isNameValid = true;
            }
          }
      }

      if (shouldUpload) {
        if (finalName !== cur.name) {
          cur = new File([cur], finalName, { type: cur.type });
        }
        
        formData.append("files", cur);
        filesToUploadCount++;
        // Add it to our tracking array so we don't allow duplicates in this same batch
        existingNames.push(finalName); 
      }
    }

    setConflictDialog(prev => ({ ...prev, isOpen: false }));

    //error handling
    if (filesToUploadCount === 0) {
      setUploadStatus("Upload cancelled. No files were added.");
      event.target.value = null; // Reset the input
      return;
    }

    fetch(`http://127.0.0.1:8000/projects/${id}/documents/`, {
      method: 'POST',
      body: formData,
    })
      .then(res => res.json())
      .then(data => {
        if (data.failed && data.failed.length > 0) {
          
          const errorList = data.failed.map(f => `${f.filename} (${f.reason})`).join(", ");
          
          if (data.successful.length > 0) {
            setUploadStatus(`Uploaded ${data.successful.length} files. Failed: ${errorList}`);
          } else {
            setUploadStatus(`All uploads failed: ${errorList}`);
          }
        }
        else {
          setUploadStatus("Upload complete!");
          setTimeout(() => setUploadStatus(""), 3000); // Clear message after 3s
        } 
        fetchDocuments(); 
      })
      .catch(err => {
        setUploadStatus("Upload failed.");
        console.error(err);
      });
    event.target.value = null;
  };

  const handleDeleteDocument = async (docId, docName) => {
    
    const confirmDelete = window.confirm(`Are you sure you want to delete "${docName}"? This cannot be undone.`);
    if (!confirmDelete) return;

    try {
      
      const response = await fetch(`http://127.0.0.1:8000/projects/${id}/documents/${docId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        
        setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== docId));
        
        if (activeDocument && activeDocument.id === docId) {
          setActiveDocument(null);
        }
        
        setUploadStatus(`Deleted ${docName}`);
        setTimeout(() => setUploadStatus(""), 3000);
      } else {
        setUploadStatus("Failed to delete document.");
      }
    } catch (err) {
      console.error(err);
      setUploadStatus(" Server error during deletion.");
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', textAlign: 'left', display: 'flex', flexDirection: 'column', height: '100vh', boxSizing: 'border-box' }}>
      
      {/* HEADER */}
      <div>
        <Link to="/" style={{ color: '#646cff', textDecoration: 'none' }}>← Back to Dashboard</Link>
        <h2 style={{ marginTop: '20px' }}>Project: {projectName}</h2>
      </div>

      {/*SIDE-BY-SIDE LAYOUT */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, marginTop: '20px', overflow: 'hidden' }}>
        
        {/* LEFT COLUMN: DOCUMENT LIST */}
        <div style={{ width: '300px', display: 'flex', flexDirection: 'column', border: '1px solid #ccc', borderRadius: '8px', padding: '20px', backgroundColor: '#1a1a1a' }}>
          <h3>Documents</h3>
          
          <div style={{ marginBottom: '20px' }}>
            <input
              type="file"
              multiple
              id="file-upload"
              accept=".txt,.md,.rtf"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <label htmlFor="file-upload" style={{ padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white', borderRadius: '4px', cursor: 'pointer', display: 'block', textAlign: 'center' }}>
              Import Documents
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
                  onClick={() => handleDocumentClick(doc.id)} 

                  onMouseEnter={() => setHoveredDocId(doc.id)}
                  onMouseLeave={() => setHoveredDocId(null)}

                  style={{ 
                    padding: '10px', 
                    backgroundColor: activeDocument?.id === doc.id ? '#646cff' : '#2a2a2a', // Highlights the selected file!
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
                      handleDeleteDocument(doc.id, doc.filename);
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
        </div>

        {/* TEXT VIEWER */}
        <div style={{ flex: 1, border: '1px solid #ccc', borderRadius: '8px', padding: '30px', backgroundColor: '#fff', color: '#333', overflowY: 'auto' }}>
          {activeDocument ? (
            <div>
              <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', marginTop: 0 }}>
                {activeDocument.filename}
              </h2>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '16px', lineHeight: '1.6', fontFamily: 'system-ui, sans-serif' }}>
                {activeDocument.content}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
              <p>Select a document from the sidebar to start reading.</p>
            </div>
          )}
        </div>

      </div>
      {/* --- CUSTOM COLLISION MODAL --- */}
      {conflictDialog.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000 // Ensures it floats on top of everything
        }}>
          <div style={{
            backgroundColor: '#242424', padding: '30px', borderRadius: '8px',
            border: '1px solid #444', width: '400px', color: 'white',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ marginTop: 0, color: '#ffcc00' }}>⚠️ File Already Exists</h3>
            <p>The file <strong>"{conflictDialog.filename}"</strong> already exists in this project.</p>
            
            <div style={{ marginTop: '20px', marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '5px' }}>
                Rename it (Extension added automatically):
              </label>
              <input 
                type="text" 
                defaultValue={conflictDialog.suggestedName}
                id="rename-input"
                style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#111', color: 'white' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <button 
                onClick={() => conflictDialog.resolve({ action: 'skip' })}
                style={{ flex: 1, padding: '10px', backgroundColor: 'transparent', border: '1px solid #666', color: '#ccc', borderRadius: '4px', cursor: 'pointer' }}
              >
                Skip File
              </button>
              
              <button 
                onClick={() => conflictDialog.resolve({ action: 'replace' })}
                style={{ flex: 1, padding: '10px', backgroundColor: '#8b0000', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer' }}
              >
                Replace Old
              </button>
              
              <button 
                onClick={() => {
                  const newName = document.getElementById('rename-input').value;
                  conflictDialog.resolve({ action: 'rename', value: newName });
                }}
                style={{ flex: 1.5, padding: '10px', backgroundColor: '#4CAF50', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectPage;