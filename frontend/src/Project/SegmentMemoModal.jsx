import React, { useState } from "react";

export default function SegmentMemoModal({ open, onClose, onSave, }) {

    const [text, setText] = useState("");

    if(!open) return null;

    return (<div style={{position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999,display: "flex", alignItems: "center", justifyContent: "center"}}>
          <div style={{ 
            backgroundColor: "#242424", 
            padding: "30px", 
            borderRadius: "8px", 
            border: "1px solid #444", 
            width: "400px", 
            color: "white", 
            boxShadow: "0 8px 30px rgba(0,0,0,0.6)" 
          }}>
            <h3 style={{ marginTop: 0, marginBottom: "15px" }}>Add Quote Memo</h3>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Memo text..." rows={5} autoFocus style={{ width: "100%", padding: "12px", borderRadius: 4, border: "1px solid #555", backgroundColor: "#111", color: "white", boxSizing: "border-box", marginBottom: "16px", resize: "vertical" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={onClose} 
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.08)"; e.currentTarget.style.borderColor = "#aaa"; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = "#555"; }}
                style={{ padding: '8px 16px', backgroundColor: 'transparent', color: '#ccc', border: '1px solid #555', borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s ease' }}>
                Cancel
              </button>
              <button onClick={() => { onSave(text); setText(""); }} 
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#7a82ff"}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#646cff"}
                  style={{ padding: '8px 16px', backgroundColor: '#646cff', color: 'white', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s ease' }}
                >
                  Save Memo
              </button>
            </div>
          </div>
        </div>);
}