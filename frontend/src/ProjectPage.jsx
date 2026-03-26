import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

function ProjectPage() {
  const { id } = useParams(); 
  const [documents, setDocuments] = useState([]);
  const [uploadStatus, setUploadStatus] = useState("");
  const [projectName, setProjectName] = useState("");

  const fetchProjectName = () => {
    fetch(`http://127.0.0.1:8000/projects/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.name) {
          setProjectName(data.name);
        }
      })
      .catch(err => console.error(err));
  };

  const fetchDocuments = () => {
    fetch(`http://127.0.0.1:8000/projects/${id}/documents/`)
      .then(res => res.json())
      .then(data => setDocuments(data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchDocuments();
    fetchProjectName();
  }, [id]);

  const handleFileUpload = (event) => {
    const files = event.target.files;
    if (files.length === 0) return;

    setUploadStatus("Uploading...");
    
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    fetch(`http://127.0.0.1:8000/projects/${id}/documents/`, {
      method: 'POST',
      body: formData,
    })
      .then(res => res.json())
      .then(data => {
        if (data.failed && data.failed.length > 0) {
          
          const errorList = data.failed.map(f => `${f.filename} (${f.reason})`).join(", ");
          
          if (data.successful.length > 0) {
            setUploadStatus(`Uploaded ${data.successful.length} files. Failed: ${errorList}`);
          } else {
            setUploadStatus(`All uploads failed: ${errorList}`);
          }
        }
        else {
          setUploadStatus("Upload complete!");
          setTimeout(() => setUploadStatus(""), 3000); // Clear message after 3s
        } 
        fetchDocuments(); 
      })
      .catch(err => {
        setUploadStatus("Upload failed.");
        console.error(err);
      });
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', textAlign: 'left' }}>
      <Link to="/" style={{ color: '#646cff', textDecoration: 'none' }}>← Back to Dashboard</Link>
      
      <h2 style={{ marginTop: '20px' }}>Workspace: {projectName}</h2>

      <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', marginTop: '20px' }}>
        <h3>Documents</h3>
        
        {/* THE IMPORT BUTTON */}
        <div style={{ marginBottom: '20px' }}>
          <input
            type="file"
            multiple // Fulfills the "select multiple files" user story!
            id="file-upload"
            accept=".txt,.md,.rtf"
            style={{ display: 'none' }} // Hides the ugly default HTML input
            onChange={handleFileUpload}
          />
          <label 
            htmlFor="file-upload" 
            style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', borderRadius: '4px', cursor: 'pointer', display: 'inline-block' }}
          >
            ➕ Import Documents
          </label>
          <span style={{ marginLeft: '15px', color: '#646cff' }}>{uploadStatus}</span>
        </div>

        {/* LIST OF IMPORTED FILES */}
        {documents.length === 0 ? (
          <p style={{ color: '#888' }}>No documents imported yet.</p>
        ) : (
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {documents.map(doc => (
              <li key={doc.id} style={{ padding: '10px', backgroundColor: '#f4f3ec', color: '#333', marginBottom: '5px', borderRadius: '4px' }}>
                📄 {doc.filename}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default ProjectPage;