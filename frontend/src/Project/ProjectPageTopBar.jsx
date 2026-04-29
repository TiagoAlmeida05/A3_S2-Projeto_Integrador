import { Link } from "react-router-dom";

const ProjectPageTopBar = ({ projectDetails, handleExportREFI, setIsSettingsOpen }) => {

  return (
    <>
      <div
        style={{
          padding: "15px 20px",
          backgroundColor: "#111",
          borderBottom: "1px solid #333",
        }}
      >
        <Link to="/" style={{ color: "#646cff", textDecoration: "none" }}>
          ← Back to Dashboard
        </Link>
        <h2 style={{ marginTop: "20px" }}>Project: {projectDetails.name}</h2>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={handleExportREFI}
          style={{
            backgroundColor: "transparent",
            border: "none",
            color: "#4CAF50",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px",
            borderRadius: "4px",
            fontWeight: "bold",
          }}
          onMouseOver={(e) =>
            (e.currentTarget.style.backgroundColor = "#1a2e1f")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")
          }
          title="Export as REFI-QDA XML"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Export REFI XML
        </button>
        <button
          onClick={() => setIsSettingsOpen(true)}
          style={{
            backgroundColor: "transparent",
            border: "none",
            color: "#ccc",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px",
            borderRadius: "4px",
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#222")}
          onMouseOut={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")
          }
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          Settings
        </button>
      </div>
    </>
  );
};

export default ProjectPageTopBar;