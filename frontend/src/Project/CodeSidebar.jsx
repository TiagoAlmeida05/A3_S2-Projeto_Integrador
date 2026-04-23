import { useState } from 'react';
import CodeMemoModal from './CodeMemoModal';
import axios from 'axios';

function CodeSidebar({ projectId, codes, onDeleteCode, onRefreshCodes, onOpenCodePanel }) {
  const [memoModalOpen, setMemoModalOpen] = useState(false);
  const [memoTargetCode, setMemoTargetCode] = useState(null);
  const [memoError, setMemoError] = useState(null);
  const [newCodeName, setNewCodeName] = useState("");
  const [newCodeColor, setNewCodeColor] = useState("#646cff");

  const [editingCodeId, setEditingCodeId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("")

  const handleCreateCode = async (e) => {
    e.preventDefault();
    if (!newCodeName.trim()) return;

    try {
      const response = await fetch(`http://127.0.0.1:8000/projects/${projectId}/codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newCodeName, 
          color: newCodeColor 
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

  // Context menu handler
  const handleContextMenu = (e, code) => {
    e.preventDefault();
    setMemoTargetCode(code);
    setMemoModalOpen(true);
  };

  const handleSaveMemo = async (text) => {
    if (!memoTargetCode) return;
    setMemoError(null);
    try {
      await axios.post(`http://127.0.0.1:8000/memos`, {
        text,
        target_type: 'code',
        target_id: memoTargetCode.id
      });
      setMemoModalOpen(false);
      setMemoTargetCode(null);
    } catch (err) {
      setMemoError('Failed to save memo');
    }
  };

  return (
    <>
      <h3 style={{ marginTop: 0 }}>Master Codes</h3>
      
      {/* Code Creation Form */}
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
          placeholder="New code name..." 
          value={newCodeName}
          onChange={(e) => setNewCodeName(e.target.value)}
          style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#111', color: 'white' }}
        />
        <button type="submit" style={{ padding: '8px 12px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Add
        </button>
      </form>

      {/* List of Existing Codes */}
      <ul style={{ listStyleType: 'none', padding: 0, overflowY: 'auto', flex: 1 }}>
        {(!codes || codes.length === 0) ? (
          <p style={{ color: '#888', fontSize: '14px' }}>No codes created yet.</p>
        ) : (
          codes.map(code => (
            <li key={code.id} style={{ marginBottom: '5px' }} onContextMenu={e => handleContextMenu(e, code)}>
              
              {/* Check if this specific row is being edited */}
              {editingCodeId === code.id ? (
                
                /* THE INLINE EDIT FORM */
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

                /* THE NORMAL DISPLAY ROW */
                <div
                  onDoubleClick={() => onOpenCodePanel?.(code)}
                  title="Double-click to open compiled quotes\nRight-click for memo"
                  style={{ padding: '8px 12px', backgroundColor: '#2a2a2a', color: 'white', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: code.color, flexShrink: 0 }}></div>
                    <span 
                      title={code.name} 
                      style={{ 
                        fontSize: '15px',
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis' 
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
            </li>
          ))
        )}
      </ul>
      {memoModalOpen && (
        <CodeMemoModal
          open={memoModalOpen}
          onClose={() => { setMemoModalOpen(false); setMemoTargetCode(null); setMemoError(null); }}
          onSave={handleSaveMemo}
          codeName={memoTargetCode?.name || ''}
        />
      )}
      {memoError && <div style={{ color: 'red', marginTop: 8 }}>{memoError}</div>}
    </>
  );
}

export default CodeSidebar;