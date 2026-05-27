import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CreateProjectModal from "./CreateProjectModal";
import ImportProjectModal from "./ImportProjectModal";
import ConfirmDeleteModal from "../Modal/ConfirmDeleteModal";
import { checkLockStatus, acquireLock, getProjectFolderIfExists, initializeDriveFolder, getSharedProjects, downloadCloudProjectData, releaseLock, deleteDriveFolder, downloadProjectDataFromDrive } from '../Utils/driveAPI';

const API_BASE = "http://127.0.0.1:8000";

function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState({ isOpen: false, project: null });
  const [openingProjectName, setOpeningProjectName] = useState(null);
  const [isConnected, setIsConnected] = useState(!!localStorage.getItem('google_drive_tokens'));
  const [authStatus, setAuthStatus] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, [isConnected]);

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/projects`, { cache: "no-store" });
      let localProjects = [];
      if (res.ok) {
        localProjects = await res.json();
      }

      let cloudProjects = [];
      const token = localStorage.getItem('google_drive_tokens');
      if (token) {
        try {
          cloudProjects = await getSharedProjects();
        } catch (err) {
          console.error("Failed to fetch cloud projects from Drive:", err);
        }
      }

      const cloudMap = {};
      for (const cp of cloudProjects) cloudMap[cp.name] = cp;

      const mergedLocalProjects = localProjects.map(p => {
          if (cloudMap[p.name]) {
              return {
                  ...p,
                  cloudFolderId: cloudMap[p.name].id,
                  isShared: cloudMap[p.name].isShared,
                  isOwner: cloudMap[p.name].isOwner
              };
          }
          return p;
      });

      const localNames = new Set(localProjects.map(p => p.name));
      const purelyCloudProjects = cloudProjects.filter(sp => !localNames.has(sp.name));

      const combined = [...mergedLocalProjects, ...purelyCloudProjects];

      const sortedData = combined.sort((a, b) => {
        // Safe sorting that protects against NaN errors
        let dateA = a.last_accessed ? new Date(a.last_accessed).getTime() : 0;
        let dateB = b.last_accessed ? new Date(b.last_accessed).getTime() : 0;
        if (isNaN(dateA)) dateA = 0;
        if (isNaN(dateB)) dateB = 0;
        return dateB - dateA; 
      });
      
      setProjects(sortedData);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    }
  };

  const handleCreateProject = async (projectData) => {
    const res = await fetch(`${API_BASE}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projectData),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Failed to create project");
    }

    const newProject = await res.json();
    setIsCreateModalOpen(false);
    localStorage.removeItem('current_project_folder_id');
    localStorage.removeItem('current_project_lock_id');
    navigate(`/project/${newProject.id}`);
  };

  const triggerDelete = (e, projectObj) => {
    e.stopPropagation(); 
    setDeleteTarget({ isOpen: true, project: projectObj });
  };

  const executeDelete = async () => {
    if (!deleteTarget.project) return;
    try {
      const token = localStorage.getItem('google_drive_tokens');
      
      if (token && deleteTarget.project.isOwner && deleteTarget.project.cloudFolderId) {
          const deleteCloud = window.confirm("☁️ Do you also want to delete this project from Google Drive for all collaborators?");
          if (deleteCloud) await deleteDriveFolder(deleteTarget.project.cloudFolderId);
      }

      const res = await fetch(`${API_BASE}/projects/${deleteTarget.project.id}`, { method: "DELETE" });
      if (res.ok) fetchProjects();
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
    setDeleteTarget({ isOpen: false, project: null });
  };

  const handleOpenProject = async (project) => {
    const storedNickname = localStorage.getItem(`nickname_${project.name}`) || "Anonymous";
    const token = localStorage.getItem('google_drive_tokens');
    const masterFolderId = localStorage.getItem('google_drive_folder_id');

    setOpeningProjectName(project.name);

    try {
        let projectDriveId = null;

        if (token) {
            projectDriveId = project.cloudFolderId || await getProjectFolderIfExists(project.name, masterFolderId);
            
            if (projectDriveId) {
                const lockStatus = await checkLockStatus(projectDriveId);
                if (lockStatus.isLocked) {
                    const force = window.confirm(`🔒 "${project.name}" is currently locked by: ${lockStatus.lockedBy}.\n\nWARNING: Forcing entry will override their session and may cause data loss if they are actively saving. \n\nDo you want to Force Enter?`);
                    if (!force) {
                        setOpeningProjectName(null);
                        return;
                    }
                    setAuthStatus("Breaking lock...");
                    await releaseLock(lockStatus.lockFileId);
                }

                setAuthStatus("Acquiring cloud lock...");
                const lockFileId = await acquireLock(projectDriveId, storedNickname);
                localStorage.setItem(`current_project_lock_id`, lockFileId);
                localStorage.setItem(`current_project_folder_id`, projectDriveId);

                setAuthStatus("Checking for cloud updates...");
                const projectData = await downloadProjectDataFromDrive(projectDriveId);

                if (projectData) {
                    setAuthStatus("Syncing local database...");
                    
                    if (typeof project.id === 'number') {
                        await fetch(`${API_BASE}/projects/${project.id}`, { method: "DELETE" });
                    }

                    const projRes = await fetch(`${API_BASE}/projects`, {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: projectData.details.name, description: projectData.details.description || "" })
                    });
                    const newProj = await projRes.json();
                    const newId = newProj.id;

                    const docMap = {};
                    for (const doc of projectData.documents) {
                        let cleanName = doc.filename.replace(/\.(pdf|docx|txt)$/i, "");
                        
                        const docRes = await fetch(`${API_BASE}/projects/${newId}/documents/create`, {
                            method: "POST", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ name: cleanName, content: doc.content || "" })
                        });
                        const newDoc = await docRes.json();
                        docMap[doc.id] = newDoc.id; 
                    }

                    const codeMap = {};
                    const sortedCodes = [...projectData.codes].sort((a, b) => (a.parent_id === null ? -1 : 1));
                    for (const code of sortedCodes) {
                        const codeRes = await fetch(`${API_BASE}/projects/${newId}/codes`, {
                            method: "POST", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ name: code.name, color: code.color, description: code.description || "", parent_id: code.parent_id ? codeMap[code.parent_id] : null })
                        });
                        const newCode = await codeRes.json();
                        codeMap[code.id] = newCode.id;
                    }

                    for (const seg of projectData.segments) {
                        await fetch(`${API_BASE}/projects/${newId}/segments`, {
                            method: "POST", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ document_id: docMap[seg.document_id], code_id: codeMap[seg.code_id], start_char: seg.start_char, end_char: seg.end_char, content: seg.content })
                        });
                    }

                    setOpeningProjectName(null);
                    setAuthStatus("");
                    navigate(`/project/${newId}`); 
                    return;
                }
            }
        }

        if (typeof project.id === 'number') {
            navigate(`/project/${project.id}`);
        } else {
            alert("Could not find this shared project in the cloud.");
        }

    } catch (err) {
        console.error("Open project error:", err);
        alert("Network error. Opening in local offline mode.");
        if (typeof project.id === 'number') navigate(`/project/${project.id}`);
    }
    
    setOpeningProjectName(null);
    setAuthStatus("");
  };

  const handleGoogleConnect = async () => {
    try {
      setAuthStatus("Opening Google Login...");
      const tokens = await window.electronAPI.loginToGoogle();

      if (tokens.access_token && tokens) {
        console.log("SUCCESS! Full tokens received:", tokens);
        localStorage.setItem('google_drive_tokens', tokens.access_token);

        if (tokens.refresh_token) {
          localStorage.setItem('google_drive_refresh_token', tokens.refresh_token);
        }
        setIsConnected(true);
        setAuthStatus("Setting up Drive folder...");

        try {
          const folderId = await initializeDriveFolder();
          localStorage.setItem('google_drive_folder_id', folderId);
          setAuthStatus("");
        } catch (folderError) {
          console.error("Folder creation failed:", folderError);
          setAuthStatus("Connected, but couldn't create the Drive folder.");
        }
      } else {
        console.error("Token exchange failed:", tokens);
        setAuthStatus("Failed to get access tokens. Check console.");
      }
    } catch (error) {
      console.error(error);
      setAuthStatus("Google Login failed or was cancelled.");
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('google_drive_tokens');
    localStorage.removeItem('google_drive_refresh_token');
    localStorage.removeItem('google_drive_folder_id');
    setIsConnected(false);
    setAuthStatus("Disconnected from Google Drive.");
  };

  const formatSafeDate = (dateString) => {
    if (!dateString) return "New";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "New"; // If Python corrupted the date, safely default to "New"
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const pageStyle = {
    minHeight: "100vh",
    backgroundColor: "#111",
    color: "#fff",
    fontFamily: "system-ui, sans-serif",
    padding: "30px 40px",
    display: "flex",
    justifyContent: "center",
    boxSizing: "border-box" 
  };

  const containerStyle = {
    width: "100%",
  };

  const horizontalCardStyle = {
    backgroundColor: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "8px",
    padding: "20px 24px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "flex",
    flexDirection: "row", 
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px"
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        
        {/* HEADER SECTION */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #333", paddingBottom: "20px", marginBottom: "30px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "600" }}>jUPiter QDA</h1>
            <p style={{ margin: "5px 0 0 0", color: "#888", fontSize: "15px" }}>Qualitative Data Analysis Workspace</p>
          </div>
          
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            
            {authStatus && <span style={{ color: '#aaa', fontSize: '12px', marginRight: '10px' }}>{authStatus}</span>}
            
            {!isConnected ? (
              <button 
                onClick={handleGoogleConnect}
                style={{ height: "42px", boxSizing: "border-box", display: "flex", alignItems: "center", padding: "0 16px", backgroundColor: "transparent", color: "#ccc", border: "1px solid #444", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", transition: "all 0.2s" }}
                onMouseOver={(e) => { e.target.style.backgroundColor = "#222"; e.target.style.borderColor = "#666"; }}
                onMouseOut={(e) => { e.target.style.backgroundColor = "transparent"; e.target.style.borderColor = "#444"; }}
              >
                ☁️ Connect Google Drive
              </button>
            ) : (
              <button 
                onClick={handleDisconnect}
                style={{ height: "42px", boxSizing: "border-box", display: "flex", alignItems: "center", padding: "0 16px", backgroundColor: "transparent", color: "#ff6b6b", border: "1px solid #444", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", transition: "all 0.2s" }}
                onMouseOver={(e) => { e.target.style.backgroundColor = "rgba(255,107,107,0.1)"; e.target.style.borderColor = "#ff6b6b"; }}
                onMouseOut={(e) => { e.target.style.backgroundColor = "transparent"; e.target.style.borderColor = "#444"; }}
              >
                Disconnect Drive
              </button>
            )}

            <button 
              onClick={() => setIsImportModalOpen(true)}
              style={{ height: "42px", boxSizing: "border-box", display: "flex", alignItems: "center", padding: "0 16px", backgroundColor: "transparent", color: "#ccc", border: "1px solid #444", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", transition: "all 0.2s" }}
              onMouseOver={(e) => e.target.style.backgroundColor = "#222"}
              onMouseOut={(e) => e.target.style.backgroundColor = "transparent"}
            >
              Import Project
            </button>
            
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              style={{ height: "42px", boxSizing: "border-box", display: "flex", alignItems: "center", padding: "0 20px", backgroundColor: "transparent", color: "#ccc", border: "1px solid #444", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", transition: "background 0.2s" }}
              onMouseOver={(e) => e.target.style.backgroundColor = "#222"}
              onMouseOut={(e) => e.target.style.backgroundColor = "transparent"}
            >
              Create Project
            </button>
          </div>
        </div>

        {/* PROJECTS LIST */}
        <div>
          <h2 style={{ fontSize: "20px", marginBottom: "20px", color: "#ccc" }}>Recent Projects</h2>
          
          {projects.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px", backgroundColor: "#1a1a1a", borderRadius: "8px", border: "1px dashed #444", color: "#666" }}>
              <p>No projects found. Create or import one to get started!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {projects.map((project) => (
                <div 
                  key={project.id} 
                  onClick={() => handleOpenProject(project)}
                  style={horizontalCardStyle}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = "#646cff"}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = "#333"}
                >
                  
                  <div style={{ flex: 1, minWidth: 0, paddingRight: "20px",textAlign: "left" }}>
                    <h3 style={{ margin: "0 0 6px 0", fontSize: "18px", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {project.name}
                      {project.isShared && (
                        <span style={{ fontSize: "12px", backgroundColor: "#2a4a35", padding: "2px 6px", borderRadius: "4px", marginLeft: "8px", color: "#4CAF50", verticalAlign: "middle" }}>
                          Shared 🤝
                        </span>
                      )}
                    </h3>
                    <p style={{ margin: 0, fontSize: "14px", color: "#aaa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {openingProjectName === project.name ? "⏳ Checking Cloud Lock..." : (project.description || "No description provided.")}
                    </p>
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "30px", flexShrink: 0 }}>
                    <div style={{ display: "flex", gap: "20px" }}>
                      
                      <span style={{ fontSize: "14px", color: "#888", display: "flex", alignItems: "center", gap: "6px" }}>
                        🕒 {formatSafeDate(project.last_accessed)}
                      </span>

                      <span style={{ fontSize: "14px", color: "#888", display: "flex", alignItems: "center", gap: "6px" }}>
                        📄 {project.document_count || 0} Docs
                      </span>
                      <span style={{ fontSize: "14px", color: "#888", display: "flex", alignItems: "center", gap: "6px" }}>
                        🟣 {project.code_count || 0} Codes
                      </span>
                    </div>

                    <button 
                      onClick={(e) => triggerDelete(e, project)}
                      style={{ 
                        backgroundColor: "transparent", border: "none", color: "#666", 
                        cursor: "pointer", padding: "8px", borderRadius: "4px", 
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.2s ease"
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.color = "#ff6b6b"; e.currentTarget.style.backgroundColor = "rgba(255,107,107,0.1)"; }}
                      onMouseOut={(e) => { e.currentTarget.style.color = "#666"; e.currentTarget.style.backgroundColor = "transparent"; }}
                      title="Delete Project"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <CreateProjectModal 
          isOpen={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)} 
          onCreate={handleCreateProject} 
        />

        <ImportProjectModal 
          isOpen={isImportModalOpen} 
          onClose={() => setIsImportModalOpen(false)} 
          onImportSuccess={(newProjectId) => {
            setIsImportModalOpen(false);
            navigate(`/project/${newProjectId}`);
          }}
        />

        <ConfirmDeleteModal 
          isOpen={deleteTarget.isOpen}
          onClose={() => setDeleteTarget({ isOpen: false, project: null })}
          onConfirm={executeDelete}
          title={deleteTarget.project ? `Delete "${deleteTarget.project.name}"?` : "Delete Project?"}
          warningText="Are you sure you want to delete this project? All associated documents, transcripts, and highlighted codes will be permanently destroyed."
        />

      </div>
    </div>
  );
}

export default Dashboard;