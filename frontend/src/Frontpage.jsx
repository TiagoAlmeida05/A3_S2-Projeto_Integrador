import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, useNavigate} from 'react-router-dom';
import ProjectPage from './ProjectPage';
import './App.css'

function Dashboard() {
  const [projectStatus, setProjectStatus] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [projectDesc, setProjectDesc] = useState("")
  const [projectName, setProjectName] = useState("")
  const [projects, setProjects] = useState([])

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

  const handleCreateProject = (e) => {
    e.preventDefault()
    setProjectStatus("Creating project...")
    fetch('http://127.0.0.1:8000/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: projectName, 
        description: projectDesc
      }),
    })
      .then(response => response.json())
      .then(data => {
        navigate(`/project/${data.id}`)
      })
      .catch(error => {
        setProjectStatus("Failed to create project.")
      })
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>jUPiter-QDA Dashboard</h1>
      <p>Your free, open-source qualitative data analysis tool.</p>

      {/* NEW: Clean Header Area with the Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>My Projects</h2>
        <button 
          onClick={() => setShowForm(true)} 
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#646cff', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          + Create New Project
        </button>
      </div>

      {/* The Pop-Up Modal Overlay */}
      {showForm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', 
          justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          {/* The Pop-Up Box */}
          <div style={{
            backgroundColor: '#1a1a1a', padding: '30px', borderRadius: '8px', 
            width: '400px', border: '1px solid #444'
          }}>
            <h2 style={{ marginTop: 0 }}>Create New Project</h2>
            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input type="text" placeholder="Project Name" required value={projectName} onChange={(e) => setProjectName(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}/>
              <textarea placeholder="Project Description (optional)" rows="4" value={projectDesc} onChange={(e) => setProjectDesc(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}/>
              <p style={{ color: '#ff6b6b', margin: 0 }}>{projectStatus}</p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" style={{ flex: 1, padding: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Create & Open</button>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '10px', backgroundColor: 'transparent', color: '#ccc', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                    Open Workspace ➔
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/project/:id" element={<ProjectPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App