import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CreateProjectModal from "./CreateProjectModal";
import ImportProjectModal from "./ImportProjectModal";
import ConfirmDeleteModal from "../Modal/ConfirmDeleteModal";

const API_BASE = "http://127.0.0.1:8000";

function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState({ isOpen: false, project: null });
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/projects`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
 
        const sortedData = data.sort((a, b) => {
          if (a.last_accessed && b.last_accessed) {
            return new Date(b.last_accessed) - new Date(a.last_accessed);
          }
          return b.id - a.id; // Fallback if no date exists
        });
        
        setProjects(sortedData);
      }
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
    navigate(`/project/${newProject.id}`);
  };

  const triggerDelete = (e, projectObj) => {
    e.stopPropagation(); 
    setDeleteTarget({ isOpen: true, project: projectObj });
  };

  const executeDelete = async () => {
    if (!deleteTarget.project) return;
    try {
      const res = await fetch(`${API_BASE}/projects/${deleteTarget.project.id}`, { method: "DELETE" });
      if (res.ok) fetchProjects();
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
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
          
          <div style={{ display: "flex", gap: "10px" }}>
            <button 
              onClick={() => setIsImportModalOpen(true)}
              style={{ padding: "10px 16px", backgroundColor: "transparent", color: "#ccc", border: "1px solid #444", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", transition: "all 0.2s" }}
              onMouseOver={(e) => e.target.style.backgroundColor = "#222"}
              onMouseOut={(e) => e.target.style.backgroundColor = "transparent"}
            >
              Import Project
            </button>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              style={{ padding: "10px 20px", backgroundColor: "transparent", color: "#ccc", border: "1px solid #444", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", transition: "background 0.2s" }}
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
                  onClick={() => navigate(`/project/${project.id}`)}
                  style={horizontalCardStyle}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = "#646cff"}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = "#333"}
                >
                  
                  <div style={{ flex: 1, minWidth: 0, paddingRight: "20px",textAlign: "left" }}>
                    <h3 style={{ margin: "0 0 6px 0", fontSize: "18px", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {project.name}
                    </h3>
                    <p style={{ margin: 0, fontSize: "14px", color: "#aaa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {project.description || "No description provided."}
                    </p>
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "30px", flexShrink: 0 }}>
                    <div style={{ display: "flex", gap: "20px" }}>
                      
                      <span style={{ fontSize: "14px", color: "#888", display: "flex", alignItems: "center", gap: "6px" }}>
                        🕒 {project.last_accessed ? new Date(project.last_accessed).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "New"}
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