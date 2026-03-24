import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [backendMessage, setBackendMessage] = useState("Connecting to backend...")
  const [projectStatus, setProjectStatus] = useState("")

  const [showForm, setShowForm] = useState(false)
  const [projectDesc, setProjectDesc] = useState("")
  const [projectName, setProjectName] = useState("")

  const [projects, setProjects] = useState([])

  const fetchProjects = () => {
    fetch('http://127.0.0.1:8000/projects')
      .then(response => response.json())
      .then(data => setProjects(data))
      .catch(error => console.error("Failed to fetch projects:", error))
  }

  useEffect(() => {
    fetch('http://127.0.0.1:8000/')
      .then(response => response.json())
      .then(data => setBackendMessage(data.message))
      .catch(error => setBackendMessage("Failed to connectr to backend."))

      fetchProjects()
    }, [])

    const handleCreateProject = (e) => {
      e.preventDefault()
      setProjectStatus("Creating project...")
      fetch('http://127.0.0.1:8000/projects/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: projectName, 
          description: projectDesc
        }),
      })
        .then(response => response.json())
        .then(data => {
          setProjectStatus(data.message)
          setShowForm(false)
          setProjectName("")
          setProjectDesc("")

          fetchProjects()
        })
        .catch(error => {
          setProjectStatus("Failed to create project.")
        })
    }

  return (
    <div className="my-app-container" style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>jUPiter-QDA Dashboard</h1>
      <p>Your free, open-source qualitative data analysis tool.</p>

      <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>Project Management</h2>
        
        {showForm ? (
          <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px' }}>
            <input 
              type="text" 
              placeholder="Project Name" 
              required
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <textarea 
              placeholder="Project Description"
              rows="3"
              value={projectDesc}
              onChange={(e) => setProjectDesc(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Save Project
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '8px 16px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button 
            onClick={() => setShowForm(true)}
            style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#646cff', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Create New Project
          </button>
        )}

        <p style={{ marginTop: '15px', fontWeight: 'bold', color: '#646cff' }}>
          {projectStatus}
        </p>
      </div>

        <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>My Projects</h2>
        
        {projects.length === 0 ? (
          <p style={{ color: '#888' }}>No projects yet. Create one above!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {projects.map((proj) => (
              <div key={proj.id} style={{ padding: '15px', backgroundColor: '#2a2a2a', borderRadius: '6px', color: 'white', textAlign: 'left' }}>
                <h3 style={{ margin: '0 0 5px 0', color: '#646cff' }}>{proj.name}</h3>
                <p style={{ margin: '0', fontSize: '14px', color: '#ccc' }}>{proj.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
