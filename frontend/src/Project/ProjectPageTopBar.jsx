import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { releaseLock, shareDriveFolder } from '../Utils/driveAPI';

const ProjectPageTopBar = ({ projectDetails, handleExportREFI, setIsSettingsOpen, autoSyncToCloud }) => {
  const navigate = useNavigate();

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareStatus, setShareStatus] = useState("");

  const handleBackToDashboard = async () => {

    if(typeof autoSyncToCloud === 'function') {
      await autoSyncToCloud();
    }

    const lockFileId = localStorage.getItem('current_project_lock_id');
    if (lockFileId) {
      console.log("Leaving project! Releasing cloud lock...");
      try {
        await releaseLock(lockFileId);
      } catch (err) {
        console.error("Lock release failed:", err);
      }
      localStorage.removeItem('current_project_lock_id');    
    }
    navigate("/");
  };

  const handleShareClick = async () => {
      if(!shareEmail.includes("@")) {
          setShareStatus("Please enter a valid email.");
          return;
      }

      const folderId = localStorage.getItem('current_project_folder_id');
      if(!folderId) {
          setShareStatus("Project not in cloud. Open Settings and click 'Save Changes' first!");
          return;
      }

      setShareStatus("Sharing...");
      try {
          await shareDriveFolder(folderId, shareEmail);
          setShareStatus(`Shared with ${shareEmail}!`);
          setTimeout(() => {
              setIsShareOpen(false);
              setShareStatus("");
              setShareEmail("");
          }, 2500);
      } catch (error) {
          setShareStatus(`Failed: ${error.message}`);
      }
  };

  return (
    <>
      <div
        style={{
          padding: "15px 20px",
          backgroundColor: "#111",
          borderBottom: "1px solid #333",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <div>
            <span 
            onClick={handleBackToDashboard} 
            style={{ color: "#646cff", textDecoration: "none", cursor: "pointer" }}
            >
            ← Back to Dashboard
            </span>
            <h2 style={{ marginTop: "10px", marginBottom: "0" }}>Project: {projectDetails?.name}</h2>
        </div>

        {/* Action Buttons Container */}
        <div style={{ display: "flex", gap: "10px", position: "relative" }}>
          
          {/* SHARE BUTTON */}
          <button
            onClick={() => setIsShareOpen(!isShareOpen)}
            style={{
              backgroundColor: "#2a4a35",
              border: "1px solid #4CAF50",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              borderRadius: "4px",
              fontWeight: "bold",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#386648")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#2a4a35")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                <polyline points="16 6 12 2 8 6"></polyline>
                <line x1="12" y1="2" x2="12" y2="15"></line>
            </svg>
            Share
          </button>

          {/* SHARE DROPDOWN MENU */}
          {isShareOpen && (
              <div style={{
                  position: "absolute",
                  top: "45px",
                  right: "120px",
                  backgroundColor: "#222",
                  border: "1px solid #444",
                  borderRadius: "6px",
                  padding: "15px",
                  width: "250px",
                  zIndex: 1000,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
              }}>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#ddd" }}>Share Project via Drive</h4>
                  <input 
                      type="email" 
                      placeholder="Collaborator's Google Email" 
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleShareClick(); }}
                      style={{
                          width: "100%",
                          padding: "8px",
                          marginBottom: "10px",
                          boxSizing: "border-box",
                          backgroundColor: "#111",
                          color: "#fff",
                          border: "1px solid #555",
                          borderRadius: "4px",
                          outline: "none"
                      }}
                      autoFocus
                  />
                  <button 
                      onClick={handleShareClick}
                      style={{
                          width: "100%",
                          padding: "8px",
                          backgroundColor: "#4CAF50",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontWeight: "bold"
                      }}
                  >
                      Send Invite
                  </button>
                  {shareStatus && (
                    <p style={{ 
                        fontSize: "13px", 
                        color: shareStatus.includes("Failed") || shareStatus.includes("Error") ? "#ff4444" : "#4CAF50", 
                        marginTop: "10px", 
                        marginBottom: "0",
                        textAlign: "center"
                    }}>
                        {shareStatus}
                    </p>
                  )}
              </div>
          )}

          <button
            onClick={handleExportREFI}
            style={{
              backgroundColor: "transparent",
              border: "1px solid #4CAF50",
              color: "#4CAF50",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px",
              borderRadius: "4px",
              fontWeight: "bold",
            }}
            title="Export as REFI-QDA XML"
          >
            Export REFI
          </button>
          
          <button
            onClick={() => setIsSettingsOpen(true)}
            style={{
              backgroundColor: "transparent",
              border: "1px solid #555",
              color: "#ccc",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px",
              borderRadius: "4px",
            }}
          >
            Settings
          </button>
        </div>
      </div>
    </>
  );
};

export default ProjectPageTopBar;