import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import CodeSidebar from './CodeSidebar';
import DocumentSidebar from './DocumentSidebar';
import CollisionModal from './CollisionModal';
import ProjectSettingsModal from './ProjectSettingsModal';

function ProjectPage() {
  const { id } = useParams(); 
  const [documents, setDocuments] = useState([]);
  const [uploadStatus, setUploadStatus] = useState("");
  const [projectDetails, setProjectDetails] = useState({ name: "", description: "",localPath: "" }); 
  const [activeDocument, setActiveDocument] = useState(null);
  const [conflictDialog, setConflictDialog] = useState({
    isOpen: false,
    filename: "",
    suggestedName: "",
    resolve: null
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('documents');

  const fetchProjectDetails = () => {
    fetch(`http://127.0.0.1:8000/projects/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.name) {
          setProjectDetails({ name: data.name, description: data.description || "" , localPath: data.local_path || ""});
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
    fetchProjectDetails();
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

  const handleSaveSettings = async (newName, newDescription) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: newDescription })
      });
      
      if (res.ok) {
        setProjectDetails({ name: newName, description: newDescription }); // Update the UI instantly
        setIsSettingsOpen(false); // Close the modal
      } else {
        alert("Failed to update project settings.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{padding: 0,margin: 0, fontFamily: 'sans-serif', textAlign: 'left', display: 'flex', flexDirection: 'column', height: '100vh', boxSizing: 'border-box' }}>
      
      {/* HEADER */}

      <div style={{ padding: '15px 20px', backgroundColor: '#111', borderBottom: '1px solid #333' }}>
        <Link to="/" style={{ color: '#646cff', textDecoration: 'none' }}>← Back to Dashboard</Link>
        <h2 style={{ marginTop: '20px' }}>Project: {projectDetails.name}</h2>
      </div>

      <button 
          onClick={() => setIsSettingsOpen(true)}
          style={{ backgroundColor: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '4px' }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#222'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {/* Professional SVG Gear Icon */}
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          Settings
        </button>

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
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3 8.2C3 7.07989 3 6.51984 3.21799 6.09202C3.40973 5.71569 3.71569 5.40973 4.09202 5.21799C4.51984 5 5.0799 5 6.2 5H9.67452C10.1637 5 10.4083 5 10.6385 5.05526C10.8425 5.10425 11.0376 5.18506 11.2166 5.29472C11.4184 5.4184 11.5914 5.59135 11.9373 5.93726L12.0627 6.06274C12.4086 6.40865 12.5816 6.5816 12.7834 6.70528C12.9624 6.81494 13.1575 6.89575 13.3615 6.94474C13.5917 7 13.8363 7 14.3255 7H17.8C18.9201 7 19.4802 7 19.908 7.21799C20.2843 7.40973 20.5903 7.71569 20.782 8.09202C21 8.51984 21 9.0799 21 10.2V15.8C21 16.9201 21 17.4802 20.782 17.908C20.5903 18.2843 20.2843 18.5903 19.908 18.782C19.4802 19 18.9201 19 17.8 19H6.2C5.07989 19 4.51984 19 4.09202 18.782C3.71569 18.5903 3.40973 18.2843 3.21799 17.908C3 17.4802 3 16.9201 3 15.8V8.2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>

              </svg>
          </button>
          
          <button 
            onClick={() => setActiveTab('codes')}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '10px',
              marginTop: '10px',
              opacity: activeTab === 'codes' ? 1 : 0.4,
              borderLeft: activeTab === 'codes' ? '3px solid #646cff' : '3px solid transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Codes"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none">
              <path d="M7.0498 7.0498H7.0598M10.5118 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V10.5118C3 11.2455 3 11.6124 3.08289 11.9577C3.15638 12.2638 3.27759 12.5564 3.44208 12.8249C3.6276 13.1276 3.88703 13.387 4.40589 13.9059L9.10589 18.6059C10.2939 19.7939 10.888 20.388 11.5729 20.6105C12.1755 20.8063 12.8245 20.8063 13.4271 20.6105C14.112 20.388 14.7061 19.7939 15.8941 18.6059L18.6059 15.8941C19.7939 14.7061 20.388 14.112 20.6105 13.4271C20.8063 12.8245 20.8063 12.1755 20.6105 11.5729C20.388 10.888 19.7939 10.2939 18.6059 9.10589L13.9059 4.40589C13.387 3.88703 13.1276 3.6276 12.8249 3.44208C12.5564 3.27759 12.2638 3.15638 11.9577 3.08289C11.6124 3 11.2455 3 10.5118 3ZM7.5498 7.0498C7.5498 7.32595 7.32595 7.5498 7.0498 7.5498C6.77366 7.5498 6.5498 7.32595 6.5498 7.0498C6.5498 6.77366 6.77366 6.5498 7.0498 6.5498C7.32595 6.5498 7.5498 6.77366 7.5498 7.0498Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
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
      <ProjectSettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentName={projectDetails.name}
        currentDescription={projectDetails.description}
        currentLocalPath={projectDetails.localPath}
        onSave={handleSaveSettings}
      />
    </div>
  );
}

export default ProjectPage;