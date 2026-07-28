import { useState, useRef } from 'react';
import { importProjectFromRefi } from '../utils/backend-api';

function ImportProjectModal({ isOpen, onClose, onImportSuccess }) {
  const fileInputRef = useRef(null);
  const [isImporting, setIsImporting] = useState(false);
  const [statusText, setStatusText] = useState("");

  if (!isOpen) return null;

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsImporting(true);
    setStatusText("Uploading and unpacking QDPX file...");
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await importProjectFromRefi(formData);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Import failed");
      }

      const newProject = await response.json();
      setStatusText("Import complete!");
      
      // Wait 1 second
      setTimeout(() => {
        onImportSuccess(newProject.id);
      }, 1000);
      
    } catch (error) {
      console.error(error);
      setStatusText(`Error: ${error.message}`);
      setIsImporting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: '#1a1a1a', padding: '30px', borderRadius: '8px', width: '400px', color: 'white', border: '1px solid #333' }}>
        
        <h2 style={{ marginTop: 0, color: "#fff" }}>Import QDPX Project</h2>
        <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '20px' }}>
          Upload a REFI-QDA (.qdpx) package from ATLAS.ti, NVivo, or MAXQDA to instantly recreate your workspace.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          <input
            type="file"
            accept=".qdpx"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          <button 
            onClick={() => fileInputRef.current.click()}
            disabled={isImporting}
            onMouseOver={(e) => {
              if (!isImporting) {
                e.currentTarget.style.backgroundColor = "#7a82ff";
                e.currentTarget.style.borderColor = "#7a82ff";
              }
            }}
            onMouseOut={(e) => {
              if (!isImporting) {
                e.currentTarget.style.backgroundColor = "#646cff";
                e.currentTarget.style.borderColor = "#646cff";
              }
            }}
            style={{ padding: '12px', backgroundColor: '#646cff', color: 'white', border: 'none', borderRadius: '6px', cursor: isImporting ? 'not-allowed' : 'pointer', fontWeight: 'bold',transition: 'all 0.2s ease' }}
          >
            {isImporting ? 'Processing...' : 'Select .qdpx File'}
          </button>

          {statusText && (
            <div style={{ textAlign: 'center', fontSize: '14px', color: statusText.includes('❌') ? '#ff6b6b' : '#4CAF50' }}>
              {statusText}
            </div>
          )}

          <button 
            onClick={onClose} 
            disabled={isImporting}
            onMouseOver={(e) => {
              if (!isImporting) {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.borderColor = "#aaa";
                e.currentTarget.style.color = "#fff";
              }
            }}
            onMouseOut={(e) => {
              if (!isImporting) {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = "#555";
                e.currentTarget.style.color = "#ccc";
              }
            }}
            style={{ padding: '8px', backgroundColor: 'transparent', color: '#ccc', border: '1px solid #555', borderRadius: '6px', cursor: isImporting ? 'not-allowed' : 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImportProjectModal;