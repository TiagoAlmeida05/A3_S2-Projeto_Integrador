import { useState, useEffect } from 'react';

function CodeSidebar({ projectId, codes, onDeleteCode, onRefreshCodes, onOpenCodePanel, onReorderCodes }) {
  const [newCodeName, setNewCodeName] = useState("");
  const [newCodeColor, setNewCodeColor] = useState("#646cff");

  const [editingCodeId, setEditingCodeId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const [contextMenu, setContextMenu] = useState(null);
  
  const [addingSubCodeTo, setAddingSubCodeTo] = useState(null);
  
  const [subCodeName, setSubCodeName] = useState("");
  const [subCodeColor, setSubCodeColor] = useState("#4CAF50");

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

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  }

  const handleDrop = async (e, targetIndex) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newCodes = [...codes];
    const [draggedCode] = newCodes.splice(draggedIndex, 1);
    newCodes.splice(targetIndex, 0, draggedCode);

    // Update the codes array
    if (onReorderCodes) onReorderCodes(newCodes);

    setDraggedIndex(null);
  };

  const handleContextMenu = (e, codeId) => {
    e.preventDefault();
    setContextMenu({
      x: e.pageX, 
      y: e.pageY,
      codeId: codeId
    }); 
  }

  const renderCodes = [];
  if (codes) {
    const topLevel = codes.filter(c => !c.parent_id);
    topLevel.forEach(parent => {
      renderCodes.push(parent);
      const children = codes.filter(c => c.parent_id === parent.id);
      renderCodes.push(...children);
    });
    codes.forEach(c => { if(!renderCodes.find(rc => rc.id === c.id)) renderCodes.push(c); });
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
            const isSubCode = code.parent_id != null;

            return (
              <li 
                key={code.id} 
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                style={{ 
                  marginBottom: '5px',
                  opacity: draggedIndex === index ? 0.4 : 1,
                  borderTop: dragOverIndex === index ? '2px solid #646cff' : '2px solid transparent',
                  marginLeft: isSubCode ? '20px' : '0px', // INDENT SUB-CODES!
                  transition: 'border 0.2s ease, margin-left 0.2s ease'
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
                    onContextMenu={(e) => handleContextMenu(e, code.id)} // TRIGGERS RIGHT-CLICK
                    title={isSubCode ? "Double-click to open quotes" : "Right-click to add Sub-Code. Double-click to open quotes."}
                    style={{ padding: '8px 12px', backgroundColor: '#2a2a2a', color: 'white', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', cursor: 'grab' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#666', fontSize: '14px', cursor: 'grab' }}>⋮⋮</div>
                      
                      {isSubCode && <span style={{ color: '#888', fontSize: '14px' }}>↳</span>}
                      
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: code.color, flexShrink: 0 }}></div>
                      <span 
                        style={{ 
                          fontSize: isSubCode ? '13px' : '15px', 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          fontWeight: (!isSubCode && index === 0) ? 'bold' : 'normal'
                        }}
                      >
                        {code.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); startEditing(code); }}
                        style={{ backgroundColor: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '16px', padding: '0 5px' }}
                        title="Edit Code"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteCode(code.id); }}
                        style={{ backgroundColor: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '16px', padding: '0 5px' }}
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
        <div 
          style={{ 
            position: 'fixed', 
            top: contextMenu.y, 
            left: contextMenu.x, 
            zIndex: 9999, 
            backgroundColor: '#23232a', 
            border: '1px solid #444', 
            borderRadius: '6px', 
            boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
            padding: '4px',
            minWidth: '150px'
          }}
        >
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setAddingSubCodeTo(contextMenu.codeId);
              setContextMenu(null);
            }}
            style={{ width: '100%', padding: '8px 12px', backgroundColor: 'transparent', color: 'white', border: 'none', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#646cff'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            ↳ Add Sub-Code
          </button>
        </div>
      )}
    </>
  );
}

export default CodeSidebar;