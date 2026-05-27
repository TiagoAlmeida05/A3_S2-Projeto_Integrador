import { useState, useEffect, useRef } from 'react';

function DocumentSidebar({ 
  documents, 
  activeDocumentId, 
  uploadStatus, 
  uploadProgress,
  onFileUpload, 
  onWriteDocument,
  onDocumentClick, 
  onDeleteDocument,
  onRenameDocument,
  projectId
}) {
  const [folders, setFolders] = useState([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const dragCounter = useRef(0);
  const [isImportDropActive, setIsImportDropActive] = useState(false);

  // Unified Drag State
  const [draggedItem, setDraggedItem] = useState(null); 
  const [dragOverId, setDragOverId] = useState(null); 
  const [dragPosition, setDragPosition] = useState(null); 
  const [renamingDocument, setRenamingDocument] = useState(null);

  // Right-Click Context Menu State
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    if (projectId) fetchFolders();

    // Close context menu if you click anywhere else
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [projectId]);

  const fetchFolders = () => {
    fetch(`http://127.0.0.1:8000/projects/${projectId}/folders`)
      .then(res => res.json())
      .then(data => setFolders(data || [])) // Fallback to empty array if crash
      .catch(err => console.error(err));
  };

  const handleCreateFolder = async (e) => {
    if (e) e.preventDefault();
    if (!newFolderName.trim()) {
      setIsCreatingFolder(false);
      return;
    }
    try {
      const res = await fetch(`http://127.0.0.1:8000/projects/${projectId}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName })
      });
      if (res.ok) {
        setNewFolderName("");
        setIsCreatingFolder(false);
        fetchFolders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFolder = async (folderId) => {
    const confirmDelete = window.confirm("Delete this folder? All documents inside will be moved to the root area.");
    if (!confirmDelete) return;
    try {
      await fetch(`http://127.0.0.1:8000/projects/${projectId}/folders/${folderId}`, { method: 'DELETE' });
      fetchFolders();
      window.location.reload(); 
    } catch (err) {
      console.error(err);
    }
  };

  const toggleFolder = (e, folderId) => {
    e.stopPropagation();
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  // --- CONTEXT MENU HANDLER ---
  const handleContextMenu = (e, targetType, targetId = null, filename = null) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.pageX,
      y: e.pageY,
      type: targetType,
      id: targetId,
      name: filename
    });
  };

  const startRenameDocument = (doc) => {
    setRenamingDocument({ id: doc.id, value: doc.filename });
    setContextMenu(null);
  };

  const finishRenameDocument = async () => {
    if (!renamingDocument) return;

    const nextName = renamingDocument.value.trim();
    const currentDocument = documents.find((doc) => doc.id === renamingDocument.id);

    if (!currentDocument) {
      setRenamingDocument(null);
      return;
    }

    if (!nextName || nextName === currentDocument.filename) {
      setRenamingDocument(null);
      return;
    }

    try {
      await onRenameDocument(renamingDocument.id, nextName);
      setRenamingDocument(null);
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to rename document");
    }
  };

  // --- DRAG AND DROP ---
  const handleDragStart = (e, type, id) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("type", type);
    e.dataTransfer.setData("id", id.toString());
    setDraggedItem({ type, id });
  };

  const handleDragOver = (e, targetType, targetId) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedItem?.id === targetId && draggedItem?.type === targetType) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;

    let position = "inside";
    if (targetType === 'folder') {
      if (draggedItem?.type === 'folder') {
         position = y < rect.height / 2 ? "before" : "after";
      } else if (draggedItem?.type === 'doc') {
         position = "inside";
      }
    }

    setDragOverId(`${targetType}-${targetId}`);
    setDragPosition(position);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
    setDragPosition(null);
  };

  const handleImportDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    setIsImportDropActive(true);
  };

  const handleImportDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsImportDropActive(true);
  };

  const handleImportDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) {
      setIsImportDropActive(false);
    }
  };

  const handleImportDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsImportDropActive(false);

    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      onFileUpload(files);
    }
  };

  const handleDrop = async (e, targetType, targetId) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem) return;

    const { id, type } = draggedItem;

    if (type === 'folder' && targetType === 'folder') {
      const draggedFolder = folders.find(f => f.id === id);
      let remaining = folders.filter(f => f.id !== id);
      const targetIndex = remaining.findIndex(f => f.id === targetId);

      let insertIndex = dragPosition === 'after' ? targetIndex + 1 : targetIndex;
      remaining.splice(insertIndex, 0, draggedFolder);
      setFolders([...remaining]); 

      const reorderPayload = remaining.map((f, idx) => ({ id: f.id, order_index: idx }));
      try {
        await fetch(`http://127.0.0.1:8000/projects/${projectId}/folders/reorder`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ folders: reorderPayload })
        });
      } catch (err) { console.error(err); }

    } else if (type === 'doc') {
      const folderId = targetType === 'folder' ? targetId : '';
      try {
        const res = await fetch(`http://127.0.0.1:8000/projects/${projectId}/documents/${id}/move?folder_id=${folderId}`, {
          method: 'PUT'
        });
        if (res.ok) window.location.reload(); 
      } catch (err) { console.error(err); }
    }

    setDraggedItem(null);
    setDragOverId(null);
    setDragPosition(null);
  };

  const renderDoc = (doc, isNested = false) => {
    const isDragging = draggedItem?.type === 'doc' && draggedItem.id === doc.id;
    const isRenaming = renamingDocument?.id === doc.id;
    return (
      <li 
        key={doc.id} 
        draggable
        onDragStart={(e) => handleDragStart(e, 'doc', doc.id)}
        onClick={() => onDocumentClick(doc.id)} 
        onContextMenu={(e) => handleContextMenu(e, 'doc', doc.id, doc.filename)}
        style={{ 
          marginBottom: '5px',
          marginLeft: isNested ? '20px' : '0',
          opacity: isDragging ? 0.3 : 1,
          padding: '8px 12px', 
          backgroundColor: activeDocumentId === doc.id ? 'rgba(100, 108, 255, 0.2)' : '#2a2a2a', 
          border: activeDocumentId === doc.id ? '1px solid #646cff' : '1px solid transparent',
          color: 'white', 
          borderRadius: '4px',
          display: 'flex',                 
          justifyContent: 'space-between', 
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
      > 
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          <div style={{ color: '#666', fontSize: '14px', cursor: 'grab' }}>⋮⋮</div>
          {isRenaming ? (
            <input
              autoFocus
              value={renamingDocument.value}
              onChange={(e) => setRenamingDocument((prev) => prev ? { ...prev, value: e.target.value } : prev)}
              onBlur={finishRenameDocument}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  finishRenameDocument();
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setRenamingDocument(null);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              style={{
                flex: 1,
                minWidth: 0,
                background: '#111',
                border: '1px solid #646cff',
                color: '#fff',
                outline: 'none',
                borderRadius: '4px',
                fontSize: '13px',
                padding: '6px 8px'
              }}
            />
          ) : (
            <span style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              📄 {doc.filename}
            </span>
          )}
        </div>
      </li>
    );
  };

  return (
    <>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>Documents</h3>
        <button 
          onClick={(e) => handleContextMenu(e, 'root')} // Quick button for discoverability
          style={{ background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '18px' }}
          title="Options"
        >
          ⋮
        </button>
      </div>

      <div
        style={{
          marginBottom: '20px',
          padding: '14px',
          borderRadius: '12px',
          border: isImportDropActive ? '1px solid #646cff' : '1px dashed #3a3a3a',
          backgroundColor: isImportDropActive ? 'rgba(100, 108, 255, 0.14)' : '#202020',
          transition: 'all 0.2s ease',
        }}
        onDragEnter={handleImportDragEnter}
        onDragOver={handleImportDragOver}
        onDragLeave={handleImportDragLeave}
        onDrop={handleImportDrop}
      >
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', color: '#cfcfcf', fontWeight: 'bold', marginBottom: '4px' }}>
            Drop files here to import
          </div>
          <div style={{ fontSize: '12px', color: '#888' }}>
            Multiple text files are supported.
          </div>
        </div>
        <input 
          type="file" 
          multiple 
          id="file-upload" 
          accept=".txt,.md,.rtf,.pdf,.docx,.odt,audio/wav,audio/mp3,audio/mpeg,audio/m4a,audio/webm,audio/ogg"          style={{ display: 'none' }} 
          onChange={onFileUpload}
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          <label 
            htmlFor="file-upload" 
            style={{ 
              flex: 1,
              padding: '10px', 
              backgroundColor: '#4CAF50', 
              color: 'white', 
              borderRadius: '4px', 
              cursor: 'pointer', 
              textAlign: 'center',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            ➕ Import
          </label>

          <button 
            onClick={onWriteDocument}
            style={{ 
              flex: 1,
              padding: '10px', 
              backgroundColor: '#646cff', 
              color: 'white', 
              border: 'none',
              borderRadius: '4px', 
              cursor: 'pointer', 
              textAlign: 'center',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            📝 Write
          </button>
        </div>
        {uploadProgress?.isActive && uploadProgress.total > 0 && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ color: '#9bb0ff', fontSize: '13px', textAlign: 'center', marginBottom: '6px' }}>
              Importing {uploadProgress.current} of {uploadProgress.total} files
            </div>
            <div style={{ height: '8px', backgroundColor: '#111', border: '1px solid #333', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #4CAF50 0%, #7ad67e 100%)',
                  transition: 'width 0.25s ease',
                }}
              />
            </div>
          </div>
        )}
        <div style={{ marginTop: '10px', color: '#646cff', fontSize: '14px', textAlign: 'center' }}>{uploadStatus}</div>
      </div>

      {/* MAIN LIST AREA - Right clicking the empty space triggers the Root menu */}
      <ul 
        style={{ listStyleType: 'none', padding: 0, overflowY: 'auto', flex: 1, minHeight: '300px' }}
        onContextMenu={(e) => {
          // If they click the background ul, open root menu to create folder
          if (e.target === e.currentTarget) {
            handleContextMenu(e, 'root');
          }
        }}
        onDragOver={(e) => handleDragOver(e, 'root', 'root')}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, 'root', 'root')}
      >
        
        {/* INLINE FOLDER CREATION (Only shows when triggered from context menu) */}
        {isCreatingFolder && (
          <div style={{ 
            marginBottom: '5px', padding: '8px 12px', backgroundColor: '#2a2a2a', 
            borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #646cff'
          }}>
            <span style={{ fontSize: '15px' }}>📁</span>
            <input 
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') setIsCreatingFolder(false);
              }}
              onBlur={() => {
                // Save automatically if they click away
                if (newFolderName.trim()) handleCreateFolder();
                else setIsCreatingFolder(false);
              }}
              placeholder="Folder name..."
              style={{ flex: 1, background: '#111', border: 'none', color: '#fff', outline: 'none', fontSize: '14px' }}
            />
          </div>
        )}

        {/* RENDER FOLDERS */}
        {folders.map(folder => {
          const folderDocs = documents.filter(d => d.folder_id === folder.id);
          const isExpanded = expandedFolders.has(folder.id);
          const isDraggingOver = dragOverId === `folder-${folder.id}`;
          const isBeingDragged = draggedItem?.type === 'folder' && draggedItem.id === folder.id;

          return (
            <li 
              key={`folder-${folder.id}`} 
              draggable
              onDragStart={(e) => handleDragStart(e, 'folder', folder.id)}
              onDragOver={(e) => handleDragOver(e, 'folder', folder.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'folder', folder.id)}
              style={{ 
                marginBottom: '5px',
                opacity: isBeingDragged ? 0.3 : 1,
                transition: 'all 0.2s ease',
                borderTop: isDraggingOver && dragPosition === 'before' ? '2px solid #646cff' : '2px solid transparent',
                borderBottom: isDraggingOver && dragPosition === 'after' ? '2px solid #646cff' : '2px solid transparent',
                backgroundColor: isDraggingOver && dragPosition === 'inside' ? 'rgba(100, 108, 255, 0.2)' : 'transparent',
                borderRadius: '4px'
              }}
            >
              <div 
                onContextMenu={(e) => handleContextMenu(e, 'folder', folder.id)}
                style={{ 
                  padding: '8px 12px', 
                  backgroundColor: '#2a2a2a', 
                  color: 'white', 
                  borderRadius: '4px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  gap: '10px', 
                  cursor: 'grab' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#666', fontSize: '14px', cursor: 'grab' }}>⋮⋮</div>
                  <div onClick={(e) => toggleFolder(e, folder.id)} style={{ cursor: 'pointer', fontSize: '12px', color: '#aaa', padding: '4px' }}>
                    {isExpanded ? '▼' : '▶'}
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    📁 {folder.name}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <span style={{ backgroundColor: '#111', color: '#aaa', fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                    {folderDocs.length}
                  </span>
                </div>
              </div>
              
              {isExpanded && (
                <ul style={{ listStyleType: 'none', padding: 0, marginTop: '4px' }}>
                  {folderDocs.length === 0 ? (
                    <div style={{ marginLeft: '40px', fontSize: '12px', color: '#555', fontStyle: 'italic', padding: '4px' }}>Empty folder</div>
                  ) : (
                    folderDocs.map(doc => renderDoc(doc, true))
                  )}
                </ul>
              )}
            </li>
          );
        })}

        {/* ROOT LEVEL DOCUMENTS */}
        <div style={{ 
            marginTop: '10px', 
            minHeight: '40px',
            borderTop: folders.length > 0 ? '1px solid #333' : 'none', 
            paddingTop: '10px',
            backgroundColor: dragOverId === 'root-root' ? 'rgba(100, 108, 255, 0.2)' : 'transparent',
            borderRadius: '4px',
            transition: 'background-color 0.2s'
          }}
        >
          {documents.filter(d => !d.folder_id).map(doc => renderDoc(doc, false))}
        </div>
      </ul>

      {/* --- UNIFIED CONTEXT MENU --- */}
      {contextMenu && (
        <div 
          onClick={(e) => e.stopPropagation()} 
          style={{ 
            position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 9999, 
            backgroundColor: '#23232a', border: '1px solid #444', borderRadius: '6px', 
            boxShadow: '0 8px 16px rgba(0,0,0,0.5)', padding: '4px', minWidth: '150px' 
          }}
        >
          {contextMenu.type === 'root' && (
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                setIsCreatingFolder(true);
                setContextMenu(null); 
              }}
              style={{ width: '100%', padding: '8px 12px', backgroundColor: 'transparent', color: 'white', border: 'none', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#646cff'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              Create Folder
            </button>
          )}

          {contextMenu.type === 'folder' && (
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                handleDeleteFolder(contextMenu.id);
                setContextMenu(null); 
              }}
              style={{ width: '100%', padding: '8px 12px', backgroundColor: 'transparent', color: '#ff6b6b', border: 'none', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#441111'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              Delete Folder
            </button>
          )}

          {contextMenu.type === 'doc' && (
            <>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  const doc = documents.find((item) => item.id === contextMenu.id);
                  if (doc) startRenameDocument(doc);
                  setContextMenu(null); 
                }}
                style={{ width: '100%', padding: '8px 12px', backgroundColor: 'transparent', color: 'white', border: 'none', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#3a3a46'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                Rename Document
              </button>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onDeleteDocument(contextMenu.id, contextMenu.name);
                  setContextMenu(null); 
                }}
                style={{ width: '100%', padding: '8px 12px', backgroundColor: 'transparent', color: '#ff6b6b', border: 'none', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#441111'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                Delete Document
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

export default DocumentSidebar;