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
  projectId,
  fetchDocuments,
}) {
  const [folders, setFolders] = useState([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const dragCounter = useRef(0);
  const [isImportDropActive, setIsImportDropActive] = useState(false);
  const [sortMode, setSortMode] = useState("custom");
  const [metadataFilterKey, setMetadataFilterKey] = useState("");
  const [metadataDialog, setMetadataDialog] = useState({ isOpen: false, documentId: null, documentName: "" });
  const [metadataFieldName, setMetadataFieldName] = useState("");
  const [metadataFieldValue, setMetadataFieldValue] = useState("");

  // Unified Drag State
  const [draggedItem, setDraggedItem] = useState(null); 
  const [dragOverId, setDragOverId] = useState(null); 
  const [dragPosition, setDragPosition] = useState(null); 

  // Right-Click Context Menu State
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    if (projectId) fetchFolders();

    // Close context menu if you click anywhere else
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [projectId]);

  const normalizeMetadata = (doc) => {
    if (!doc || !doc.metadata || typeof doc.metadata !== "object") {
      return {};
    }

    return doc.metadata;
  };

  const formatImportedDate = (createdAt) => {
    if (!createdAt) return "Unknown date";
    const parsedDate = new Date(createdAt);
    if (Number.isNaN(parsedDate.getTime())) return "Unknown date";
    return parsedDate.toLocaleDateString();
  };

  const getMetadataSummary = (doc) => {
    const entries = Object.entries(normalizeMetadata(doc));
    if (entries.length === 0) return "";
    return entries.slice(0, 2).map(([key, value]) => `${key}: ${value}`).join(" · ");
  };

  const matchesMetadataFilter = (doc) => {
    const metadata = normalizeMetadata(doc);
    const normalizedKey = metadataFilterKey.trim();

    if (!normalizedKey) return true;
    if (normalizedKey && !(normalizedKey in metadata)) return false;
    return true;
  };

  const compareDocuments = (left, right) => {
    if (sortMode === "custom") {
      return (left.order_index ?? 0) - (right.order_index ?? 0) || left.filename.localeCompare(right.filename, undefined, { sensitivity: "base" });
    }

    if (sortMode === "date") {
      const leftTime = new Date(left.created_at || 0).getTime();
      const rightTime = new Date(right.created_at || 0).getTime();
      return rightTime - leftTime || left.filename.localeCompare(right.filename, undefined, { sensitivity: "base" });
    }

    return left.filename.localeCompare(right.filename, undefined, { sensitivity: "base" });
  };

  const sortAndFilterDocuments = (documentList) => {
    return [...documentList].filter(matchesMetadataFilter).sort(compareDocuments);
  };

  const hasMetadataField = (doc) => {
    const normalizedKey = metadataFilterKey.trim();
    if (!normalizedKey) return true;
    const metadata = normalizeMetadata(doc);
    return Object.prototype.hasOwnProperty.call(metadata, normalizedKey);
  };

  const getDocumentBuckets = (documentList) => {
    const normalizedKey = metadataFilterKey.trim();
    const sortedDocuments = [...documentList].sort(compareDocuments);

    if (!normalizedKey) {
      return { matching: sortedDocuments, missingField: [] };
    }

    const matching = [];
    const missingField = [];

    sortedDocuments.forEach((doc) => {
      if (!hasMetadataField(doc)) {
        missingField.push(doc);
        return;
      }

      matching.push(doc);
    });

    return { matching, missingField };
  };

  const isSameContainer = (leftDoc, rightDoc) => (leftDoc?.folder_id ?? null) === (rightDoc?.folder_id ?? null);

  const reorderDocumentsInContainer = async (draggedDocId, targetDocId, targetFolderId, dropPosition) => {
    const containerDocuments = sortAndFilterDocuments(
      documents.filter((doc) => (doc.folder_id ?? null) === (targetFolderId ?? null))
    );

    const draggedDoc = containerDocuments.find((doc) => doc.id === draggedDocId);
    const targetDoc = containerDocuments.find((doc) => doc.id === targetDocId);
    if (!draggedDoc || !targetDoc) return;

    const nextDocuments = containerDocuments.filter((doc) => doc.id !== draggedDocId);
    const targetIndex = nextDocuments.findIndex((doc) => doc.id === targetDocId);
    const insertIndex = dropPosition === "after" ? targetIndex + 1 : targetIndex;
    nextDocuments.splice(insertIndex, 0, draggedDoc);

    const reorderPayload = nextDocuments.map((doc, index) => ({ id: doc.id, order_index: index }));

    try {
      const response = await fetch(`http://127.0.0.1:8000/projects/${projectId}/documents/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: reorderPayload }),
      });

      if (!response.ok) {
        throw new Error('Failed to reorder documents');
      }

      if (fetchDocuments) fetchDocuments();
    } catch (err) {
      console.error(err);
      if (fetchDocuments) fetchDocuments();
    }
  };

  const moveDocumentToFolder = async (documentId, folderId) => {
    const moveUrl = new URL(`http://127.0.0.1:8000/projects/${projectId}/documents/${documentId}/move`);
    if (folderId !== null && folderId !== undefined) {
      moveUrl.searchParams.set('folder_id', String(folderId));
    }

    try {
      const response = await fetch(moveUrl.toString(), { method: 'PUT' });
      if (!response.ok) {
        throw new Error('Failed to move document');
      }

      if (fetchDocuments) fetchDocuments();
      else window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFolders = () => {
    fetch(`http://127.0.0.1:8000/projects/${projectId}/folders`)
      .then(res => res.json())
      .then(data => setFolders(data || [])) // Fallback to empty array if crash
      .catch(err => console.error(err));
  };

  const openMetadataDialog = (documentId, documentName) => {
    setMetadataDialog({ isOpen: true, documentId, documentName: documentName || "Document" });
    setMetadataFieldName("");
    setMetadataFieldValue("");
    setContextMenu(null);
  };

  const closeMetadataDialog = () => {
    setMetadataDialog({ isOpen: false, documentId: null, documentName: "" });
    setMetadataFieldName("");
    setMetadataFieldValue("");
  };

  const saveDocumentMetadata = async () => {
    const fieldName = metadataFieldName.trim();
    const fieldValue = metadataFieldValue.trim();
    if (!fieldName || !metadataDialog.documentId) return;

    const currentDocument = documents.find((doc) => doc.id === metadataDialog.documentId);
    const currentMetadata = normalizeMetadata(currentDocument);
    const nextMetadata = { ...currentMetadata };

    if (fieldValue) {
      nextMetadata[fieldName] = fieldValue;
    } else {
      delete nextMetadata[fieldName];
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/projects/${projectId}/documents/${metadataDialog.documentId}/metadata`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: nextMetadata }),
      });

      if (!response.ok) {
        throw new Error('Failed to save details');
      }

      if (fetchDocuments) fetchDocuments();
      fetchFolders();
      closeMetadataDialog();
    } catch (err) {
      console.error(err);
      window.alert('We could not save those details. Please try again.');
    }
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
    } else if (targetType === 'doc' && draggedItem?.type === 'doc' && sortMode === 'custom') {
      position = y < rect.height / 2 ? "before" : "after";
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
      const draggedDoc = documents.find((doc) => doc.id === id);

      if (targetType === 'root') {
        await moveDocumentToFolder(id, null);
      } else if (targetType === 'doc') {
        const targetDoc = documents.find((doc) => doc.id === targetId);
        if (!draggedDoc || !targetDoc) {
          return;
        }

        if (isSameContainer(draggedDoc, targetDoc)) {
          await reorderDocumentsInContainer(id, targetId, targetDoc.folder_id ?? null, dragPosition);
        } else if ((targetDoc.folder_id ?? null) === null) {
          await moveDocumentToFolder(id, null);
        } else {
          await moveDocumentToFolder(id, targetDoc.folder_id ?? null);
        }
      } else {
        await moveDocumentToFolder(id, null);
      }
    }

    setDraggedItem(null);
    setDragOverId(null);
    setDragPosition(null);
  };

  const renderDoc = (doc, isNested = false) => {
    const isDragging = draggedItem?.type === 'doc' && draggedItem.id === doc.id;
    const metadataSummary = getMetadataSummary(doc);
    return (
      <li 
        key={doc.id} 
        draggable
        onDragStart={(e) => handleDragStart(e, 'doc', doc.id)}
        onClick={() => onDocumentClick(doc.id)} 
        onContextMenu={(e) => handleContextMenu(e, 'doc', doc.id, doc.filename)}
        onDragOver={(e) => handleDragOver(e, 'doc', doc.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, 'doc', doc.id)}
        style={{ 
          marginBottom: '5px',
          marginLeft: isNested ? '20px' : '0',
          opacity: isDragging ? 0.3 : 1,
          borderTop: dragOverId === `doc-${doc.id}` && dragPosition === 'before' ? '2px solid #646cff' : '2px solid transparent',
          borderBottom: dragOverId === `doc-${doc.id}` && dragPosition === 'after' ? '2px solid #646cff' : '2px solid transparent',
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
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              📄 {doc.filename}
            </div>
            <div style={{ marginTop: '2px', fontSize: '11px', color: '#a9a9a9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {formatImportedDate(doc.created_at)}{metadataSummary ? ` · ${metadataSummary}` : ''}
            </div>
          </div>
        </div>
      </li>
    );
  };

  const renderDocumentBucket = (title, docs, isNested = false) => {
    if (docs.length === 0) return null;

    return (
      <div style={{ marginTop: isNested ? '8px' : '12px' }}>
        {title && (
          <div style={{ marginBottom: '6px', fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {title}
          </div>
        )}
        {docs.map((doc) => renderDoc(doc, isNested))}
      </div>
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
          accept=".txt,.md,.rtf,.pdf,.docx,.odt" 
          style={{ display: 'none' }} 
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

      <div style={{
        marginBottom: '20px',
        padding: '14px',
        borderRadius: '12px',
        border: '1px solid #333',
        backgroundColor: '#202020',
      }}>
        <div style={{ marginBottom: '10px', fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Filters and sorting
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid #333',
              backgroundColor: '#111',
              color: 'white',
              fontSize: '12px',
            }}
          >
            <option value="custom">Custom order</option>
            <option value="alphabetical">Alphabetical</option>
            <option value="date">Date imported</option>
          </select>
          <input
            value={metadataFilterKey}
            onChange={(e) => setMetadataFilterKey(e.target.value)}
            placeholder="Metadata field"
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid #333',
              backgroundColor: '#111',
              color: 'white',
              fontSize: '12px',
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '11px', color: '#888', lineHeight: 1.4 }}>
            {metadataFilterKey
              ? 'Filtering the list by metadata tags.'
              : sortMode === 'custom'
                ? 'Drag documents up or down to set a custom order.'
                : 'Sort documents alphabetically or by import date.'}
          </div>
          <button
            type="button"
            onClick={() => {
              setMetadataFilterKey("");
            }}
            style={{
              padding: '6px 10px',
              backgroundColor: 'transparent',
              border: '1px solid #444',
              color: '#ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Clear filters
          </button>
        </div>
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
          const folderGroups = getDocumentBuckets(documents.filter(d => d.folder_id === folder.id));
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
                    {folderGroups.matching.length + folderGroups.missingField.length}
                  </span>
                </div>
              </div>
              
              {isExpanded && (
                <ul style={{ listStyleType: 'none', padding: 0, marginTop: '4px' }}>
                  {folderGroups.matching.length === 0 && folderGroups.missingField.length === 0 ? (
                    <div style={{ marginLeft: '40px', fontSize: '12px', color: '#555', fontStyle: 'italic', padding: '4px' }}>Empty folder</div>
                  ) : (
                    <>
                      {renderDocumentBucket('', folderGroups.matching, true)}
                      {metadataFilterKey.trim() && renderDocumentBucket(`Doesn't contain ${metadataFilterKey.trim()}`, folderGroups.missingField, true)}
                    </>
                  )}
                </ul>
              )}
            </li>
          );
        })}

        {/* ROOT LEVEL DOCUMENTS */}
        <li
          style={{
            marginTop: '10px',
            minHeight: '40px',
            borderTop: folders.length > 0 ? '1px solid #333' : 'none',
            paddingTop: '10px',
            backgroundColor: dragOverId === 'root-root' ? 'rgba(100, 108, 255, 0.2)' : 'transparent',
            borderRadius: '4px',
            transition: 'background-color 0.2s',
          }}
          onDragOver={(e) => handleDragOver(e, 'root', 'root')}
          onDrop={(e) => handleDrop(e, 'root', 'root')}
        >
          <div style={{ marginBottom: '8px', fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Files without folder
          </div>
          <div style={{ minHeight: '24px' }}>
            {(() => {
              const rootGroups = getDocumentBuckets(documents.filter((doc) => !doc.folder_id));
              return (
                <>
                  {renderDocumentBucket('', rootGroups.matching, false)}
                  {metadataFilterKey.trim() && renderDocumentBucket(`Doesn't contain ${metadataFilterKey.trim()}`, rootGroups.missingField, false)}
                </>
              );
            })()}
          </div>
        </li>
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
                  openMetadataDialog(contextMenu.id, contextMenu.name);
                }}
                style={{ width: '100%', padding: '8px 12px', backgroundColor: 'transparent', color: 'white', border: 'none', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#646cff'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                Add details
              </button>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onDeleteDocument(contextMenu.id, contextMenu.name);
                  setContextMenu(null); 
                }}
                style={{ width: '100%', marginTop: '4px', padding: '8px 12px', backgroundColor: 'transparent', color: '#ff6b6b', border: 'none', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#441111'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                Delete document
              </button>
            </>
          )}
        </div>
      )}

      {metadataDialog.isOpen && (
        <div
          onClick={closeMetadataDialog}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: '#1c1c22',
              border: '1px solid #444',
              borderRadius: '12px',
              padding: '18px',
              color: 'white',
              boxShadow: '0 20px 40px rgba(0,0,0,0.45)',
            }}
          >
            <h4 style={{ marginTop: 0, marginBottom: '6px' }}>Add details to this document</h4>
            <p style={{ marginTop: 0, color: '#b8b8b8', fontSize: '13px', lineHeight: 1.5 }}>
              Use this to add simple labels like “Interview date” or “Location” so you can find the document again later.
            </p>
            <div style={{ marginBottom: '14px', fontSize: '12px', color: '#8f8f8f' }}>
              {metadataDialog.documentName}
            </div>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '10px' }}>
              Label name
              <input
                value={metadataFieldName}
                onChange={(e) => setMetadataFieldName(e.target.value)}
                placeholder='For example: Interview date'
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #444',
                  backgroundColor: '#111',
                  color: 'white',
                  boxSizing: 'border-box',
                }}
              />
            </label>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '16px' }}>
              Label value
              <input
                value={metadataFieldValue}
                onChange={(e) => setMetadataFieldValue(e.target.value)}
                placeholder='For example: 2026-05-24 or Lisbon'
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #444',
                  backgroundColor: '#111',
                  color: 'white',
                  boxSizing: 'border-box',
                }}
              />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={closeMetadataDialog}
                style={{
                  padding: '9px 14px',
                  borderRadius: '8px',
                  border: '1px solid #555',
                  backgroundColor: 'transparent',
                  color: '#ddd',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveDocumentMetadata}
                style={{
                  padding: '9px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#646cff',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Save details
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DocumentSidebar;