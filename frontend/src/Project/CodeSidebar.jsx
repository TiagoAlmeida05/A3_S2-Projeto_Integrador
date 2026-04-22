import { useState, useEffect } from 'react';

function CodeSidebar({ projectId, codes, onDeleteCode, onRefreshCodes, onOpenCodePanel, onReorderCodes }) {
  const [newCodeName, setNewCodeName] = useState("");
  const [newCodeColor, setNewCodeColor] = useState("#646cff");

  const [editingCodeId, setEditingCodeId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const [contextMenu, setContextMenu] = useState(null);
  const [addingSubCodeTo, setAddingSubCodeTo] = useState(null);
  const [subCodeName, setSubCodeName] = useState("");
  const [subCodeColor, setSubCodeColor] = useState("#4CAF50");

  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [dragPosition, setDragPosition] = useState(null); // "before", "after", "inside"
  
  const [expandedCodes, setExpandedCodes] = useState(new Set());

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleCreateCode = async (e) => {
    e.preventDefault();
    if (!newCodeName.trim()) return;

    try {
      const response = await fetch(`http://127.0.0.1:8000/projects/${projectId}/codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newCodeName, 
          color: newCodeColor,
          parent_id: null
        })
      });

      if (response.ok) {
        setNewCodeName(""); // Clear the input
        if(onRefreshCodes) onRefreshCodes();
      }
    } catch (error) {
      console.error("Failed to create code:", error);
    }
  };

  const handleCreateSubCode = async (e, parentId) => {
    e.preventDefault();
    if (!subCodeName.trim()) return;

    try {
      const response = await fetch(`http://127.0.0.1:8000/projects/${projectId}/codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: subCodeName, 
          color: subCodeColor,
          parent_id: parentId
        })
      });

      if (response.ok) {
        setSubCodeName("");
        setAddingSubCodeTo(null);
        if(onRefreshCodes) onRefreshCodes();
      }
    } catch (error) {
      console.error("Failed to create subcode:", error);
    }
  };

  const handleUpdateCode= async (e) => {
    e.preventDefault();
    if(!editingCodeId) return;

    try {
      const response = await fetch(`http://127.0.0.1:8000/projects/${projectId}/codes/${editingCodeId}`, {
        method: 'PUT',
        headers: {'Content-Type' : 'application/json'},
        body: JSON.stringify({name: editName, color: editColor})
      });

      if (response.ok) {
        setEditingCodeId(null);
        if(onRefreshCodes) onRefreshCodes();
      }
    } catch (error) {
      console.error("Failed to update color:", error)
    }
  };

  const startEditing = (code) => {
    setEditingCodeId(code.id);
    setEditName(code.name);
    setEditColor(code.color)
  };

  const handleDragStart = (e, codeId) => {
    setDraggedId(codeId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, targetCode) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedId === targetCode.id) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;

    let position = "inside";
    if (y < rect.height * 0.25) position = "before";
    else if (y > rect.height * 0.75) position = "after";

    if (position === "inside" && targetCode.parent_id !== null) {
      position = "after";
    }

    setDragOverId(targetCode.id);
    setDragPosition(position);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
    setDragPosition(null);
  }

  const handleDrop = async (e, targetCode) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedId || draggedId === targetCode.id){
      setDragOverId(null);
      setDragPosition(null);
      return;
    }

    const draggedCode = codes.find(c => c.id === draggedId);
    const draggedChildren = codes.filter(c => c.parent_id === draggedId);

    let newParentId = targetCode.parent_id;
    if (dragPosition === "inside") {
      newParentId = targetCode.id;
    }

    if (newParentId === draggedId) {
      setDraggedId(null);
      return;
    }

    draggedCode.parent_id = newParentId;

    let remainingCodes = codes.filter(c => c.id !== draggedId && c.parent_id !== draggedId);
    
    const targetIndex = remainingCodes.findIndex(c => c.id === targetCode.id);
    let insertIndex = targetIndex;

    if (dragPosition === "after" || dragPosition === "inside") {
      let lastChildIndex = targetIndex;
      while(lastChildIndex + 1 < remainingCodes.length && remainingCodes[lastChildIndex + 1].parent_id === targetCode.id) {
        lastChildIndex++;
      }
      insertIndex = lastChildIndex + 1;
    }
    remainingCodes.splice(insertIndex, 0, draggedCode, ...draggedChildren);

    const reorderPayload = remainingCodes.map((c, idx) => ({
      id: c.id,
      parent_id: c.parent_id,
      order_index: idx
    }));

    if (onReorderCodes) onReorderCodes(remainingCodes);

    try {
      await fetch(`http://127.0.0.1:8000/projects/${projectId}/codes/reorder`, {
        method: 'PUT',
        headers: {'Content-Type' : 'application/json'},
        body: JSON.stringify({codes: reorderPayload})
      });
      if (onRefreshCodes) onRefreshCodes();
    } catch (error) {
      console.error("Failed to reorder codes:", error);
    }

    setDraggedId(null);
    setDragOverId(null);
    setDragPosition(null);
  };

  const handleContextMenu = (e, codeId) => {
    e.preventDefault();
    setContextMenu({
      x: e.pageX, 
      y: e.pageY,
      codeId: codeId
    }); 
  }

  const handleMoveCode = async (codeId, newParentId) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/projects/${projectId}/codes/${codeId}`, {
        method: 'PUT',
        headers: {'Content-Type' : 'application/json'},
        body: JSON.stringify({parent_id: newParentId})
      });

      if (response.ok) {
        setExpandedCodes(prev => new Set(prev).add(newParentId));
        if(onRefreshCodes) onRefreshCodes();
      }
    } catch (error) {
      console.error("Failed to move code:", error)
    }
  };

  const getAggregatedFrequency = (codeId) => {
    const baseCode = codes.find(c => c.id === codeId);
    if (!baseCode) return 0;

    let total = baseCode.frequency || 0;
    const children = codes.filter(c => c.parent_id === codeId);
    children.forEach(child => {
      total += getAggregatedFrequency(child.id);
    });
    return total;
  };

  const toggleExpand = (e, codeId) => {
    e.stopPropagation();
    setExpandedCodes(prev => {
      const next = new Set(prev);
      if (next.has(codeId)) next.delete(codeId);
      else next.add(codeId);
      return next;
    });
  };


  const renderCodes = [];
    if (codes) {
      const buildTree = (parentId, depth) => {
        const children = codes.filter(c => c.parent_id === parentId);
        children.forEach(child => {
          renderCodes.push({ ...child, depth });
          if (expandedCodes.has(child.id)) {
            buildTree(child.id, depth + 1);
          }
        });
      };

      buildTree(null, 0);

      codes.forEach(c => {
        const isActuallyRoot = c.parent_id === null || c.parent_id === undefined || c.parent_id === "";
        if (!renderCodes.find(rc => rc.id === c.id) && isActuallyRoot) {
          renderCodes.push({ ...c, depth: 0 });
        }
      });
    }

return (
    <>
      <h3 style={{ marginTop: 0 }}>Code Hierarchy</h3>
      
      <form onSubmit={handleCreateCode} style={{ marginBottom: '20px', display: 'flex', gap: '8px' }}>
        <input 
          type="color" 
          value={newCodeColor}
          onChange={(e) => setNewCodeColor(e.target.value)}
          style={{ width: '40px', height: '36px', padding: '0', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
          title="Choose code color"
        />
        <input 
          type="text" 
          placeholder="New master code..." 
          value={newCodeName}
          onChange={(e) => setNewCodeName(e.target.value)}
          style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#111', color: 'white' }}
        />
        <button type="submit" style={{ padding: '8px 12px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Add
        </button>
      </form>

      <ul style={{ listStyleType: 'none', padding: 0, overflowY: 'auto', flex: 1 }}>
        {renderCodes.length === 0 ? (
          <p style={{ color: '#888', fontSize: '14px' }}>No codes created yet.</p>
        ) : (
          renderCodes.map((code, index) => {
            const isSubCode = code.depth > 0;
            const isDraggingOver = dragOverId === code.id;
            const hasChildren = codes.some(c => c.parent_id === code.id);
            const isExpanded = expandedCodes.has(code.id);

            return (
              <li 
                key={code.id} 
                draggable
                onDragStart={(e) => handleDragStart(e, code.id)}
                onDragOver={(e) => handleDragOver(e, code)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, code)}
                style={{ 
                  marginBottom: '5px',
                  opacity: draggedId === code.id ? 0.3 : 1,
                  marginLeft: `${code.depth * 20}px`,                  
                  transition: 'all 0.2s ease',
                  borderTop: isDraggingOver && dragPosition === 'before' ? '2px solid #646cff' : '2px solid transparent',
                  borderBottom: isDraggingOver && dragPosition === 'after' ? '2px solid #646cff' : '2px solid transparent',
                  backgroundColor: isDraggingOver && dragPosition === 'inside' ? 'rgba(100, 108, 255, 0.2)' : 'transparent',
                  borderRadius: '4px'
                }}
              >
                {editingCodeId === code.id ? (
                  <div style={{ backgroundColor: '#23232a', padding: '10px', borderRadius: '6px', border: '1px solid #646cff' }}>
                    <div style={{ marginBottom: '8px', fontSize: '12px', color: '#b0b0c3', fontWeight: 'bold' }}>Editing Code...</div>
                    <form onSubmit={handleUpdateCode} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                        style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#1f1f28', color: 'white', boxSizing: 'border-box' }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ color: '#b0b0c3', fontSize: '13px' }}>Color:</label>
                        <input
                          type="color"
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          style={{ width: '30px', height: '30px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '5px', marginTop: '4px' }}>
                        <button type="submit" style={{ flex: 1, padding: '6px', backgroundColor: '#646cff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                          Save
                        </button>
                        <button type="button" onClick={() => setEditingCodeId(null)} style={{ flex: 1, padding: '6px', backgroundColor: 'transparent', color: '#ccc', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div
                    onDoubleClick={() => onOpenCodePanel?.(code)}
                    onContextMenu={(e) => handleContextMenu(e, code.id)}
                    title={isSubCode ? "Double-click to open quotes" : "Right-click to add Sub-Code. Double-click to open quotes."}
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
                    {/* LEFT SIDE: Icons & Name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#666', fontSize: '14px', cursor: 'grab' }}>⋮⋮</div>
                      
                      <div style={{ width: '16px', textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
                        {hasChildren ? (
                          <div 
                            onClick={(e) => toggleExpand(e, code.id)}
                            style={{ cursor: 'pointer', fontSize: '12px', color: '#aaa', padding: '4px' }}
                          >
                            {isExpanded ? '▼' : '▶'}
                          </div>
                        ) : (
                          isSubCode && <span style={{ color: '#888', fontSize: '14px' }}>↳</span>
                        )}
                      </div>
                      
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: code.color, flexShrink: 0 }}></div>
                      
                      <span style={{ 
                        fontSize: isSubCode ? '13px' : '15px', 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        fontWeight: (!isSubCode) ? 'bold' : 'normal'
                      }}>
                        {code.name}
                      </span>
                    </div>

                    {/* RIGHT SIDE: Badges & Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {getAggregatedFrequency(code.id) > 0 && (
                        <span style={{ 
                          backgroundColor: '#111', 
                          color: '#aaa', 
                          fontSize: '11px', 
                          padding: '2px 8px', 
                          borderRadius: '10px', 
                          fontWeight: 'bold',
                        }}>
                          {getAggregatedFrequency(code.id)}
                        </span>
                      )}
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); startEditing(code); }}
                        style={{ backgroundColor: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}
                        title="Edit Code"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteCode(code.id); }}
                        style={{ backgroundColor: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}
                        title="Delete Code"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )}

                {addingSubCodeTo === code.id && (
                  <form onSubmit={(e) => handleCreateSubCode(e, code.id)} style={{ display: 'flex', gap: '6px', marginTop: '6px', padding: '8px', backgroundColor: '#1a1a1a', borderLeft: `2px solid ${code.color}`, borderRadius: '4px' }}>
                    <input 
                      type="color" 
                      value={subCodeColor}
                      onChange={(e) => setSubCodeColor(e.target.value)}
                      style={{ width: '28px', height: '28px', padding: '0', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                    />
                    <input 
                      type="text" 
                      autoFocus 
                      placeholder={`Sub-code for ${code.name}...`} 
                      value={subCodeName}
                      onChange={(e) => setSubCodeName(e.target.value)}
                      style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#111', color: 'white', fontSize: '12px' }}
                    />
                    <button type="submit" style={{ padding: '4px 8px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                      Save
                    </button>
                    <button type="button" onClick={() => setAddingSubCodeTo(null)} style={{ padding: '4px 8px', backgroundColor: 'transparent', color: '#ccc', border: '1px solid #444', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                      Cancel
                    </button>
                  </form>
                )}
              </li>
            );
          })
        )}
      </ul>

      {contextMenu && (
        <div style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 9999, backgroundColor: '#23232a', border: '1px solid #444', borderRadius: '6px', boxShadow: '0 8px 16px rgba(0,0,0,0.5)', padding: '4px', minWidth: '180px' }}>
          
          {/* Option 1: Create New */}
          <button 
            onClick={(e) => { e.stopPropagation(); setAddingSubCodeTo(contextMenu.codeId); setContextMenu(null); }}
            style={{ width: '100%', padding: '8px 12px', backgroundColor: 'transparent', color: 'white', border: 'none', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#646cff'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            ✨ New Sub-Code here
          </button>

          <div style={{ height: '1px', backgroundColor: '#444', margin: '4px 0' }} />
          <div style={{ fontSize: '11px', color: '#888', padding: '4px 12px' }}>Move Existing Code Here:</div>

          <div style={{ maxHeight: '200px', overflowY: 'auto', borderTop: '1px solid #444', marginTop: '4px' }}>
            <div style={{ fontSize: '11px', color: '#888', padding: '8px 12px 4px 12px' }}>Move Existing Code Here:</div>
            {codes
              .filter(c => c.id !== contextMenu.codeId) // Can't move a code into itself
              .map(c => (
                <button 
                  key={c.id}
                  onClick={(e) => { e.stopPropagation(); handleMoveCode(c.id, contextMenu.codeId); setContextMenu(null); }}
                  style={{ width: '100%', padding: '6px 12px', backgroundColor: 'transparent', color: '#ccc', border: 'none', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '12px' }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#333'}
                  onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  ↳ {c.name}
                </button>
              ))}
          </div>
        </div>
      )}
    </>
  );
}

export default CodeSidebar;