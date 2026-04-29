import { useEffect, useState } from "react";
import MarginSidebar from "./MarginSidebar";

const ProjectPageDocumentPanel = ({
  viewerRef,
  activeDocument,
  projectCodes,
  documentSegments,
  setUploadStatus,
  setDocumentSegments,
  fetchCodes,
  API_BASE,
  projectId,
}) => {
  const [showParentInMargin, setShowParentInMargin] = useState(false);
  const [marginBars, setMarginBars] = useState([]);
  const [segmentContextMenu, setSegmentContextMenu] = useState(null);
  const [isMemoModalOpen, setIsMemoModalOpen] = useState(false);
  const [memoText, setMemoText] = useState("");
  const [activeSegmentForMemo, setActiveSegmentForMemo] = useState(null);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [selectionRect, setSelectionRect] = useState(null);
  const [selectionText, setSelectionText] = useState("");
  const [selectionOffsets, setSelectionOffsets] = useState(null);
  const [quickCodeMode, setQuickCodeMode] = useState("new");
  const [selectedExistingCodeId, setSelectedExistingCodeId] = useState("");
  const [autoUpcode, setAutoUpcode] = useState(false);
  const [quickCodeName, setQuickCodeName] = useState("");
  const [quickCodeColor, setQuickCodeColor] = useState("#646cff");

  const hexToRGBA = (hex, opacity) => {
    if (!hex) return "transparent";
    hex = hex.replace("#", "");
    if (hex.length === 3)
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const handleRightClickSegment = (e, segmentId) => {
    e.preventDefault();
    e.stopPropagation();
    setSegmentContextMenu({
      x: e.clientX,
      y: e.clientY,
      segmentId,
    });
  };

  const getFullPath = (code, allCodes) => {
    if (!code.parent_id) return code.name;
    const parent = allCodes.find((c) => c.id === code.parent_id);
    if (parent) {
      return `${getFullPath(parent, allCodes)} > ${code.name}`;
    }
    return code.name;
  };

  const openMemoModal = (segmentId) => {
    setActiveSegmentForMemo(segmentId);
    setMemoText("");
    setIsMemoModalOpen(true);
    setSegmentContextMenu(null);
  };

  const getSelectionOffsets = () => {
    try {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !viewerRef.current) return null;

      const range = selection.getRangeAt(0);
      const startRange = document.createRange();
      startRange.setStart(viewerRef.current, 0);
      startRange.setEnd(range.startContainer, range.startOffset);

      const start = startRange.toString().length;
      const end = start + range.toString().length;

      return { start, end };
    } catch (err) {
      // Fallback: try to locate the selected text inside the original document content
      try {
        const sel = window.getSelection()?.toString();
        if (sel && sel.trim() && activeDocument && typeof activeDocument.content === "string") {
          const idx = activeDocument.content.indexOf(sel);
          if (idx !== -1) return { start: idx, end: idx + sel.length };
        }
      } catch (e) {
        // ignore fallback errors
      }
      return null;
    }
  };

  const clearTextSelection = () => {
    setSelectionText("");
    setSelectionRect(null);
    setSelectionOffsets(null);
    setQuickMenuOpen(false);
    setQuickCodeName("");
    setQuickCodeColor("#646cff");
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return clearTextSelection();

    const selectedText = selection.toString();
    if (!selectedText.trim() || !viewerRef.current) return clearTextSelection();

    const range = selection.getRangeAt(0);
    if (!viewerRef.current.contains(range.commonAncestorContainer))
      return clearTextSelection();

    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return clearTextSelection();

    const offsetValues = getSelectionOffsets();
    if (!offsetValues) return clearTextSelection();

    const safeLeft = Math.max(8, Math.min(rect.left, window.innerWidth - 280));
    const safeTop = Math.max(
      8,
      Math.min(rect.bottom + 8, window.innerHeight - 220),
    );

    setSelectionText(selectedText);
    setSelectionRect({ top: safeTop, left: safeLeft });
    setSelectionOffsets(offsetValues);

    if (projectCodes.length > 0) {
      setQuickCodeMode("existing");
      setSelectedExistingCodeId(projectCodes[0].id.toString());
    } else {
      setQuickCodeMode("new");
    }

    setQuickCodeName(
      selectedText.length > 30
        ? `${selectedText.slice(0, 27)}...`
        : selectedText,
    );
    setQuickCodeColor("#646cff");
    setQuickMenuOpen(true);
  };

  const getParentIds = (codeId, allCodes) => {
    const ids = [];
    let currentCode = allCodes.find((code) => code.id === parseInt(codeId));
    while (currentCode && currentCode.parent_id) {
      ids.push(currentCode.parent_id);
      currentCode = allCodes.find((code) => code.id === currentCode.parent_id);
    }
    return ids;
  };

  const handleQuickCodeAction = async () => {
    if (!selectionText || !activeDocument || !selectionOffsets) return;

    setUploadStatus("Creating quick code...");

    try {
      let finalCodeID;
      if (quickCodeMode === "new") {
        const codeName =
          quickCodeName.trim() ||
          (selectionText.length > 30
            ? `${selectionText.slice(0, 27)}...`
            : selectionText);

        const codeResponse = await fetch(`${API_BASE}/projects/${projectId}/codes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: codeName,
            color: quickCodeColor,
            description: "Created from selected text",
            parent_id: null,
          }),
        });

        const createdCode = await codeResponse.json();
        if (!codeResponse.ok)
          throw new Error(createdCode.detail || "Failed to create quick code");

        finalCodeID = createdCode.id;
        fetchCodes();
      } else {
        finalCodeID = parseInt(selectedExistingCodeId);
      }

      let codesToApply = [finalCodeID];

      if (autoUpcode && quickCodeMode === "existing") {
        const parentIds = getParentIds(finalCodeID, projectCodes);
        codesToApply = [...codesToApply, ...parentIds];
      }

      const segmentPromises = codesToApply.map((codeId) =>
        fetch(`${API_BASE}/projects/${projectId}/segments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            document_id: activeDocument.id,
            code_id: codeId,
            start_char: selectionOffsets.start,
            end_char: selectionOffsets.end,
            content: selectionText,
          }),
        }).then(async (res) => {
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.detail || "Failed to save segment");
          }
          return data;
        }),
      );

      const createdSegments = await Promise.all(segmentPromises);

      setUploadStatus(`Applied ${createdSegments.length} code(s)!`);
      setTimeout(() => setUploadStatus(""), 3000);
      clearTextSelection();
      window.getSelection()?.removeAllRanges();

      setDocumentSegments((prev) => [...prev, ...createdSegments]);
      fetchCodes();
    } catch (error) {
      console.error(error);
      setUploadStatus("Failed to apply code.");
    }
  };

  const handleSaveLocalSegmentMemo = async () => {
    if (!memoText.trim()) return;
    try {
      await fetch(`${API_BASE}/memos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: memoText,
          target_type: "segment",
          target_id: activeSegmentForMemo,
        }),
      });
      setIsMemoModalOpen(false);
      setMemoText("");
    } catch (error) {
      console.error("Failed to save memo:", error);
      alert("Failed to save memo");
    }
  };

  const orderedDropdownCodes = [];
  if (projectCodes) {
    const buildDropdownTree = (parentId) => {
      const children = projectCodes.filter((code) => code.parent_id === parentId);
      children.forEach((child) => {
        orderedDropdownCodes.push(child);
        buildDropdownTree(child.id);
      });
    };

    buildDropdownTree(null);

    projectCodes.forEach((code) => {
      if (
        !orderedDropdownCodes.find((orderedCode) => orderedCode.id === code.id) &&
        code.parent_id == null
      ) {
        orderedDropdownCodes.push(code);
      }
    });
  }

  useEffect(() => {
    if (!activeDocument || !viewerRef.current || documentSegments.length === 0) {
      setMarginBars([]);
      return;
    }

    const measureTimer = setTimeout(() => {
      const containerBounds = viewerRef.current.getBoundingClientRect();
      const chunks = viewerRef.current.querySelectorAll(".highlight-chunk");
      const segmentBounds = {};

      chunks.forEach((chunk) => {
        const ids = chunk.getAttribute("data-segment-ids");
        if (!ids) return;

        const chunkRect = chunk.getBoundingClientRect();
        const top = chunkRect.top - containerBounds.top;
        const bottom = top + chunkRect.height;

        ids.split(" ").forEach((id) => {
          if (!segmentBounds[id]) {
            segmentBounds[id] = { top, bottom };
          } else {
            segmentBounds[id].top = Math.min(segmentBounds[id].top, top);
            segmentBounds[id].bottom = Math.max(segmentBounds[id].bottom, bottom);
          }
        });
      });

      const rawBars = documentSegments
        .map((seg) => {
          const bounds = segmentBounds[seg.id];
          if (!bounds) return null;

          const code = projectCodes.find((currentCode) => currentCode.id === seg.code_id);

          let displayColor = code ? code.color : "#ccc";
          let displayName = code ? code.name : "Unknown";

          if (showParentInMargin && code && code.parent_id) {
            let currentIter = code;
            const pathArray = [currentIter.name];

            while (currentIter.parent_id) {
              const parent = projectCodes.find(
                (currentCode) => Number(currentCode.id) === Number(currentIter.parent_id),
              );
              if (parent) {
                pathArray.unshift(parent.name);
                currentIter = parent;
              } else {
                break;
              }
            }

            displayColor = currentIter.color;
            displayName = pathArray.join(" > ");
          }

          return {
            id: seg.id,
            code_id: seg.code_id,
            codeName: displayName,
            color: displayColor,
            top: bounds.top,
            height: bounds.bottom - bounds.top,
            track: 0,
          };
        })
        .filter(Boolean);

      rawBars.sort((a, b) => {
        if (Math.abs(b.height - a.height) > 10) {
          return b.height - a.height;
        }

        const idxA = projectCodes.findIndex((currentCode) => currentCode.id === a.code_id);
        const idxB = projectCodes.findIndex((currentCode) => currentCode.id === b.code_id);
        const validA = idxA !== -1 ? idxA : 9999;
        const validB = idxB !== -1 ? idxB : 9999;

        return validA - validB;
      });

      rawBars.forEach((bar) => {
        let currentTrack = 0;
        let conflict = true;
        while (conflict) {
          const overlappingBar = rawBars.find(
            (other) =>
              other !== bar &&
              other.track === currentTrack &&
              other.top < bar.top + bar.height &&
              other.top + other.height > bar.top,
          );
          if (overlappingBar) {
            currentTrack++;
          } else {
            conflict = false;
          }
        }
        bar.track = currentTrack;
      });

      setMarginBars(rawBars);
    }, 50);

    return () => clearTimeout(measureTimer);
  }, [activeDocument, documentSegments, projectCodes, showParentInMargin]);

  const renderHighlightedContent = (content, segments, codes) => {
    if (!segments || segments.length === 0) return content;

    let boundaries = new Set([0, content.length]);

    segments.forEach((seg) => {
      boundaries.add(seg.start_char);
      boundaries.add(seg.end_char);
    });

    const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);

    const parts = [];

    for (let i = 0; i < sortedBoundaries.length - 1; i++) {
      const start = sortedBoundaries[i];
      const end = sortedBoundaries[i + 1];
      if (start === end) continue;

      const chunkText = content.slice(start, end);
      const coveringSegments = segments.filter(
        (seg) => seg.start_char <= start && seg.end_char >= end,
      );

      if (coveringSegments.length > 0) {
        coveringSegments.sort((a, b) => {
          const idxA = codes.findIndex(c => c.id === a.code_id);
          const idxB = codes.findIndex(c => c.id === b.code_id);
          const validA = idxA !== -1 ? idxA : Number.MAX_SAFE_INTEGER;
          const validB = idxB !== -1 ? idxB : Number.MAX_SAFE_INTEGER;
          return validA - validB;
        });
        const winningSegment = coveringSegments[0];
        const code = codes.find((c) => c.id === winningSegment.code_id);
        const solidColor = code ? code.color : "transparent";
        const transparentColor = code
          ? hexToRGBA(code.color, 0.3)
          : "transparent";
        const allSegmentIds = coveringSegments.map((s) => s.id).join(" ");

        parts.push(
          <span
            key={`${start}-${end}`}
            className="highlight-chunk"
            data-segment-ids={allSegmentIds}
            onContextMenu={(e) => handleRightClickSegment(e, winningSegment.id)}
            style={{
              backgroundColor: transparentColor,
              borderBottom: `2px solid ${solidColor}`,
              padding: "2px 0px",
              borderRadius: "3px",
              cursor: "pointer",
            }}
            title={code ? code.name : "Code"}
          >
            {chunkText}
          </span>,
        );
      } else {
        parts.push(<span key={`${start}-${end}`}>{chunkText}</span>);
      }
    }
    return parts;
  };

  const documentShellStyle = {
    flex: 1,
    border: "1px solid #ccc",
    borderRadius: "8px",
    padding: "30px",
    backgroundColor: "#fff",
    color: "#333",
    overflowY: "auto",
    position: "relative",
  };

  const EmptyState = () => (
    <div style={documentShellStyle}>
      <div
        style={{
          display: "flex",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          color: "#888",
        }}
      >
        <p>Select a document from the sidebar to start reading.</p>
      </div>
    </div>
  );

  const DocumentHeader = () => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "2px solid #aaa", paddingBottom: "10px", marginBottom: "20px" }}>
      <h2 style={{ margin: 0, color: "#000", fontWeight: "500" }}>{activeDocument.filename}</h2>
      <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#555", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={showParentInMargin}
          onChange={(e) => setShowParentInMargin(e.target.checked)}
          style={{ cursor: "pointer", accentColor: "#646cff" }}
        />
        Group Margins by Parent Theme
      </label>
    </div>
  );

  const DocumentViewer = () => (
    <div style={{ display: "flex", position: "relative" }}>
      <div
        ref={viewerRef}
        tabIndex={0}
        onMouseUp={handleTextSelection}
        onKeyUp={handleTextSelection}
        style={{
          width: "75%",
          paddingRight: "30px",
          whiteSpace: "pre-wrap",
          fontSize: "16px",
          lineHeight: "1.6",
          fontFamily: "system-ui, sans-serif",
          outline: "none",
          position: "relative",
        }}
      >
        {renderHighlightedContent(activeDocument.content, documentSegments, projectCodes)}
      </div>
      <MarginSidebar marginBars={marginBars} projectCodes={projectCodes} />
    </div>
  );

  const DocumentContextMenu = () =>
    segmentContextMenu ? (
      <div style={{ position: "fixed", top: segmentContextMenu.y, left: segmentContextMenu.x, zIndex: 2000, backgroundColor: "#23232a", border: "1px solid #444", borderRadius: "8px", padding: "6px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", color: "white" }}>
        <button
          onClick={() => openMemoModal(segmentContextMenu.segmentId)}
          style={{ display: "block", width: "100%", padding: "8px 16px", backgroundColor: "transparent", border: "none", color: "white", textAlign: "left", cursor: "pointer", borderRadius: "4px" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#3a3a44")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          📝 Add Quote Memo
        </button>
      </div>
    ) : null;

  const DocumentMemoModal = () =>
    isMemoModalOpen ? (
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ backgroundColor: "#23232a", padding: "24px", borderRadius: "12px", width: "400px", color: "white", border: "1px solid #444", boxShadow: "0 12px 30px rgba(0,0,0,0.5)" }}>
          <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Add Quote Memo</h3>
          <textarea
            value={memoText}
            onChange={(e) => setMemoText(e.target.value)}
            placeholder="Why is this quote interesting? What are your immediate thoughts?"
            rows={5}
            autoFocus
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #555", backgroundColor: "#1f1f28", color: "white", boxSizing: "border-box", marginBottom: "16px", resize: "vertical" }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button onClick={() => setIsMemoModalOpen(false)} style={{ padding: "8px 16px", backgroundColor: "#444", border: "none", borderRadius: "8px", color: "white", cursor: "pointer" }}>
              Cancel
            </button>
            <button onClick={handleSaveLocalSegmentMemo} style={{ padding: "8px 16px", backgroundColor: "#646cff", border: "none", borderRadius: "8px", color: "white", cursor: "pointer" }}>
              Save Memo
            </button>
          </div>
        </div>
      </div>
    ) : null;

  const DocumentQuickMenu = () =>
    quickMenuOpen && selectionRect ? (
      <div style={{ position: "fixed", top: selectionRect.top + 8, left: selectionRect.left, zIndex: 1000, backgroundColor: "#23232a", border: "1px solid #444", borderRadius: "10px", padding: "10px", minWidth: "240px", color: "white", boxShadow: "0 12px 30px rgba(0, 0, 0, 0.25)" }}>
        <div style={{ marginBottom: "8px", fontSize: "13px", color: "#b0b0c3" }}>Selected</div>
        <div style={{ marginBottom: "10px", fontSize: "14px", lineHeight: "1.4", maxHeight: "84px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "normal", wordBreak: "break-word" }}>
          {selectionText}
        </div>

        <div style={{ display: "grid", gap: "8px", marginBottom: "10px" }}>
          <select
            value={quickCodeMode === "new" ? "new" : selectedExistingCodeId}
            onChange={(e) => {
              if (e.target.value === "new") {
                setQuickCodeMode("new");
              } else {
                setQuickCodeMode("existing");
                setSelectedExistingCodeId(e.target.value);
              }
            }}
            style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #555", backgroundColor: "#1f1f28", color: "white", cursor: "pointer" }}
          >
            {orderedDropdownCodes.length > 0 && (
              <optgroup label="Existing Codes">
                {orderedDropdownCodes.map((code) => (
                  <option key={code.id} value={code.id}>
                    {getFullPath(code, projectCodes)}
                  </option>
                ))}
              </optgroup>
            )}
            {projectCodes.length > 0 && (
              <optgroup label="Existing Codes">
                {projectCodes.map((code) => (
                  <option key={code.id} value={code.id}>
                    {code.name}
                  </option>
                ))}
              </optgroup>
            )}
            <option value="new">✨ Create New Code...</option>
          </select>

          {quickCodeMode === "existing" && (
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#b0b0c3", cursor: "pointer", padding: "2px 0" }}>
              <input type="checkbox" checked={autoUpcode} onChange={(e) => setAutoUpcode(e.target.checked)} style={{ cursor: "pointer", accentColor: "#646cff" }} />
              Auto-apply to parent themes
            </label>
          )}

          {quickCodeMode === "new" && (
            <>
              <input
                type="text"
                value={quickCodeName}
                onChange={(e) => setQuickCodeName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleQuickCodeAction();
                  }
                }}
                placeholder="Code name"
                style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #555", backgroundColor: "#1f1f28", color: "white", boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label htmlFor="quick-color" style={{ color: "#b0b0c3", fontSize: "13px", minWidth: "70px" }}>
                  Color
                </label>
                <input id="quick-color" type="color" value={quickCodeColor} onChange={(e) => setQuickCodeColor(e.target.value)} style={{ width: "40px", height: "40px", padding: 0, border: "none", background: "transparent", cursor: "pointer" }} />
              </div>
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={handleQuickCodeAction} style={{ flex: 1, padding: "8px 10px", backgroundColor: "#646cff", border: "none", borderRadius: "8px", color: "white", cursor: "pointer" }}>
            Apply Code
          </button>
          <button onClick={clearTextSelection} style={{ padding: "8px 10px", backgroundColor: "#444", border: "none", borderRadius: "8px", color: "white", cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    ) : null;

  if (!activeDocument) {
    return <EmptyState />;
  }

  return (
    <div style={documentShellStyle}>
      <DocumentHeader />
      <DocumentViewer />
      <DocumentContextMenu />
      <DocumentMemoModal />
      <DocumentQuickMenu />
    </div>
  );
};

export default ProjectPageDocumentPanel;