import { useState, useEffect, useRef } from "react";

const ProjectPageCodePanel = ({
  API_BASE,
  projectId,
  projectCodes,
  documents,
  codePanelOpen,
  activeCode,
  refreshToken,
  setCodePanelOpen,
  setActiveCode,
  setActiveDocument,
  setDocumentSegments,
  setPendingQuoteJump,
  fetchCodes,
  pushUndoAction,
}) => {
  const [selectedQuoteId, setSelectedQuoteId] = useState(null);
  const [includeSubCodes, setIncludeSubCodes] = useState(true); 
  const [localSegments, setLocalSegments] = useState([]);
  const [loading, setLoading] = useState(false);

  const [docCache, setDocCache] = useState({});
  const fetchingDocs = useRef(new Set());

  useEffect(() => {
    if (!activeCode || !codePanelOpen) return;

    const loadQuotes = async () => {
      setLoading(true);
      try {
        const segmentPromises = (documents || []).map((doc) =>
          fetch(`${API_BASE}/projects/${projectId}/segments?document_id=${doc.id}`).then((res) => res.json())
        );
        const segmentsArrays = await Promise.all(segmentPromises);
        const allSegments = segmentsArrays.flat().filter(s => s && !s.detail);

        const getKids = (parentId) => {
          let kids = (projectCodes || []).filter(c => Number(c.parent_id) === Number(parentId)).map(c => Number(c.id));
          let allKids = [...kids];
          kids.forEach(k => { allKids = [...allKids, ...getKids(k)] });
          return allKids;
        };

        let validIds = [Number(activeCode.id)];
        if (includeSubCodes) {
          validIds = [...validIds, ...getKids(activeCode.id)];
        }

        setLocalSegments(allSegments.filter(s => validIds.includes(Number(s.code_id))));
      } catch (err) {
        console.error("Failed to load code segments:", err);
      }
      setLoading(false);
    };

    loadQuotes();
  }, [activeCode, includeSubCodes, codePanelOpen, documents, projectId, API_BASE, projectCodes, refreshToken]);

  useEffect(() => {
    const missingDocIds = [...new Set(localSegments.map(s => s.document_id))]
      .filter(id => !docCache[id] && !fetchingDocs.current.has(id));
    
    if (missingDocIds.length === 0) return;

    missingDocIds.forEach(id => fetchingDocs.current.add(id));

    Promise.all(missingDocIds.map(async (docId) => {
      try {
        const res = await fetch(`${API_BASE}/projects/${projectId}/documents/${docId}`);
        const data = await res.json();
        setDocCache(prev => ({ ...prev, [docId]: data }));
      } catch (err) {
        console.error("Failed to cache document for context:", err);
      }
    }));
  }, [localSegments, projectId, API_BASE, docCache]);

  const handleQuoteClick = async (quote) => {
    setSelectedQuoteId(quote.id);

    try {
      const docRes = await fetch(`${API_BASE}/projects/${projectId}/documents/${quote.document_id}`);
      const docData = await docRes.json();
      setActiveDocument(docData);

      const segRes = await fetch(`${API_BASE}/projects/${projectId}/segments?document_id=${quote.document_id}`);
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
    const confirmDelete = window.confirm("Are you sure you want to delete this highlighted quote?");
    if (!confirmDelete) return;

    const segmentSnapshot = localSegments.find((segment) => segment.id === segmentId);

    try {
      const response = await fetch(`${API_BASE}/projects/${projectId}/segments/${segmentId}`, { method: "DELETE" });
      if (response.ok) {
        fetchCodes(); // Update the sidebar badge
        setLocalSegments((prev) => prev.filter((segment) => segment.id !== segmentId)); // Update panel instantly
        if (setDocumentSegments) {
          setDocumentSegments((prev) => prev.filter((segment) => segment.id !== segmentId));
        }
        if (segmentSnapshot && pushUndoAction) {
          pushUndoAction({
            type: "delete-segment",
            segment: segmentSnapshot,
          });
        }
        if (selectedQuoteId === segmentId) setSelectedQuoteId(null);
      } else {
        console.error("Failed to delete segment");
      }
    } catch (error) {
      console.error("Error deleting segment:", error);
    }
  };

  if (!codePanelOpen) return null;

  const hasChildren = activeCode && projectCodes.some((c) => Number(c.parent_id) === Number(activeCode.id));

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", border: "1px solid #ccc",borderRight: "1px solid #333" , padding: "20px", backgroundColor: "#111", color: "#fff",borderTop: "1px solid #ccc", overflow: "hidden", boxSizing: "border-box", }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "18px" }}>Compiled Quotes</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "6px" }}>
            <div style={{ color: "#aaa", fontSize: "13px", fontWeight: "bold" }}>{activeCode?.name || "Selected code"}</div>
            
            {hasChildren && (
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#b0b0c3", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={includeSubCodes}
                  onChange={(e) => setIncludeSubCodes(e.target.checked)}
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
            setSelectedQuoteId(null);
          }}
          style={{ backgroundColor: "transparent", border: "1px solid #444", color: "#ccc", borderRadius: "6px", padding: "8px 12px", cursor: "pointer" }}
        >
          Close
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
        {loading ? (
          <p style={{ color: "#888", margin: 0, fontStyle: "italic" }}>Fetching quotes...</p>
        ) : localSegments.length === 0 ? (
          <p style={{ color: "#888", margin: 0 }}>No quotes found for this code yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {(() => {
              const groupedQuotes = [];
              localSegments.forEach((quote) => {
                const existing = groupedQuotes.find(
                  (group) =>
                    group.document_id === quote.document_id &&
                    group.start_char === quote.start_char &&
                    group.end_char === quote.end_char,
                );

                const codeObj = projectCodes.find(c => Number(c.id) === Number(quote.code_id)) || activeCode;
                const badgeData = { segment_id: quote.id, name: codeObj?.name || "Code", color: codeObj?.color || "#646cff" };

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
                const docObj = documents?.find(d => Number(d.id) === Number(quote.document_id));
                const docName = docObj ? docObj.filename : `Document #${quote.document_id}`;

                const isSelected = quote.badges.some((badge) => badge.segment_id === selectedQuoteId);
                const primarySegmentId = quote.badges[0]?.segment_id ?? quote.id;

                let before = "";
                let highlight = quote.content || "Empty quote";
                let after = "";

                if (docCache[quote.document_id]?.content && quote.start_char !== undefined && quote.end_char !== undefined) {
                  const fullText = docCache[quote.document_id].content;
                  const start = quote.start_char;
                  const end = quote.end_char;
                  
                  const pad = 120; 
                  const cStart = Math.max(0, start - pad);
                  const cEnd = Math.min(fullText.length, end + pad);

                  before = fullText.substring(cStart, start);
                  if (cStart > 0) before = "..." + before;

                  highlight = fullText.substring(start, end) || quote.content;

                  after = fullText.substring(end, cEnd);
                  if (cEnd < fullText.length) after = after + "...";
                }

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
                          <span style={{ fontWeight: "600", fontSize: "14px", color: '#ccc' }}>📄 {docName}</span>
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
                      </div>
                    </div>
                  
                    <div style={{ fontSize: "14px", lineHeight: "1.5", color: "#ddd" }}>
                      {before}
                      <span style={{ backgroundColor: quote.badges[0]?.color || "#646cff", color: "#fff", borderRadius: "4px", padding: "0 3px" }}>
                        {highlight}
                      </span>
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