const API_BASE = "http://127.0.0.1:8000";

export async function fetchProjects() {
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
        
        return sortedData;
      }
    } catch (err) {
      throw new Error("Failed to fetch projects:", err);
    }
};

export async function createProject(projectData) {
    return await fetch(`${API_BASE}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projectData),
    });
};

export async function deleteProject(projectId) {
    return await fetch(`${API_BASE}/projects/${projectId}`, { method: "DELETE" });
}