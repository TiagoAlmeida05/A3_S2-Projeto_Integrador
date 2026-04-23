import React, { useEffect, useState } from "react";
import axios from "axios";

export default function MemosTab({ projectId, codes = [] }) {
  const [memos, setMemos] = useState([]);
  const [editingMemo, setEditingMemo] = useState(null);
  const [newMemoText, setNewMemoText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    axios
      .get(`http://127.0.0.1:8000/projects/${projectId}/memos`)
      .then((res) => setMemos(res.data))
      .catch((e) => setError("Failed to load memos"))
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleEdit = (memo) => {
    setEditingMemo(memo);
    setNewMemoText(memo.text);
  };

  const handleSave = async () => {
    if (!editingMemo) return;
    setLoading(true);
    try {
      const res = await axios.put(`http://127.0.0.1:8000/memos/${editingMemo.id}`, { text: newMemoText });
      
      setMemos((prev) => prev.map((m) => (
        m.id === res.data.id ? { ...res.data, target_name: m.target_name } : m
      )));
      
      setEditingMemo(null);
      setNewMemoText("");
    } catch {
      setError("Failed to update memo");
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    setLoading(true);
    try {
      await axios.delete(`http://127.0.0.1:8000/memos/${id}`);
      setMemos((prev) => prev.filter((m) => m.id !== id));
    } catch {
      setError("Failed to delete memo");
    }
    setLoading(false);
  };

  // Helper function to render an individual memo card
  const renderMemoItem = (memo) => {
    let cardStyle = { marginBottom: 16, border: "1px solid #ccc", borderRadius: 8, padding: 12 };
    let headerContent = null;

    if (memo.target_type === "code") {
      const codeObj = codes.find((c) => Number(c.id) === Number(memo.target_id));
      const codeColor = codeObj ? codeObj.color : "#ccc";
      
      // Code Layout: Full border colored
      cardStyle = { ...cardStyle, border: `2px solid ${codeColor}` };
      headerContent = (
        <div style={{ fontSize: 13, color: "#888", fontWeight: "bold", marginBottom: 8, display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: codeColor }}></div>
          Code: {memo.target_name || "Unnamed Code"}
        </div>
      );

    } else if (memo.target_type === "segment") {
      // Segment Layout: Thicker left border
      cardStyle = { ...cardStyle, borderLeft: "1px solid #ccc" };
      headerContent = (
        <div style={{ fontSize: 13, color: "#aaa", fontStyle: "italic", marginBottom: 8 }}>
          {memo.target_name || "Unnamed Segment"}
        </div>
      );
    } else {
      cardStyle = { ...cardStyle, border: "1px dashed #ccc" };
    }

    return (
      <li key={memo.id} style={cardStyle}>
        {editingMemo && editingMemo.id === memo.id ? (
          <>
            <textarea
              value={newMemoText}
              onChange={(e) => setNewMemoText(e.target.value)}
              rows={3}
              style={{ width: "100%", boxSizing: "border-box" }}
            />
            <div style={{ marginTop: 8 }}>
              <button onClick={handleSave} style={{ marginRight: 8 }}>Save</button>
              <button onClick={() => setEditingMemo(null)}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            {headerContent}
            <div style={{ whiteSpace: "pre-wrap", overflowWrap: "break-word", wordBreak: "break-word", marginBottom: 8 }}>
              {memo.text}
            </div>
            <button onClick={() => handleEdit(memo)} style={{ marginRight: 8 }}>Edit</button>
            <button onClick={() => handleDelete(memo.id)}>Delete</button>
          </>
        )}
      </li>
    );
  };

  if (!projectId) return <div>Select a project to view memos.</div>;
  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

  // Split the memos into just two groups now
  const codeMemos = memos.filter((m) => m.target_type === "code");
  const segmentMemos = memos.filter((m) => m.target_type === "segment");

  return (
    <div style={{ padding: 24 }}>
      <h2>Project Memos</h2>
      {memos.length === 0 && <div>No memos yet.</div>}

      {/* --- CODE MEMOS SECTION --- */}
      {codeMemos.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ borderBottom: "1px solid #444", paddingBottom: 8, color: "#ddd" }}>
            Code Memos
          </h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {codeMemos.map(renderMemoItem)}
          </ul>
        </div>
      )}

      {/* --- SEGMENT MEMOS SECTION --- */}
      {segmentMemos.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ borderBottom: "1px solid #444", paddingBottom: 8, color: "#ddd" }}>
            Segment Memos
          </h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {segmentMemos.map(renderMemoItem)}
          </ul>
        </div>
      )}

    </div>
  );
}