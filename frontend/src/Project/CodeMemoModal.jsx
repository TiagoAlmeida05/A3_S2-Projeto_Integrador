import React, { useState } from "react";

export default function CodeMemoModal({ open, onClose, onSave, codeName }) {
  const [text, setText] = useState("");

  if (!open) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      {/* Container styling matches ConfirmDeleteModal */}
      <div style={{ 
        backgroundColor: "#242424", 
        padding: "30px", 
        borderRadius: "8px", 
        border: "1px solid #444", 
        width: "400px", 
        color: "white", 
        boxShadow: "0 8px 30px rgba(0,0,0,0.6)" 
      }}>
        
        <h3 style={{ marginTop: 0, marginBottom: "20px" }}>
          Add Memo for <span style={{ color: '#646cff' }}>{codeName}</span>
        </h3>
        
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={5}
          autoFocus
          style={{ 
            width: "100%", 
            boxSizing: 'border-box',
            borderRadius: 4, 
            border: '1px solid #555', 
            padding: 10, 
            fontSize: 14, 
            marginBottom: 20,
            backgroundColor: '#111',
            color: 'white',
            resize: 'vertical'
          }}
          placeholder="Write your memo here..."
        />
        
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button 
            onClick={onClose} 
            onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.borderColor = "#aaa";
                e.currentTarget.style.color = "#fff";
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = "#666";
                e.currentTarget.style.color = "#ccc";
            }}
            style={{ 
              padding: '10px 16px', 
              backgroundColor: 'transparent', 
              color: '#ccc', 
              border: '1px solid #666', 
              borderRadius: '4px', 
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Cancel
          </button>
          
          <button 
            onClick={() => { onSave(text); setText(""); }} 
            disabled={!text.trim()} 
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#7a82ff"}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#646cff"}
            style={{ 
              padding: '10px 16px', 
              backgroundColor: '#646cff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer', 
              fontWeight: 'bold',
              transition: 'all 0.2s ease'
            }}
          >
            Save Memo
          </button>
        </div>
      </div>
    </div>
  );
}