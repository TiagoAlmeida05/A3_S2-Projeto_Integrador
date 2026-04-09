import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

function ProjectPage() {
  const { id } = useParams(); 
  const [documents, setDocuments] = useState([]);
  const [uploadStatus, setUploadStatus] = useState("");
  const [projectName, setProjectName] = useState("");
  const [activeDocument, setActiveDocument] = useState(null);
  const [hoveredDocId, setHoveredDocId] = useState(null);

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

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files)  ;
    if (files.length === 0) return;

    setUploadStatus("Checking files...");
    const formData = new FormData();

    const existingNames = documents.map(doc => doc.filename);
    let filesToUploadCount = 0;
    
    for (let i = 0; i < files.length; i++) {

      let cur = files[i];
      let shouldUpload = true;
      let finalName = cur.name;
      let isNameValid = false;

      while (!isNameValid) {
        if (existingNames.includes(finalName)) {
          
          const DotIndex = finalName.lastIndexOf('.');
          const ext = DotIndex !== -1 ? finalName.substring(DotIndex) : "";
          const base = DotIndex !== -1 ? finalName.substring(0, DotIndex) : finalName;
          const suggestedName = `${base}_copy${ext}`;

          const userInput = window.prompt(
            `The file "${finalName}" already exists.\n\nPlease type a unique name below, or click Cancel to skip.`,
            suggestedName 
          );

          // If they click Cancel, we immediately break the loop and skip the file.
          if (userInput === null) {
            shouldUpload = false;
            break; 
          }

          let trimmedInput = userInput.trim();
          
          // If they just hit enter on a blank box, restart the loop and ask again
          if (trimmedInput === "") {
            continue; 
          }

          // Put the extension back if they deleted it from the name
          if (ext && !trimmedInput.toLowerCase().endsWith(ext.toLowerCase())) {
            trimmedInput += ext;
          }

          finalName = trimmedInput;
          
        } else {
          isNameValid = true; //normal case
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
        <h2 style={{ marginTop: '20px' }}>Workspace: {projectName}</h2>
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
                      padding: '2px 6px',
                      fontSize: '16px',
                      borderRadius: '4px',

                      visibility: hoveredDocId === doc.id ? 'visible' : 'hidden',
                      opacity: hoveredDocId === doc.id ? 1 : 0,
                      transition: 'opacity 0.2s ease-in-out' 
                    }}
                    title="Delete Document"
                  >
                    ✖
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
    </div>
  );
}

export default ProjectPage;