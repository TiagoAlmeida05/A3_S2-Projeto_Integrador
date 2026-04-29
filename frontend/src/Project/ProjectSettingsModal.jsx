import { useState, useEffect } from 'react';

function ProjectSettingsModal({ isOpen, onClose, currentName, currentDescription, currentLocalPath, onSave, onDelete }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Whenever the modal opens, pre-fill the text boxes with the current data
  useEffect(() => {
    if (isOpen) {
      setName(currentName || "");
      setDescription(currentDescription || "");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) {
      alert("Project name cannot be empty.");
      return;
    }
    onSave(name, description);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: '#242424', padding: '30px', borderRadius: '8px', border: '1px solid #444', width: '400px', color: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
        
        <h3 style={{ marginTop: 0 }}>⚙️ Project Settings</h3>
        
        <div style={{ marginTop: '20px', marginBottom: '15px' }}>
          <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '5px' }}>Project Name</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            autoFocus
            style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#111', color: 'white' }} 
          />
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '5px' }}>Description</label>
          <textarea 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            rows="4" 
            style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#111', color: 'white', resize: 'vertical' }} 
          />
        </div>

        <div style={{ marginBottom: '25px', padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '4px', border: '1px dashed #444' }}>
          <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>Permanent Local Path</label>
          <div style={{ fontSize: '13px', color: '#aaa', wordBreak: 'break-all' }}>
            📂 {currentLocalPath || "Stored in database only"}
          </div>
          <p style={{ fontSize: '11px', color: '#666', marginTop: '5px', marginBottom: 0 }}>
            Changing the project name above will not change the folder name on your hard drive to prevent data loss.
          </p>
        </div>

        {/* BOTTOM BUTTON ROW */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          <button 
            onClick={() => {
              const confirm = window.confirm(`Are you sure you want to permanently delete "${currentName}"? This will delete all documents and codes.`);
              if (confirm) onDelete();
            }}
            style={{ padding: '8px 12px', backgroundColor: 'transparent', border: '1px solid #ff6b6b', color: '#ff6b6b', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
            onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255, 107, 107, 0.1)'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            🗑️ Delete Project
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={onClose} 
              style={{ padding: '10px 15px', backgroundColor: 'transparent', border: '1px solid #666', color: '#ccc', borderRadius: '4px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              style={{ padding: '10px 15px', backgroundColor: '#4CAF50', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Save Changes
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}

export default ProjectSettingsModal;