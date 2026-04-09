import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import CodeSidebar from './CodeSidebar';
import DocumentSidebar from './DocumentSidebar';
import CollisionModal from './CollisionModal';

const API_BASE = 'http://127.0.0.1:8000';

function ProjectPage() {
  const { id } = useParams(); 
  const viewerRef = useRef(null);

  // STATE MANAGEMENT

  // Project & Document State
  const [projectName, setProjectName] = useState("");
  const [documents, setDocuments] = useState([]);
  const [activeDocument, setActiveDocument] = useState(null);
  const [documentSegments, setDocumentSegments] = useState([]);
  const [projectCodes, setProjectCodes] = useState([]);
  
  // UI & Navigation State
  const [activeTab, setActiveTab] = useState('documents');
  const [uploadStatus, setUploadStatus] = useState("");
  const [hoveredDocId, setHoveredDocId] = useState(null); 
  
  // Quick-Code & Text Selection State
  const [selectionText, setSelectionText] = useState("");
  const [selectionRect, setSelectionRect] = useState(null);
  const [selectionOffsets, setSelectionOffsets] = useState(null);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);

  const [quickCodeMode, setQuickCodeMode] = useState("new");
  const [selectedExistingCodeId, setSelectedExistingCodeId] = useState("");

  const [quickCodeName, setQuickCodeName] = useState("");
  const [quickCodeColor, setQuickCodeColor] = useState("#646cff");

  //  File Upload Conflict State
  const [conflictDialog, setConflictDialog] = useState({
    isOpen: false,
    filename: "",
    suggestedName: "",
    resolve: null
  });

  // DATA FETCHING

  const fetchProjectName = () => {
    fetch(`${API_BASE}/projects/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.name) setProjectName(data.name);
      })
      .catch(err => console.error(err));
  };

  const fetchDocuments = () => {
    fetch(`${API_BASE}/projects/${id}/documents/`)
      .then(res => res.json())
      .then(data => setDocuments(data))
      .catch(err => console.error(err));
  };

  const fetchCodes = () => {
    fetch(`${API_BASE}/projects/${id}/codes`)
      .then(res => res.json())
      .then(data => setProjectCodes(data))
      .catch(err => console.error(err));
  };

  const handleDocumentClick = (docId) => {
    fetch(`${API_BASE}/projects/${id}/documents/${docId}`)
      .then(res => res.json())
      .then(data => setActiveDocument(data))
      .catch(err => console.error("Failed to fetch document content:", err));

    // Fetch segments for this document
    fetch(`${API_BASE}/projects/${id}/segments?document_id=${docId}`)
      .then(res => res.json())
      .then(data => setDocumentSegments(data))
      .catch(err => console.error("Failed to fetch segments:", err));
  };

  useEffect(() => {
    fetchDocuments();
    fetchProjectName();
    fetchCodes();
  }, [id]);

  // TEXT SELECTION & QUICK-CODE LOGIC

  const clearTextSelection = () => {
    setSelectionText("");
    setSelectionRect(null);
    setSelectionOffsets(null);
    setQuickMenuOpen(false);
    setQuickCodeName("");
    setQuickCodeColor("#646cff");
  };

  const getSelectionOffsets = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !viewerRef.current) return null;

    const range = selection.getRangeAt(0);
    const startRange = document.createRange();
    startRange.setStart(viewerRef.current, 0);
    startRange.setEnd(range.startContainer, range.startOffset);
    
    const start = startRange.toString().length;
    const end = start + range.toString().length;

    return { start, end };
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return clearTextSelection();

    const selectedText = selection.toString();
    if (!selectedText.trim() || !viewerRef.current) return clearTextSelection();

    const range = selection.getRangeAt(0);
    if (!viewerRef.current.contains(range.commonAncestorContainer)) return clearTextSelection();

    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return clearTextSelection();

    const offsetValues = getSelectionOffsets();
    if (!offsetValues) return clearTextSelection();

    // Clamp the floating quick-code menu inside the browser viewport.
    const safeLeft = Math.max(8, Math.min(rect.left, window.innerWidth - 280));
    const safeTop = Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - 220));

    setSelectionText(selectedText);
    setSelectionRect({ top: safeTop, left: safeLeft });
    setSelectionOffsets(offsetValues);

    if (projectCodes.length > 0) {
      setQuickCodeMode("existing");
      setSelectedExistingCodeId(projectCodes[0].id.toString())
    } else {
      setQuickCodeMode("new");
    }

    setQuickCodeName(selectedText.length > 30 ? `${selectedText.slice(0, 27)}...` : selectedText);
    setQuickCodeColor("#646cff");
    setQuickMenuOpen(true);
  };

  const handleQuickCodeAction = async () => {
    if (!selectionText || !activeDocument || !selectionOffsets) return;
    
    const offsets = selectionOffsets;    
    setUploadStatus('Creating quick code...');

    try {
      let finalCodeID;
      if( quickCodeMode === "new") {
        const codeName = quickCodeName.trim() || (selectionText.length > 30 ? '${selectionText.slice(0, 27)}...' : selectionText);

        const codeResponse = await fetch(`${API_BASE}/projects/${id}/codes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: codeName,
            color: quickCodeColor,
            description: 'Created from selected text',
            parent_id: null
          })
        });

        const createdCode = await codeResponse.json();
        if (!codeResponse.ok) throw new Error(createdCode.detail || 'Failed to create quick code');

        finalCodeID = createdCode.id;

        fetchCodes();
      } else {
        finalCodeID = parseInt(selectedExistingCodeId);
      }

      //Create the segment
      const segmentResponse = await fetch(`${API_BASE}/projects/${id}/segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: activeDocument.id,
          code_id: finalCodeID,
          start_char: offsets.start,
          end_char: offsets.end,
          content: selectionText
        })
      });

      const createdSegment = await segmentResponse.json();
      if (!segmentResponse.ok) throw new Error(createdSegment.detail || 'Failed to save segment');

      setUploadStatus('Code applied!');
      setTimeout(() => setUploadStatus(''), 3000);
      clearTextSelection();
      window.getSelection()?.removeAllRanges();
      
      // Add the new segment to the state
      setDocumentSegments(prev => [...prev, createdSegment]);
      
    } catch (error) {
      console.error(error);
      setUploadStatus('Failed to apply code.');
    }
  };

  const handleDeleteCode = async (codeId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this code? This will remove all highlights associated with it.")
    if(!confirmDelete) return;

    try{
      const response = await fetch(`${API_BASE}/projects/${id}/codes/${codeId}`, {method: 'DELETE'});
      if(response.ok){
        setProjectCodes(prev => prev.filter(c => c.id !== codeId));
        setDocumentSegments(prev => prev.filter(s => s.code_id !== codeId));
      } else {
        console.error("Failed to delete code");
      }
    } catch (error){
      console.error("Error deleting code:", error);
    }
  };

  // Quick Code Keyboard Shortcuts
  useEffect(() => {
    const handleKeyUp = (event) => {
      if (event.key === 'Enter' && quickMenuOpen) {
        event.preventDefault();
        handleQuickCodeAction();
      } else if (event.key.startsWith('Arrow')) {
        handleTextSelection();
      }
    };

    document.addEventListener('keyup', handleKeyUp);
    return () => document.removeEventListener('keyup', handleKeyUp);
  }, [quickMenuOpen, selectionText, quickCodeName, quickCodeColor, selectionOffsets, activeDocument]);


  // FILE MANAGEMENT LOGIC

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
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
            setConflictDialog({ isOpen: true, filename: finalName, suggestedName: suggestedN, resolve });
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
                const delRes = await fetch(`${API_BASE}/projects/${id}/documents/${oldDoc.id}`, { method: 'DELETE' });
                if (delRes.ok) {
                  isNameValid = true;
                  if (activeDocument && activeDocument.id === oldDoc.id) setActiveDocument(null);
                  existingNames = existingNames.filter(n => n !== finalName);
                } else {
                  window.alert("Server failed to delete. Skipping.");
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
            if (trimmedInput === "") continue; 
            
            if (ext && !trimmedInput.toLowerCase().endsWith(ext.toLowerCase())) {
              trimmedInput += ext;
            }
            finalName = trimmedInput;
            if (!existingNames.includes(finalName)) isNameValid = true;
          }
      }

      if (shouldUpload) {
        if (finalName !== cur.name) {
          cur = new File([cur], finalName, { type: cur.type });
        }
        formData.append("files", cur);
        filesToUploadCount++;
        existingNames.push(finalName); 
      }
    }

    setConflictDialog(prev => ({ ...prev, isOpen: false }));

    if (filesToUploadCount === 0) {
      setUploadStatus("Upload cancelled. No files were added.");
      event.target.value = null; 
      return;
    }

    fetch(`${API_BASE}/projects/${id}/documents/`, {
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
        } else {
          setUploadStatus("Upload complete!");
          setTimeout(() => setUploadStatus(""), 3000); 
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
      const response = await fetch(`${API_BASE}/projects/${id}/documents/${docId}`, { method: 'DELETE' });

      if (response.ok) {
        setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== docId));
        if (activeDocument && activeDocument.id === docId) {
          setActiveDocument(null);
          setDocumentSegments([]);
        }
        
        setUploadStatus(`Deleted ${docName}`);
        setTimeout(() => setUploadStatus(""), 3000);
      } else {
        setUploadStatus("Failed to delete document.");
      }
    } catch (err) {
      console.error(err);
      setUploadStatus("Server error during deletion.");
    }
  };

  // RENDER

  const renderHighlightedContent = (content, segments, codes) => {
    if (!segments || segments.length === 0) return content;

    // Sort segments by start_char
    const sortedSegments = [...segments].sort((a, b) => a.start_char - b.start_char);

    const parts = [];
    let lastEnd = 0;

    sortedSegments.forEach(segment => {
      // Add text before the segment
      if (segment.start_char > lastEnd) {
        parts.push(content.slice(lastEnd, segment.start_char));
      }

      // Find the code for this segment
      const code = codes.find(c => c.id === segment.code_id);
      const color = code ? code.color : '#646cff';

      // Add the highlighted segment
      parts.push(
        <span
          key={segment.id}
          style={{
            backgroundColor: color,
            padding: '2px 4px',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
          title={code ? code.name : 'Code'}
        >
          {content.slice(segment.start_char, segment.end_char)}
        </span>
      );

      lastEnd = segment.end_char;
    });

    // Add remaining text
    if (lastEnd < content.length) {
      parts.push(content.slice(lastEnd));
    }

    return parts;
  };

return (
    <div style={{ padding: 0, margin: 0, fontFamily: 'sans-serif', textAlign: 'left', display: 'flex', flexDirection: 'column', height: '100vh', boxSizing: 'border-box' }}>
      
      {/* HEADER */}
      <div style={{ padding: '15px 20px', backgroundColor: '#111', borderBottom: '1px solid #333' }}>
        <Link to="/" style={{ color: '#646cff', textDecoration: 'none' }}>← Back to Dashboard</Link>
        <h2 style={{ marginTop: '20px' }}>Workspace: {projectName}</h2>
      </div>

      {/* MAIN CONTENT AREA */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* SIDEBAR TABS */}
        <div style={{ width: '60px', backgroundColor: '#111', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '20px', borderRight: '1px solid #333' }}>
          <button 
            onClick={() => setActiveTab('documents')}
            style={{ backgroundColor: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '10px', opacity: activeTab === 'documents' ? 1 : 0.4, borderLeft: activeTab === 'documents' ? '3px solid #646cff' : '3px solid transparent' }}
            title="Documents"
          >
            📄
          </button>
          <button 
            onClick={() => setActiveTab('codes')}
            style={{ backgroundColor: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '10px', marginTop: '10px', opacity: activeTab === 'codes' ? 1 : 0.4, borderLeft: activeTab === 'codes' ? '3px solid #646cff' : '3px solid transparent' }}
            title="Codes"
          >
            🏷️
          </button>
        </div>

        {/* LEFT COLUMN: ACTIVE SIDEBAR */}
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
            <CodeSidebar 
                projectId={id} 
                codes={projectCodes} 
                onDeleteCode={handleDeleteCode} 
                onRefreshCodes={fetchCodes} 
            />
          )}
        </div>

        {/* RIGHT COLUMN: TEXT VIEWER */}
        <div style={{ flex: 1, border: '1px solid #ccc', borderRadius: '8px', padding: '30px', backgroundColor: '#fff', color: '#333', overflowY: 'auto', position: 'relative' }}>
          {activeDocument ? (
            <div>
              <h2 style={{ borderBottom: '2px solid #aaa', paddingBottom: '10px', marginTop: 0, color: '#000', fontWeight: '500' }}>
                {activeDocument.filename}
              </h2>
              
              <div
                ref={viewerRef}
                tabIndex={0}
                onMouseUp={handleTextSelection}
                onKeyUp={handleTextSelection}
                style={{ whiteSpace: 'pre-wrap', fontSize: '16px', lineHeight: '1.6', fontFamily: 'system-ui, sans-serif', outline: 'none' }}
              >
                {renderHighlightedContent(activeDocument.content, documentSegments, projectCodes)}
              </div>

              {/* NEW: QUICK CODE POPUP MENU WITH DROPDOWN */}
              {quickMenuOpen && selectionRect && (
                <div style={{ position: 'fixed', top: selectionRect.top + 8, left: selectionRect.left, zIndex: 1000, backgroundColor: '#23232a', border: '1px solid #444', borderRadius: '10px', padding: '10px', minWidth: '240px', color: 'white', boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25)' }}>
                  <div style={{ marginBottom: '8px', fontSize: '13px', color: '#b0b0c3' }}>Selected</div>
                  <div style={{ marginBottom: '10px', fontSize: '14px', lineHeight: '1.4', maxHeight: '84px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    {selectionText}
                  </div>
                  
                  <div style={{ display: 'grid', gap: '8px', marginBottom: '10px' }}>
                    
                    {/* The Dropdown Menu */}
                    <select 
                      value={quickCodeMode === "new" ? "new" : selectedExistingCodeId}
                      onChange={(e) => {
                        if (e.target.value === "new") {
                          setQuickCodeMode("new");
                        } else {
                          setQuickCodeMode("existing");
                          setSelectedExistingCodeId(e.target.value);
                        }
                      }}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #555', backgroundColor: '#1f1f28', color: 'white', cursor: 'pointer' }}
                    >
                      {projectCodes.length > 0 && <optgroup label="Existing Codes">
                        {projectCodes.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </optgroup>}
                      <option value="new">✨ Create New Code...</option>
                    </select>

                    {/* Only show name and color inputs if "Create New" is selected */}
                    {quickCodeMode === "new" && (
                        <>
                            <input
                                type="text"
                                value={quickCodeName}
                                onChange={(e) => setQuickCodeName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickCodeAction(); } }}
                                placeholder="Code name"
                                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #555', backgroundColor: '#1f1f28', color: 'white', boxSizing: 'border-box' }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label htmlFor="quick-color" style={{ color: '#b0b0c3', fontSize: '13px', minWidth: '70px' }}>Color</label>
                                <input
                                id="quick-color"
                                type="color"
                                value={quickCodeColor}
                                onChange={(e) => setQuickCodeColor(e.target.value)}
                                style={{ width: '40px', height: '40px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                                />
                            </div>
                        </>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleQuickCodeAction} style={{ flex: 1, padding: '8px 10px', backgroundColor: '#646cff', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
                      Apply Code
                    </button>
                    <button onClick={clearTextSelection} style={{ padding: '8px 10px', backgroundColor: '#444', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
              <p>Select a document from the sidebar to start reading.</p>
            </div>
          )}
        </div>
      </div>
      
      <CollisionModal dialog={conflictDialog} resolve={conflictDialog.resolve} />
    </div>
  );
}

export default ProjectPage;