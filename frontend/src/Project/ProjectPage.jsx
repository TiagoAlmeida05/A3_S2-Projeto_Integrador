import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import CodeSidebar from './CodeSidebar';
import DocumentSidebar from './DocumentSidebar';
import CollisionModal from './CollisionModal';

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


  const [activeTab, setActiveTab] = useState('documents');

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
    <div style={{padding: 0,margin: 0, fontFamily: 'sans-serif', textAlign: 'left', display: 'flex', flexDirection: 'column', height: '100vh', boxSizing: 'border-box' }}>
      
      {/* HEADER */}

      <div style={{ padding: '15px 20px', backgroundColor: '#111', borderBottom: '1px solid #333' }}>
        <Link to="/" style={{ color: '#646cff', textDecoration: 'none' }}>← Back to Dashboard</Link>
        <h2 style={{ marginTop: '20px' }}>Workspace: {projectName}</h2>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <div style={{ 
          width: '60px', 
          backgroundColor: '#111', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          paddingTop: '20px',
          borderRight: '1px solid #333'
        }}>
          <button 
            onClick={() => setActiveTab('documents')}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '10px',
              opacity: activeTab === 'documents' ? 1 : 0.4, // Highlights the active icon
              borderLeft: activeTab === 'documents' ? '3px solid #646cff' : '3px solid transparent'
            }}
            title="Documents"
          >
            📄
          </button>
          
          <button 
            onClick={() => setActiveTab('codes')}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '10px',
              marginTop: '10px',
              opacity: activeTab === 'codes' ? 1 : 0.4,
              borderLeft: activeTab === 'codes' ? '3px solid #646cff' : '3px solid transparent'
            }}
            title="Codes"
          >
            🏷️
          </button>
        </div>

      {/*SIDE-BY-SIDE LAYOUT */}
        
        {/* LEFT COLUMN: DOCUMENT LIST */}
        <div style={{ width: '300px', display: 'flex', flexDirection: 'column', border: '1px solid #ccc', borderRadius: '8px', padding: '20px', backgroundColor: '#1a1a1a' }}>
        {activeTab === 'documents' && (
            <DocumentSidebar 
              documents={documents}
              activeDocumentId={activeDocument?.id}
              uploadStatus={uploadStatus}
              onFileUpload={handleFileUpload}
              onDocumentClick={handleDocumentClick}
              onDeleteDocument={handleDeleteDocument}
            />
          )}
          {activeTab === 'codes' && (
            <CodeSidebar projectId={id} />
          )}
        
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
      <CollisionModal 
        dialog={conflictDialog} 
        resolve={conflictDialog.resolve} 
      />
    </div>
  );
}

export default ProjectPage;