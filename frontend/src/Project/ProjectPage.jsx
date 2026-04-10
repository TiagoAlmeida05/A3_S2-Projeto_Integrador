import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import CodeSidebar from './CodeSidebar';
import DocumentSidebar from './DocumentSidebar';
import CollisionModal from './CollisionModal';
import ProjectSettingsModal from './ProjectSettingsModal';
import MarginSidebar from './MarginSidebar';

const API_BASE = 'http://127.0.0.1:8000';

function ProjectPage() {
  const { id } = useParams(); 
  const viewerRef = useRef(null);

  // STATE MANAGEMENT

  // Project & Document State
  const [projectDetails, setProjectDetails] = useState({ name: "", description: "",localPath: "" }); 
  const [documents, setDocuments] = useState([]);
  const [activeDocument, setActiveDocument] = useState(null);
  const [documentSegments, setDocumentSegments] = useState([]);
  const [projectCodes, setProjectCodes] = useState([]);
  const [marginBars, setMarginBars] = useState([]);
  const [codePanelOpen, setCodePanelOpen] = useState(false);
  const [activeCode, setActiveCode] = useState(null);
  const [codeSegments, setCodeSegments] = useState([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState(null);
  const [pendingQuoteJump, setPendingQuoteJump] = useState(null);
  
  // UI & Navigation State
  const [activeTab, setActiveTab] = useState('documents');
  const [uploadStatus, setUploadStatus] = useState("");
  
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

  const openCodePanel = (code) => {
    setActiveCode(code);
    setCodePanelOpen(true);
setSelectedQuoteId(null);
    setPendingQuoteJump(null);
    
    fetch(`${API_BASE}/codes/${code.id}/segments`)
      .then(res => res.json())
      .then(data => setCodeSegments(data))
      .catch(err => console.error("Failed to load code segments:", err));
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

  const scrollToQuote = (quoteId) => {
    if (!viewerRef.current) return;
    const element = viewerRef.current.querySelector(`[data-segment-ids~="${quoteId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleQuoteClick = async (quote) => {
    setSelectedQuoteId(quote.id);

    if (!activeDocument || activeDocument.id !== quote.document_id) {
      try {
        const docRes = await fetch(`${API_BASE}/projects/${id}/documents/${quote.document_id}`);
        const docData = await docRes.json();
        setActiveDocument(docData);

        const segRes = await fetch(`${API_BASE}/projects/${id}/segments?document_id=${quote.document_id}`);
        const segData = await segRes.json();
        setDocumentSegments(segData);

        setPendingQuoteJump({ quoteId: quote.id, document_id: quote.document_id });
      } catch (err) {
        console.error("Failed to load quote document:", err);
      }
    } else {
      setPendingQuoteJump({ quoteId: quote.id, document_id: quote.document_id });
    }
  };

  useEffect(() => {
    if (!pendingQuoteJump || !activeDocument || pendingQuoteJump.document_id !== activeDocument.id) return;
    scrollToQuote(pendingQuoteJump.quoteId);
    setPendingQuoteJump(null);
  }, [activeDocument, documentSegments, pendingQuoteJump]);

  useEffect(() => {
    fetchDocuments();
    fetchProjectDetails();
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
        const codeName = quickCodeName.trim() || (selectionText.length > 30 ? `${selectionText.slice(0, 27)}...` : selectionText);

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

  useEffect(() => {
    if (!activeDocument || !viewerRef.current || documentSegments.length === 0) {
      setMarginBars([]);
      return;
    }

    const measureTimer = setTimeout(() => {
      const containerBounds = viewerRef.current.getBoundingClientRect();
      const chunks = viewerRef.current.querySelectorAll('.highlight-chunk');
      const segmentBounds = {};

      chunks.forEach(chunk => {
        const ids = chunk.getAttribute('data-segment-ids');
        if (!ids) return;

        const chunkRect = chunk.getBoundingClientRect();
        const top = chunkRect.top - containerBounds.top;
        const bottom = top + chunkRect.height;

        ids.split(' ').forEach(id => {
          if (!segmentBounds[id]) {
            segmentBounds[id] = { top, bottom };
          } else {
            segmentBounds[id].top = Math.min(segmentBounds[id].top, top);
            segmentBounds[id].bottom = Math.max(segmentBounds[id].bottom, bottom);
          }
        });
      });

      const rawBars = documentSegments.map(seg => {
        const bounds = segmentBounds[seg.id];
        if (!bounds) return null;

        const code = projectCodes.find(c => c.id === seg.code_id);
        return {
          id: seg.id,
          codeName: code ? code.name : 'Unknown',
          color: code ? code.color : '#ccc',
          top: bounds.top,
          height: bounds.bottom - bounds.top,
          track: 0 
        };
      }).filter(Boolean);

      rawBars.sort((a, b) => a.top - b.top);
      rawBars.forEach(bar => {
        let currentTrack = 0;
        let conflict = true;
        while (conflict) {
          const overlappingBar = rawBars.find(other => 
            other !== bar && 
            other.track === currentTrack && 
            other.top < bar.top + bar.height && 
            other.top + other.height > bar.top
          );
          if (overlappingBar) {
            currentTrack++; 
          } else {
            conflict = false;
          }
        }
        bar.track = currentTrack;
      });

      setMarginBars(rawBars);
    }, 50);

    return () => clearTimeout(measureTimer);
  }, [activeDocument, documentSegments, projectCodes]);

  // RENDER

  const renderHighlightedContent = (content, segments, codes) => {
    if (!segments || segments.length === 0) return content;

    let boundaries = new Set([0, content.length]);

    segments.forEach(seg => {
      boundaries.add(seg.start_char);
      boundaries.add(seg.end_char);
    })

    const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);

    const parts = [];

    for (let i = 0; i < sortedBoundaries.length - 1; i++){
      const start = sortedBoundaries[i];
      const end = sortedBoundaries[i + 1];
      if (start === end) continue;

      const chunkText = content.slice(start, end);
      const coveringSegments = segments.filter(seg => seg.start_char <= start && seg.end_char >= end);

      if(coveringSegments.length > 0) {
        coveringSegments.sort((a, b) => b.id - a.id);
        const winningSegment = coveringSegments[0];
        const code = codes.find(c => c.id === winningSegment.code_id);
        const color = code ? code.color : 'transparent';
        
        const allSegmentIds = coveringSegments.map(s => s.id).join(' ');
        const isSelectedSegment = selectedQuoteId && coveringSegments.some(s => s.id === selectedQuoteId);

        parts.push(
          <span
            key={`${start}-${end}`}
            className="highlight-chunk"
            data-segment-ids={allSegmentIds} 
            style={{
              backgroundColor: color,
              padding: '2px 0px',
              borderRadius: '3px',
              cursor: 'pointer',
              outline: isSelectedSegment ? '2px solid #ffcc00' : 'none',
              outlineOffset: isSelectedSegment ? '2px' : undefined,
            }}
            title={code ? code.name : 'Code'}
          >
            {chunkText}
          </span>
        );
      }else {
        parts.push(<span key={`${start}-${end}`}>{chunkText}</span>);
      }
    }
    return parts;
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
    <div style={{ padding: 0, margin: 0, fontFamily: 'sans-serif', textAlign: 'left', display: 'flex', flexDirection: 'column', height: '100vh', boxSizing: 'border-box' }}>
      
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
        
        {/* SIDEBAR TABS */}
        <div style={{ width: '60px', backgroundColor: '#111', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '20px', borderRight: '1px solid #333' }}>
          <button 
            onClick={() => setActiveTab('documents')}
            style={{ backgroundColor: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '10px', opacity: activeTab === 'documents' ? 1 : 0.4, borderLeft: activeTab === 'documents' ? '3px solid #646cff' : '3px solid transparent' }}
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
                onOpenCodePanel={openCodePanel}
            />
          )}
        </div>

        {codePanelOpen && (
          <div style={{ width: '360px', display: 'flex', flexDirection: 'column', border: '1px solid #ccc', borderRadius: '8px', padding: '20px', backgroundColor: '#111', color: '#fff', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>Compiled Quotes</h3>
                <div style={{ color: '#aaa', fontSize: '13px', marginTop: '6px' }}>{activeCode?.name || 'Selected code'}</div>
              </div>
              <button
                onClick={() => { setCodePanelOpen(false); setActiveCode(null); setCodeSegments([]); setSelectedQuoteId(null); }}
                style={{ backgroundColor: 'transparent', border: '1px solid #444', color: '#ccc', borderRadius: '6px', padding: '8px 12px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>

            {codeSegments.length === 0 ? (
              <p style={{ color: '#888' }}>No quotes found for this code yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {codeSegments.map(quote => {
                  const before = quote.context.slice(0, quote.highlight_start);
                  const highlight = quote.context.slice(quote.highlight_start, quote.highlight_end);
                  const after = quote.context.slice(quote.highlight_end);
                  const isSelected = quote.id === selectedQuoteId;

                  return (
                    <button
                      key={quote.id}
                      onClick={() => handleQuoteClick(quote)}
                      style={{
                        textAlign: 'left',
                        backgroundColor: isSelected ? '#1f1f2a' : '#17171d',
                        border: '1px solid #333',
                        borderRadius: '8px',
                        padding: '14px',
                        color: 'white',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease',
                        width: '100%',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '600', fontSize: '14px' }}>{quote.document_filename}</span>
                        <span style={{ color: '#9aa0b8', fontSize: '12px' }}>{quote.position_label}</span>
                      </div>
                      <div style={{ fontSize: '14px', lineHeight: '1.5', color: '#ddd' }}>
                        {before}
                        <span style={{ backgroundColor: '#646cff', color: '#fff', borderRadius: '4px', padding: '0 3px' }}>
                          {highlight}
                        </span>
                        {after}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* RIGHT COLUMN: TEXT VIEWER */}
        <div style={{ flex: 1, border: '1px solid #ccc', borderRadius: '8px', padding: '30px', backgroundColor: '#fff', color: '#333', overflowY: 'auto', position: 'relative' }}>
          {activeDocument ? (
            <div>
              <h2 style={{ borderBottom: '2px solid #aaa', paddingBottom: '10px', marginTop: 0, color: '#000', fontWeight: '500' }}>
                {activeDocument.filename}
              </h2>
              <div style={{ display: 'flex', position: 'relative', marginTop: '20px' }}>
                
                <div
                  ref={viewerRef}
                  tabIndex={0}
                  onMouseUp={handleTextSelection}
                  onKeyUp={handleTextSelection}
                  style={{ width: '75%', paddingRight: '30px', whiteSpace: 'pre-wrap', fontSize: '16px', lineHeight: '1.6', fontFamily: 'system-ui, sans-serif', outline: 'none', position: 'relative' }}
                >
                  {renderHighlightedContent(activeDocument.content, documentSegments, projectCodes)}
                </div>

                <MarginSidebar marginBars={marginBars} />

              </div>

              {/* QUICK CODE POPUP MENU WITH DROPDOWN */}
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