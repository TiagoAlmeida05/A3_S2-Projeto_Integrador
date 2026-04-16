import { useState, useEffect } from 'react'
import { Link, useNavigate} from 'react-router-dom';
import CreateProjectModal from './CreateProjectModal';
import ImportProjectModal from './ImportProjectModal';
import '/src/App.css'

function DashboardPage() {
  const [projectStatus, setProjectStatus] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [projects, setProjects] = useState([])
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const navigate = useNavigate()

  const fetchProjects = () => {
    fetch('http://127.0.0.1:8000/projects')
      .then(response => response.json())
      .then(data => setProjects(data))
      .catch(error => console.error("Failed to fetch projects:", error))
  }

  useEffect(() => {
      fetchProjects()
    }, [])

  const handleCreateProject = async (projectData) => {
    setProjectStatus("Creating project...")
    
    try {
      const response = await fetch('http://127.0.0.1:8000/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      })
      
      if (!response.ok) {
        const errData = await response.json();
        setProjectStatus(""); 
        throw new Error(errData.detail || "Failed to create project");
      }
    
      const data = await response.json();
      navigate(`/project/${data.id}`);
    }
    catch(error) {
        setProjectStatus("Failed to create project.")
        throw error
      }
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>jUPiter-QDA Dashboard</h1>
      <p>Your free, open-source qualitative data analysis tool.</p>

      {/* Clean Header Area with the Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>My Projects</h2>
        <div style={{ display: 'flex', gap: '15px' }}>
            <button 
              onClick={() => setIsImportModalOpen(true)}
              style={{ padding: '10px 20px', fontSize: '15px', cursor: 'pointer', backgroundColor: 'transparent', color: '#646cff', border: '1px solid #646cff', borderRadius: '6px', fontWeight: 'bold' }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(100, 108, 255, 0.1)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Import Project
            </button>
            
            <button 
              onClick={() => setShowForm(true)} 
              style={{ padding: '10px 20px', fontSize: '15px', cursor: 'pointer', backgroundColor: '#646cff', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}
            >
              Create New Project
            </button>
          </div>
      </div>

      {/* The Pop-Up Modal Overlay */}
      <CreateProjectModal 
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onCreate={handleCreateProject}
      />

      
      <ImportProjectModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onImportSuccess={(newProjectId) => {
          setIsImportModalOpen(false);
          // Redirect them to the newly imported project page!
          window.location.href = `/project/${newProjectId}`; 
        }}
      />

      {/* Project List */}
      <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '8px' }}>
        {projects.length === 0 ? (
          <p style={{ color: '#888' }}>No projects yet. Create one above!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {projects.map((proj) => (
              <div key={proj.id} style={{ padding: '15px', backgroundColor: '#2a2a2a', borderRadius: '6px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: '0 0 5px 0', color: '#646cff' }}>{proj.name}</h3>
                  <p style={{ margin: '0', fontSize: '14px', color: '#ccc' }}>{proj.description}</p>
                </div>
                <Link to={`/project/${proj.id}`}>
                  <button style={{ padding: '8px 16px', backgroundColor: '#aa3bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Open Project ➔
                  </button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;