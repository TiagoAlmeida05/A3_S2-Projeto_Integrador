import React, { useState } from "react";

export default function CodeMemoModal({ open, onClose, onSave, codeName }) {
  const [text, setText] = useState("");

  if (!open) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.4)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{ background: "#23232a", padding: 32, borderRadius: 12, minWidth: 340, boxShadow: "0 8px 32px #0008" }}>
        <h3 style={{ marginTop: 0 }}>Add Memo for <span style={{ color: '#646cff' }}>{codeName}</span></h3>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={5}
          style={{ width: "100%", borderRadius: 6, border: '1px solid #888', padding: 8, fontSize: 15, marginBottom: 16 }}
          placeholder="Write your memo here..."
        />
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button 
              onClick={onClose} 
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.08)"; e.currentTarget.style.borderColor = "#aaa"; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = "#555"; }}
              style={{ padding: '8px 16px', backgroundColor: 'transparent', color: '#ccc', border: '1px solid #555', borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s ease' }}
            >
              Cancel
            </button>
            <button 
              onClick={() => { onSave(text); setText(""); }} 
              disabled={!text.trim()} 
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#7a82ff"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#646cff"}
              style={{ padding: '8px 16px', backgroundColor: '#646cff', color: 'white', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s ease' }}
            >
              Save Memo
            </button>
        </div>
      </div>
    </div>
  );
}
