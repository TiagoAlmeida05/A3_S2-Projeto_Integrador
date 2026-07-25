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
};

export async function fetchProjectDetails (projectId) {
  return await fetch(`${API_BASE}/projects/${projectId}`)
    .then((res) => res.json());
};

export async function fetchDocuments (projectId) {
  return await fetch(`${API_BASE}/projects/${projectId}/documents/`)
    .then((res) => res.json());
};

export async function fetchDocument(projectId, docId) {
  return await fetch(`${API_BASE}/projects/${projectId}/documents/${docId}`)
      .then((res) => res.json())
}

export async function renameDocument(projectId, docId, filename) {
  return await fetch(`${API_BASE}/projects/${projectId}/documents/${docId}/rename`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      },
    )
}

export async function deleteDocument(projectId, documentId) {
  return await fetch(
        `${API_BASE}/projects/${projectId}/documents/${documentId}`,
        { method: "DELETE" },
      );
}

export async function search(projectId, searchQuery) {
  return await fetch(`${API_BASE}/projects/${projectId}/search?query=${searchQuery}`);
}

export async function fetchCodes (projectId) {
  return await fetch(`${API_BASE}/projects/${projectId}/codes`)
    .then((res) => res.json());
};

export async function createCode(projectId, codeData) {
  return await fetch(`${API_BASE}/projects/${projectId}/codes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(codeData)
  });
}

export async function deleteCode(projectId, codeId) {
  return await fetch(`${API_BASE}/projects/${projectId}/codes/${codeId}`, { method: "DELETE" });
}

export async function fetchSegmentsForDocument(projectId, documentId) {
  return await fetch(`${API_BASE}/projects/${projectId}/segments?document_id=${documentId}`)
              .then((res) => res.json());
}

export async function createSegmentWithCode(projectId, segmentWithCodeData) {
  return await fetch(`${API_BASE}/projects/${projectId}/segments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(segmentWithCodeData),
  });
}

export async function updateSegment(projectId, segmentId, segmentData) {
  return await fetch(`${API_BASE}/projects/${projectId}/segments/${seg.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(segmentData)
          });
}

export async function deleteSegment(projectId, segmentId) {
  return await fetch(`${API_BASE}/projects/${projectId}/segments/${segmentId}`, { method: "DELETE" })
}

export async function fetchMemos(projectId) {
  const memosRes = await fetch(`${API_BASE}/projects/${projectId}/memos`);
  return await memosRes.ok ? await memosRes.json() : [];
}

export async function createMemoForSegment(segmentId, memoText) {
  return await fetch(`${API_BASE}/memos`, {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: memoText, target_type: "segment", target_id: segmentId }),
      });
}