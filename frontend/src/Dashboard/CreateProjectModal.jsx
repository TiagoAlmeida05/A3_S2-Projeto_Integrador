import { useState } from 'react';

function CreateProjectModal({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [localPath, setLocalPath] = useState("");
  const [folderError, setFolderError] = useState("");

  if (!isOpen) return null;

  const handleBrowseFolder = async () => {
    try {
      setFolderError("");
      if (window.electronAPI && window.electronAPI.selectFolder) {
        const selectedPath = await window.electronAPI.selectFolder();
        if (selectedPath) {
          setLocalPath(selectedPath);
        }
      } else {
        setFolderError("Electron bridge not found. Make sure you are running the Electron app, not a web browser.");
      }
      
    } catch (err) {
      console.error("Failed to open folder picker", err);
      setFolderError("Failed to open native folder dialog.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFolderError("");
    if (!name.trim()) return;
    
    try {

      await onCreate({ name, description, local_path: localPath });
      
      setName("");
      setDescription("");
      setLocalPath("");
      setFolderError("");
    } catch (err) {
      // If FastAPI rejected it, catch the error and display it!
      setFolderError(err.message);
    }
  };

  const handleCancel = () => {
    setFolderError("");
    onClose();
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: '#242424', padding: '30px', borderRadius: '8px', border: '1px solid #444', width: '450px', color: 'white' }}>
        
        <h2 style={{ marginTop: 0 }}>Create New Workspace</h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', color: '#aaa' }}>Project Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#111', color: 'white' }} />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', color: '#aaa' }}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows="3" style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#111', color: 'white' }} />
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '5px', color: '#aaa' }}>Local Destination Folder</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="text" readOnly value={localPath} placeholder="Choose a folder..." style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#111', color: '#888' }} />
              <button type="button" onClick={handleBrowseFolder} style={{ padding: '10px 15px', backgroundColor: '#333', border: '1px solid #555', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>
                📂 Browse...
              </button>
            </div>
            {!localPath && (
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#f0c36d', lineHeight: 1.4 }}>
                ⚠️ If you do not choose a local folder, PDF previews may not always show correctly. The text content will still be saved.
              </p>
            )}
            {folderError ? (
              <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#ff4444', fontWeight: 'bold' }}>
                ⚠️ {folderError}
              </p>
            ) : (
              <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
                A new folder named <strong>"{name || 'Your Project'}"</strong> will be created inside this location.
              </p>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 15px', backgroundColor: 'transparent', border: '1px solid #666', color: '#ccc', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" style={{ padding: '10px 15px', backgroundColor: '#646cff', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Create Project</button>
          </div>
        </form>

      </div>
    </div>
  );
}

export default CreateProjectModal;