import { useState } from "react";

const ProjectPageCodePanel = ({
  API_BASE,
  projectId,
  projectCodes,
  codePanelOpen,
  activeCode,
  codeSegments,
  setCodePanelOpen,
  setActiveCode,
  setCodeSegments,
  setActiveDocument,
  setDocumentSegments,
  setPendingQuoteJump,
  fetchCodes,
}) => {
  const [selectedQuoteId, setSelectedQuoteId] = useState(null);
  const [includeSubCodes, setIncludeSubCodes] = useState(false);
  const safeCodeSegments = Array.isArray(codeSegments) ? codeSegments : [];

  const handleQuoteClick = async (quote) => {
    setSelectedQuoteId(quote.id);

    try {
      const docRes = await fetch(
        `${API_BASE}/projects/${projectId}/documents/${quote.document_id}`,
      );
      const docData = await docRes.json();
      setActiveDocument(docData);

      const segRes = await fetch(
        `${API_BASE}/projects/${projectId}/segments?document_id=${quote.document_id}`,
      );
      const segData = await segRes.json();
      setDocumentSegments(Array.isArray(segData) ? segData : []);

      setPendingQuoteJump({
        quoteId: quote.id,
        document_id: quote.document_id,
      });
    } catch (error) {
      console.error("Failed to load quote document:", error);
    }
  };

  const handleDeleteSegment = async (e, segmentId) => {
    e.stopPropagation();
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this highlighted quote?",
    );
    if (!confirmDelete) return;

    try {
      const response = await fetch(`${API_BASE}/projects/${projectId}/segments/${segmentId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchCodes();
        setCodeSegments((prev) => prev.filter((segment) => segment.id !== segmentId));
        setDocumentSegments((prev) => prev.filter((segment) => segment.id !== segmentId));
        if (selectedQuoteId === segmentId) setSelectedQuoteId(null);
      } else {
        console.error("Failed to delete segment");
      }
    } catch (error) {
      console.error("Error deleting segment:", error);
    }
  };

  if (!codePanelOpen) return null;

  return (
    <div
      style={{
        width: "360px",
        display: "flex",
        flexDirection: "column",
        border: "1px solid #ccc",
        borderRadius: "8px",
        padding: "20px",
        backgroundColor: "#111",
        color: "#fff",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "16px",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: "18px" }}>Compiled Quotes</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "6px" }}>
            <div style={{ color: "#aaa", fontSize: "13px" }}>{activeCode?.name || "Selected code"}</div>
            {activeCode && projectCodes.some((c) => c.parent_id === activeCode.id) && (
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#b0b0c3", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={includeSubCodes}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setIncludeSubCodes(isChecked);
                    fetch(`${API_BASE}/codes/${activeCode.id}/segments?include_children=${isChecked}`)
                      .then((res) => res.json())
                      .then((data) => setCodeSegments(data))
                      .catch((err) => console.error(err));
                  }}
                  style={{ cursor: "pointer", accentColor: "#646cff" }}
                />
                Include Sub-Codes
              </label>
            )}
          </div>
        </div>

        <button
          onClick={() => {
            setCodePanelOpen(false);
            setActiveCode(null);
            setCodeSegments([]);
            setSelectedQuoteId(null);
            setIncludeSubCodes(false);
          }}
          style={{
            backgroundColor: "transparent",
            border: "1px solid #444",
            color: "#ccc",
            borderRadius: "6px",
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {safeCodeSegments.length === 0 ? (
          <p style={{ color: "#888", margin: 0 }}>No quotes found for this code yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {(() => {
              const groupedQuotes = [];
              safeCodeSegments.forEach((quote) => {
                const existing = groupedQuotes.find(
                  (group) =>
                    group.document_id === quote.document_id &&
                    group.start_char === quote.start_char &&
                    group.end_char === quote.end_char,
                );

                const badgeData = { segment_id: quote.id, name: quote.code_name, color: quote.code_color };

                if (existing) {
                  existing.badges.push(badgeData);
                } else {
                  groupedQuotes.push({ ...quote, badges: [badgeData] });
                }
              });

              groupedQuotes.forEach((quote) => {
                quote.badges.sort((a, b) => {
                  const idxA = projectCodes.findIndex((code) => code.name === a.name);
                  const idxB = projectCodes.findIndex((code) => code.name === b.name);
                  return (idxA !== -1 ? idxA : 9999) - (idxB !== -1 ? idxB : 9999);
                });
              });

              return groupedQuotes.map((quote, idx) => {
                const before = quote.context.slice(0, quote.highlight_start);
                const highlight = quote.context.slice(quote.highlight_start, quote.highlight_end);
                const after = quote.context.slice(quote.highlight_end);

                const isSelected = quote.badges.some((badge) => badge.segment_id === selectedQuoteId);
                const primarySegmentId = quote.badges[0]?.segment_id ?? quote.id;

                return (
                  <button
                    key={`grouped-${primarySegmentId}-${idx}`}
                    onClick={() => handleQuoteClick({ id: primarySegmentId, document_id: quote.document_id })}
                    style={{
                      textAlign: "left",
                      backgroundColor: isSelected ? "#1f1f2a" : "#17171d",
                      border: "1px solid #333",
                      borderRadius: "8px",
                      padding: "14px",
                      color: "white",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease",
                      width: "100%",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "10px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: "600", fontSize: "14px" }}>{quote.document_filename}</span>
                          {quote.badges.map((badge) => (
                            <div key={badge.segment_id} style={{ display: "flex", alignItems: "center", backgroundColor: badge.color, borderRadius: "4px", overflow: "hidden" }}>
                              <span style={{ color: "#fff", fontSize: "10px", padding: "2px 6px", fontWeight: "bold" }}>{badge.name}</span>
                              <span
                                onClick={(e) => handleDeleteSegment(e, badge.segment_id)}
                                style={{ backgroundColor: "rgba(0,0,0,0.2)", color: "#fff", padding: "2px 6px", fontSize: "10px", cursor: "pointer" }}
                                title={`Remove ${badge.name}`}
                                onMouseOver={(e) => (e.target.style.backgroundColor = "rgba(255,0,0,0.5)")}
                                onMouseOut={(e) => (e.target.style.backgroundColor = "rgba(0,0,0,0.2)")}
                              >
                                ×
                              </span>
                            </div>
                          ))}
                        </div>
                        <span style={{ color: "#9aa0b8", fontSize: "12px" }}>{quote.position_label}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: "14px", lineHeight: "1.5", color: "#ddd" }}>
                      {before}
                      <span style={{ backgroundColor: "#646cff", color: "#fff", borderRadius: "4px", padding: "0 3px" }}>{highlight}</span>
                      {after}
                    </div>
                  </button>
                );
              });
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectPageCodePanel;