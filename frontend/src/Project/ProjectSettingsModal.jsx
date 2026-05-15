import { useState, useEffect } from 'react';
import ConfirmDeleteModal from "../Modal/ConfirmDeleteModal";
import { getOrCreateProjectFolder, checkLockStatus, acquireLock } from '../Utils/driveAPI';

function ProjectSettingsModal({ isOpen, onClose, currentName, currentDescription, currentLocalPath, onSave, onDelete }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [driveStatus, setDriveStatus] = useState("");
  const [nickname, setNickname] = useState("");
  
  const isConnected = !!localStorage.getItem('google_drive_tokens');
  const driveFolderId = localStorage.getItem('google_drive_folder_id');
  // Whenever the modal opens, pre-fill the text boxes with the current data
  useEffect(() => {
    if (isOpen) {
      setName(currentName || "");
      setDescription(currentDescription || "");
      setNickname(localStorage.getItem(`nickname_${currentName}`) || "");
      setShowConfirmDelete(false);
    }
  }, [isOpen, currentName, currentDescription]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Project name cannot be empty.");
      return;
    }

    if (isConnected && driveFolderId) {
      try {
        setDriveStatus(`Syncing "${name}" to cloud...`);
        const projectFolderId = await getOrCreateProjectFolder(name, driveFolderId);
        console.log("Cloud synced! Project folder ID:", projectFolderId);
        setDriveStatus("Checking lock status...");
        const lockStatus = await checkLockStatus(projectFolderId);

        if (lockStatus.isLocked) {
          console.warn(`Cannot edit! Project is locked by: ${lockStatus.lockedBy}`);
          setDriveStatus(`Locked by ${lockStatus.lockedBy}`);
        } else {
          setDriveStatus("Locking project for you...");
          const lockFileId = await acquireLock(projectFolderId, nickname);
          localStorage.setItem('current_project_lock_id', lockFileId);
          localStorage.setItem(`nickname_${name}`, nickname);
          console.log("Lock acquired successfully!");
          setDriveStatus("Cloud sync & Lock successful! ✅");
        }
      } catch (error) {
        console.error("Cloud sync failed:", error);
        setDriveStatus("Failed to create cloud folder. Project saved locally.");
      }
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
            type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus
            style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#111', color: 'white' }} 
          />
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '5px' }}>Description</label>
          <textarea 
            value={description} onChange={(e) => setDescription(e.target.value)} rows="4" 
            style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#111', color: 'white', resize: 'vertical' }} 
          />
        </div>

        <div style={{ marginBottom: '25px', padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '4px', border: '1px dashed #444' }}>
          <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>Permanent Local Path</label>
          <div style={{ fontSize: '13px', color: '#aaa', wordBreak: 'break-all' }}>📂 {currentLocalPath || "Stored in database only"}</div>
        </div>

        <div style={{ marginBottom: '25px', padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '4px', border: '1px solid #444' }}>
          <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '10px' }}>Cloud Collaboration</label>
          
          {!isConnected ? (
            <div style={{ fontSize: '12px', color: '#888', padding: '10px', backgroundColor: '#222', borderRadius: '4px', textAlign: 'center' }}>
              ☁️ <b>Google Drive is not connected.</b><br/><br/>
              To collaborate on this project, please return to the Main Dashboard and connect your Google account.
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '15px' }}>
                Your app is connected to Google Drive. Ensure your Nickname is set and click "Save Changes" to sync this project to the cloud.
              </div>

              <label style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '5px' }}>Your Collaborator Nickname</label>
              <input 
                type="text" placeholder="e.g. Alex" value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  localStorage.setItem('collab_nickname', e.target.value);
                }}
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#000', color: 'white' }}
              />
            </div>
          )}
          {driveStatus && <p style={{ fontSize: '12px', color: '#646cff', marginTop: '10px', marginBottom: 0, textAlign: 'center' }}>{driveStatus}</p>}
        </div>

        {/* BOTTOM BUTTON ROW */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            onClick={() => setShowConfirmDelete(true)}
            style={{ padding: '8px 12px', backgroundColor: 'transparent', border: '1px solid #ff6b6b', color: '#ff6b6b', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
          >
            🗑️ Delete Project
          </button>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose} style={{ padding: '10px 15px', backgroundColor: 'transparent', border: '1px solid #666', color: '#ccc', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSave} style={{ padding: '10px 15px', backgroundColor: '#4CAF50', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save Changes</button>
          </div>
        </div>
        
        <ConfirmDeleteModal 
            isOpen={showConfirmDelete} onClose={() => setShowConfirmDelete(false)} onConfirm={() => { setShowConfirmDelete(false); onDelete(); }}
            title={currentName ? `Delete "${currentName}"?` : "Delete Project?"}
            warningText="Are you sure you want to delete this project? All associated documents, transcripts, and highlighted codes will be permanently destroyed."
        />
      </div>
    </div>
  );
}

export default ProjectSettingsModal;