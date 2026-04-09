import { useState, useEffect } from 'react';

function CodeSidebar({ projectId, codes, onDeleteCode, onRefreshCodes }) {
  const [newCodeName, setNewCodeName] = useState("");
  const [newCodeColor, setNewCodeColor] = useState("#646cff");

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
            <li 
              key={code.id}
              style={{ 
                padding: '8px 12px', 
                backgroundColor: '#2a2a2a', 
                color: 'white', 
                marginBottom: '5px', 
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between', // Spreads items left and right
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: code.color }}></div>
                <span>{code.name}</span>
              </div>
              
              {/* 3. THE NEW DELETE BUTTON */}
              <button 
                onClick={() => onDeleteCode(code.id)}
                style={{ 
                  backgroundColor: 'transparent', 
                  border: 'none', 
                  color: '#ff6b6b', 
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '0 5px'
                }}
                title="Delete Code"
              >
                🗑️
              </button>
            </li>
          ))
        )}
      </ul>
    </>
  );
}

export default CodeSidebar;