import React, { useState } from "react";

export default function DocumentMetadataModal({ documentId, 
                                                documentName,
                                                onClose,
                                                onSave }){

    const [metadataFieldSelection, setMetadataFieldSelection] = useState("Date"); 
    const [metadataFieldName, setMetadataFieldName] = useState("");
    const [metadataFieldValue, setMetadataFieldValue] = useState("");

    const saveMetadata = () => {
        const finalFieldName = metadataFieldSelection === "Custom..." 
            ? metadataFieldName.trim() 
            : metadataFieldSelection.trim();
        
        const fieldValue = metadataFieldValue.trim();
        if (!finalFieldName || !documentId) return;

        onSave(finalFieldName, fieldValue);
    }

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '420px', backgroundColor: '#1c1c22', border: '1px solid #444', borderRadius: '12px', padding: '18px', color: 'white', boxShadow: '0 20px 40px rgba(0,0,0,0.45)' }}>
            <h4 style={{ marginTop: 0, marginBottom: '6px' }}>Add details to this document</h4>
            <p style={{ marginTop: 0, color: '#b8b8b8', fontSize: '13px', lineHeight: 1.5 }}>Use simple details to easily locate items later.</p>
            <div style={{ marginBottom: '14px', fontSize: '12px', color: '#8f8f8f' }}>{documentName}</div>
            
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '10px' }}>
              Detail Category
              <select 
                value={metadataFieldSelection} 
                onChange={(e) => setMetadataFieldSelection(e.target.value)} 
                style={{ width: '100%', marginTop: '6px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #444', backgroundColor: '#111', color: 'white', boxSizing: 'border-box', cursor: 'pointer' }}
              >
                <option value="Date">Date</option>
                <option value="Location">Location</option>
                <option value="Interviewer">Interviewer</option>
                <option value="Participant Type">Participant Type</option>
                <option value="Demographic">Demographic</option>
                <option value="Custom...">✨ Custom...</option>
              </select>
            </label>

            {metadataFieldSelection === "Custom..." && (
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '10px' }}>
                Custom Label Name
                <input autoFocus value={metadataFieldName} onChange={(e) => setMetadataFieldName(e.target.value)} placeholder='e.g., Project Phase' style={{ width: '100%', marginTop: '6px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #444', backgroundColor: '#111', color: 'white', boxSizing: 'border-box' }} />
              </label>
            )}

            <label style={{ display: 'block', fontSize: '13px', marginBottom: '16px' }}>
              Value
              <input 
                type={metadataFieldSelection === "Date" ? "date" : "text"}
                value={metadataFieldValue} 
                onChange={(e) => setMetadataFieldValue(e.target.value)} 
                placeholder={metadataFieldSelection === "Custom..." ? 'e.g., Phase 1' : 'e.g., Lisbon or Tag'} 
                style={{ 
                  width: '100%', 
                  marginTop: '6px', 
                  padding: '10px 12px', 
                  borderRadius: '8px', 
                  border: '1px solid #444', 
                  backgroundColor: '#111', 
                  color: 'white', 
                  boxSizing: 'border-box',
                  colorScheme: 'dark' 
                }} 
              />
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={onClose} style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid #555', backgroundColor: 'transparent', color: '#ddd', cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveMetadata} style={{ padding: '9px 14px', borderRadius: '8px', border: 'none', backgroundColor: '#646cff', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>Save details</button>
            </div>
          </div>
        </div>
      )
}