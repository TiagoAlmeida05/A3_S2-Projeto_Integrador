import { useState, useEffect } from 'react'

function App() {
  const [backendMessage, setBackendMessage] = useState("Connecting to backend...")

  useEffect(() => {
    fetch('http://127.0.0.1:8000/')
      .then(response => response.json())
      .then(data => setBackendMessage(data.message))
      .catch(error => setBackendMessage("Error connecting to backend. is Uvicorn running?"))
    }, [])
  return (
    <div className="my-app-container" style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>jUPiter-QDA Dashboard</h1>
      <p>Welcome to your completely custom user interface.</p>
      
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#2a2a2a', borderRadius: '8px', color: 'white' }}>
        <h3>Server Connection Status:</h3>
        <p>{backendMessage}</p>

      <button onClick={() => {
        fetch('http://127.0.0.1:8000/')
          .then(response => response.json())
          .then(data => setBackendMessage(data.message))
          .catch(error => setBackendMessage("Error connecting to backend. is Uvicorn running?"))
      }}>
        Refresh Connection
      </button>
      </div>
    </div>
  )
}

export default App
