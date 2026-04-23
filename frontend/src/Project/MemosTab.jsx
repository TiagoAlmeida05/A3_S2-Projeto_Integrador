import React, { useEffect, useState } from "react";
import axios from "axios";

export default function MemosTab({ projectId }) {
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
      setMemos((prev) => prev.map((m) => (m.id === res.data.id ? res.data : m)));
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

  if (!projectId) return <div>Select a project to view memos.</div>;
  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

  return (
    <div style={{ padding: 24 }}>
      <h2>Project Memos</h2>
      {memos.length === 0 && <div>No memos yet.</div>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {memos.map((memo) => (
          <li key={memo.id} style={{ marginBottom: 16, border: "1px solid #ccc", borderRadius: 8, padding: 12 }}>
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
                {/* Text wrapping is handled by pre-wrap and overflow-wrap */}
                <div style={{ 
                  whiteSpace: "pre-wrap", 
                  overflowWrap: "break-word", 
                  wordBreak: "break-word",
                  marginBottom: 8 
                }}>
                  {memo.text}
                </div>
                
                <div style={{ fontSize: 13, color: "#555", fontWeight: "bold", marginBottom: 8 }}>
                  {/* Replaced Code # ID with the target name */}
                  {memo.target_type}: {memo.target_name || "Unnamed Item"}
                </div>
                
                <button onClick={() => handleEdit(memo)} style={{ marginRight: 8 }}>Edit</button>
                <button onClick={() => handleDelete(memo.id)}>Delete</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}