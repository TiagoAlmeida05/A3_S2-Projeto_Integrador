import { useEffect, useState, useRef, use } from "react";
import MarginSidebar from "./MarginSidebar";

const ProjectPageDocumentPanel = ({
  viewerRef,
  activeDocument,
  projectCodes,
  documentSegments,
  setUploadStatus,
  setDocumentSegments,
  setActiveDocument, 
  fetchCodes,
  fetchDocuments,
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
  const [quickCodeParentId, setQuickCodeParentId] = useState("");
  const [quickCodeColor, setQuickCodeColor] = useState("#646cff");
  const [isPdfPreviewCollapsed, setIsPdfPreviewCollapsed] = useState(false);
  
  // Edit Mode & Real-Time Segment State
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [localSegments, setLocalSegments] = useState([]);
  const bgRef = useRef(null);

  const hexToRGBA = (hex, opacity) => {
    if (!hex) return "transparent";
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  useEffect(() => {
    if (activeDocument && activeDocument.id === "NEW_DOC_PENDING") {
      setIsEditing(true);
      setEditContent(prev => prev ? prev : "");
      setLocalSegments([]);
    }else {
      setIsEditing(false);
    }
    setIsPdfPreviewCollapsed(false);
  }, [activeDocument?.id]);

  const handleRightClickSegment = (e, segmentId) => {
    e.preventDefault();
    e.stopPropagation();
    setSegmentContextMenu({ x: e.clientX, y: e.clientY, segmentId });
  };

  const getFullPath = (code, allCodes) => {
    if (!code.parent_id) return code.name;
    const parent = allCodes.find((c) => c.id === code.parent_id);
    if (parent) return `${getFullPath(parent, allCodes)} > ${code.name}`;
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
    } catch (err) { return null; }
  };

  const clearTextSelection = () => {
    setSelectionText("");
    setSelectionRect(null);
    setSelectionOffsets(null);
    setQuickMenuOpen(false);
    setQuickCodeName("");
    setQuickCodeColor("#646cff");
    setQuickCodeParentId("");
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return clearTextSelection();
    const selectedText = selection.toString();
    if (!selectedText.trim() || !viewerRef.current) return clearTextSelection();
    const range = selection.getRangeAt(0);
    if (!viewerRef.current.contains(range.commonAncestorContainer)) return clearTextSelection();
    
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return clearTextSelection();
    
    const offsetValues = getSelectionOffsets();
    if (!offsetValues) return clearTextSelection();

    const safeLeft = Math.max(8, Math.min(rect.left, window.innerWidth - 280));
    const safeTop = Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - 220));

    setSelectionText(selectedText);
    setSelectionRect({ top: safeTop, left: safeLeft });
    setSelectionOffsets(offsetValues);

    if (projectCodes.length > 0) {
      setQuickCodeMode("existing");
      setSelectedExistingCodeId(projectCodes[0].id.toString());
    } else {
      setQuickCodeMode("new");
    }

    setQuickCodeName(selectedText.length > 30 ? `${selectedText.slice(0, 27)}...` : selectedText);
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
        const codeName = quickCodeName.trim() || (selectionText.length > 30 ? `${selectionText.slice(0, 27)}...` : selectionText);
        const codeResponse = await fetch(`${API_BASE}/projects/${projectId}/codes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            name: codeName, 
            color: quickCodeColor, 
            description: "Created from selected text", 
            parent_id: quickCodeParentId ? parseInt(quickCodeParentId) : null // 🔥 Fixed
          }),
        });
        const createdCode = await codeResponse.json();
        if (!codeResponse.ok) throw new Error(createdCode.detail || "Failed to create quick code");
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
          body: JSON.stringify({ document_id: activeDocument.id, code_id: codeId, start_char: selectionOffsets.start, end_char: selectionOffsets.end, content: selectionText }),
        }).then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail || "Failed to save segment");
          return data;
        })
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
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: memoText, target_type: "segment", target_id: activeSegmentForMemo }),
      });
      setIsMemoModalOpen(false);
      setMemoText("");
    } catch (error) {
      alert("Failed to save memo");
    }
  };

  const handleEditChange = (e) => {
    const newContent = e.target.value;
    const oldContent = editContent;
    
    let commonPrefixLen = 0;
    while (commonPrefixLen < oldContent.length && commonPrefixLen < newContent.length && oldContent[commonPrefixLen] === newContent[commonPrefixLen]) {
      commonPrefixLen++;
    }
    
    let commonSuffixLen = 0;
    while (commonSuffixLen < oldContent.length - commonPrefixLen && commonSuffixLen < newContent.length - commonPrefixLen && oldContent[oldContent.length - 1 - commonSuffixLen] === newContent[newContent.length - 1 - commonSuffixLen]) {
      commonSuffixLen++;
    }
    
    const oldReplacedLen = oldContent.length - commonPrefixLen - commonSuffixLen;
    const newInsertedLen = newContent.length - commonPrefixLen - commonSuffixLen;
    
    const editStart = commonPrefixLen;
    const editEndOld = editStart + oldReplacedLen;
    const deltaLen = newInsertedLen - oldReplacedLen;

    const nextSegments = localSegments.map(seg => {
      let newStart = seg.start_char;
      let newEnd = seg.end_char;
      
      if (editEndOld <= seg.start_char) {
        newStart += deltaLen; newEnd += deltaLen;
      } else if (editStart >= seg.end_char) {
        // No change
      } else if (editStart >= seg.start_char && editEndOld <= seg.end_char) {
        newEnd += deltaLen;
      } else if (editStart < seg.start_char && editEndOld > seg.start_char && editEndOld <= seg.end_char) {
        newStart = editStart + newInsertedLen; newEnd += deltaLen;
      } else if (editStart >= seg.start_char && editStart < seg.end_char && editEndOld > seg.end_char) {
        newEnd = editStart;
      } else if (editStart <= seg.start_char && editEndOld >= seg.end_char) {
         newStart = editStart; newEnd = editStart; 
      }

      if (newStart < 0) newStart = 0;
      if (newEnd < newStart) newEnd = newStart;

      return { ...seg, start_char: newStart, end_char: newEnd, content: newContent.slice(newStart, newEnd) };
    }).filter(seg => seg.end_char > seg.start_char); 

    setLocalSegments(nextSegments);
    setEditContent(newContent);
  };

  const handleScroll = (e) => {
    if (bgRef.current) {
      bgRef.current.scrollTop = e.target.scrollTop;
      bgRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  const handleToggleEdit = () => {
    if (!isEditing) {
      setEditContent(activeDocument.content || "");
      setLocalSegments([...documentSegments]); 
      setIsEditing(true);
    } else {
      if (activeDocument.id === "NEW_DOC_PENDING") {
        setActiveDocument(null);
      } else {
      setIsEditing(false);
      }
    }
  };

  // --- NEW: SOFT REFRESH LOGIC ---
  const handleSaveEdit = async () => {
    setUploadStatus("Saving document and shifting codes...");
    try {
      if (activeDocument.id === "NEW_DOC_PENDING") {
        const title = activeDocument.filename.trim() || "Untitled Document";
        const docRes = await fetch(`${API_BASE}/projects/${projectId}/documents/create`, {
          method: "POST", 
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: title, content: editContent }),
        });

        if (!docRes.ok) throw new Error("Failed to create document");

        const savedDoc = await docRes.json();

        setIsEditing(false);
        setActiveDocument({ ...savedDoc, content: editContent });
        if (fetchDocuments) fetchDocuments();

        setUploadStatus("Document created successfully!");
        setTimeout(() => setUploadStatus(""), 3000);
        return;
      }

      setUploadStatus("Saving document and shifting codes...");
      const docRes = await fetch(`${API_BASE}/projects/${projectId}/documents/${activeDocument.id}/content`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });

      if (!docRes.ok) throw new Error("Failed to save document");

      const segmentPromises = localSegments.map((seg) =>
        fetch(`${API_BASE}/projects/${projectId}/segments/${seg.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ start_char: seg.start_char, end_char: seg.end_char, content: seg.content }),
        })
      );

      await Promise.all(segmentPromises);

      const deletedSegments = documentSegments.filter(oldSeg => !localSegments.find(ls => ls.id === oldSeg.id));
      const deletePromises = deletedSegments.map(seg =>
        fetch(`${API_BASE}/projects/${projectId}/segments/${seg.id}`, {
          method: "DELETE",
        })
      );
      await Promise.all(deletePromises);

      const updatedDocRes = await fetch(`${API_BASE}/projects/${projectId}/documents/${activeDocument.id}`);
      const updatedDoc = await updatedDocRes.json();
      setActiveDocument(updatedDoc);

      const updatedSegRes = await fetch(`${API_BASE}/projects/${projectId}/segments?document_id=${activeDocument.id}`);
      const updatedSeg = await updatedSegRes.json();
      setDocumentSegments(updatedSeg);

      setIsEditing(false);
      setUploadStatus("Edits saved successfully!");
      setTimeout(() => setUploadStatus(""), 3000);
    } catch (error) {
      console.error(error);
      setUploadStatus("Failed to save edits.");
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
      if (!orderedDropdownCodes.find((oc) => oc.id === code.id) && !code.parent_id) {
        orderedDropdownCodes.push(code);
      }
    });
  }

  useEffect(() => {
    const targetSegments = isEditing ? localSegments : documentSegments;
    const targetRef = isEditing ? bgRef : viewerRef;

    if (!activeDocument || !targetRef.current || targetSegments.length === 0) {
      setMarginBars([]);
      return;
    }

    const measureTimer = setTimeout(() => {
      const containerBounds = targetRef.current.getBoundingClientRect();
      const chunks = targetRef.current.querySelectorAll(".highlight-chunk");
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

      const rawBars = targetSegments.map((seg) => {
          const bounds = segmentBounds[seg.id];
          if (!bounds) return null;
          const code = projectCodes.find((currentCode) => currentCode.id === seg.code_id);
          let displayColor = code ? code.color : "#ccc";
          let displayName = code ? code.name : "Unknown";

          if (showParentInMargin && code && code.parent_id) {
            let currentIter = code;
            const pathArray = [currentIter.name];
            while (currentIter.parent_id) {
              const parent = projectCodes.find((cc) => Number(cc.id) === Number(currentIter.parent_id));
              if (parent) {
                pathArray.unshift(parent.name);
                currentIter = parent;
              } else break; 
            }
            displayColor = currentIter.color;
            displayName = pathArray.join(" > ");
          }

          return {
            id: seg.id, code_id: seg.code_id, codeName: displayName,
            color: displayColor, top: bounds.top, height: bounds.bottom - bounds.top, track: 0,
          };
        }).filter(Boolean);

      rawBars.sort((a, b) => {
        if (Math.abs(b.height - a.height) > 10) return b.height - a.height;
        const idxA = projectCodes.findIndex((cc) => cc.id === a.code_id);
        const idxB = projectCodes.findIndex((cc) => cc.id === b.code_id);
        return (idxA !== -1 ? idxA : 9999) - (idxB !== -1 ? idxB : 9999);
      });

      rawBars.forEach((bar) => {
        let currentTrack = 0;
        let conflict = true;
        while (conflict) {
          const overlappingBar = rawBars.find(
            (other) => other !== bar && other.track === currentTrack && other.top < bar.top + bar.height && other.top + other.height > bar.top
          );
          if (overlappingBar) currentTrack++; else conflict = false;
        }
        bar.track = currentTrack;
      });
      setMarginBars(rawBars);
    }, 50);

    return () => clearTimeout(measureTimer);
  }, [activeDocument, documentSegments, localSegments, projectCodes, showParentInMargin, isEditing]);

  const renderHighlightedContent = (content, segments, codes) => {
    if(!content) return "";
    
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
      const coveringSegments = segments.filter((seg) => seg.start_char <= start && seg.end_char >= end);

      if (coveringSegments.length > 0) {
        coveringSegments.sort((a, b) => {
          const idxA = codes.findIndex(c => c.id === a.code_id);
          const idxB = codes.findIndex(c => c.id === b.code_id);
          return (idxA !== -1 ? idxA : 9999) - (idxB !== -1 ? idxB : 9999);
        });
        const winningSegment = coveringSegments[0];
        const code = codes.find((c) => c.id === winningSegment.code_id);
        const solidColor = code ? code.color : "transparent";
        const transparentColor = code ? hexToRGBA(code.color, 0.3) : "transparent";
        const allSegmentIds = coveringSegments.map((s) => s.id).join(" ");

        parts.push(
          <span
            key={`${start}-${end}`}
            className="highlight-chunk"
            data-segment-ids={allSegmentIds}
            onContextMenu={!isEditing ? ((e) => handleRightClickSegment(e, winningSegment.id)) : undefined}
            style={{
              backgroundColor: transparentColor,
              borderBottom: `2px solid ${solidColor}`,
              padding: "2px 0px",
              borderRadius: "3px",
              cursor: isEditing ? "text" : "pointer",
            }}
          >
            {chunkText}
          </span>
        );
      } else {
        parts.push(<span key={`${start}-${end}`}>{chunkText}</span>);
      }
    }
    return parts;
  };

  const documentShellStyle = {
    flex: 1, border: "1px solid #ccc", borderRadius: "8px", padding: "30px",
    backgroundColor: "#fff", color: "#333", overflowY: "auto", position: "relative",
  };

  if (!activeDocument) {
    return (
      <div style={documentShellStyle}>
        <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "#888" }}>
          <p>Select a document from the sidebar to start reading.</p>
        </div>
      </div>
    );
  }

  const isPDF = activeDocument?.filename?.toLowerCase().endsWith('.pdf') || activeDocument?.type === "pdf";
  const showPdfPreview = isPDF && !isPdfPreviewCollapsed;
  const pdfPreviewUrl = `${API_BASE}/projects/${projectId}/documents/${activeDocument.id}/file`;

  return (
    <div style={documentShellStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "2px solid #aaa", paddingBottom: "10px", marginBottom: "20px" }}>
        {activeDocument.id === "NEW_DOC_PENDING" ? (
          <input 
            type="text" 
            placeholder="Document Title..."
            value={activeDocument.filename === "Untitled Document" ? "" : activeDocument.filename}
            onChange={(e) => setActiveDocument({ ...activeDocument, filename: e.target.value })}
            style={{ margin: 0, fontSize: "24px", color: "#000", fontWeight: "500", border: "none", borderBottom: "2px dashed #646cff", outline: "none", background: "transparent", width: "40%" }}
            autoFocus
          />
        ) : (
          <h2 style={{ margin: 0, color: "#000", fontWeight: "500" }}>{activeDocument.filename}</h2>
        )}
        
        <div style={{ display: "flex", gap: "15px", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {isEditing ? (
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleSaveEdit} style={{ padding: '6px 12px', background: '#4CAF50', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                💾 Save
              </button>
              <button onClick={handleToggleEdit} style={{ padding: '6px 12px', background: 'transparent', color: '#555', border: '1px solid #999', borderRadius: '4px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={handleToggleEdit} style={{ padding: '6px 12px', background: '#f0f0f0', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>
              ✏️ {isPDF ? "Edit PDF Text (Not Recommended)" : "Edit Text"}
            </button>
          )}

          {isPDF && (
            <button
              onClick={() => setIsPdfPreviewCollapsed((prev) => !prev)}
              style={{ padding: '6px 12px', background: '#1f1f28', color: '#fff', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer' }}
              title={isPdfPreviewCollapsed ? 'Show the PDF preview' : 'Hide the PDF preview'}
            >
              {isPdfPreviewCollapsed ? 'Show PDF Preview' : 'Hide PDF Preview'}
            </button>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#555", cursor: "pointer", borderLeft: '1px solid #ccc', paddingLeft: '15px' }}>
            <input type="checkbox" checked={showParentInMargin} onChange={(e) => setShowParentInMargin(e.target.checked)} style={{ cursor: "pointer", accentColor: "#646cff" }} />
            Group Margins by Parent
          </label>
        </div>
      </div>

      <div style={{ display: "flex", position: "relative", gap: "16px", alignItems: "stretch" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {isEditing ? (
            <div style={{ position: "relative", width: "100%", minHeight: "600px", border: "2px solid #646cff", borderRadius: "6px", backgroundColor: "#fafafa", overflow: "hidden" }}>
            
            <div
              ref={bgRef}
              style={{
                position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                color: "transparent", 
                fontFamily: "system-ui, sans-serif", fontSize: "16px", lineHeight: "1.6",
                padding: "15px", boxSizing: "border-box",
                whiteSpace: "pre-wrap", overflowY: "auto", pointerEvents: "none", zIndex: 1
              }}
            >
              {renderHighlightedContent(editContent, localSegments, projectCodes)}
            </div>
            
            <textarea 
              value={editContent}
              onChange={handleEditChange}
              onScroll={handleScroll}
              spellCheck="false"
              placeholder={activeDocument.id === "NEW_DOC_PENDING" ? "Start typing your document here..." : ""}
              style={{ 
                position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                backgroundColor: "transparent", 
                color: "#222", 
                border: "none", 
                padding: "15px", boxSizing: "border-box",
                fontFamily: "system-ui, sans-serif", fontSize: "16px", lineHeight: "1.6",
                resize: "none", outline: "none",
                whiteSpace: "pre-wrap", overflowY: "auto", zIndex: 2
              }}
            />
          </div>
        ) : (
          <div
            ref={viewerRef}
            tabIndex={0}
            onMouseUp={handleTextSelection}
            onKeyUp={handleTextSelection}
            style={{ width: "100%", paddingRight: isPDF && showPdfPreview ? "0" : "30px", whiteSpace: "pre-wrap", fontSize: "16px", lineHeight: "1.6", fontFamily: "system-ui, sans-serif", outline: "none", position: "relative" }}
          >
            {renderHighlightedContent(activeDocument.content, documentSegments, projectCodes)}
          </div>
          )}
        </div>

        {isPDF && showPdfPreview && (
          <div style={{ flex: "0 0 38%", minWidth: "320px", minHeight: "600px", display: "flex", flexDirection: "column", backgroundColor: "#0f1115", border: "1px solid #2d2f36", borderRadius: "8px", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderBottom: "1px solid #2d2f36", color: "#e5e7eb", backgroundColor: "#151922" }}>
              <div style={{ fontSize: "13px", fontWeight: "bold" }}>Original PDF</div>
            </div>
            <embed
              title={`${activeDocument.filename} preview`}
              src={`${pdfPreviewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
              type="application/pdf"
              style={{ width: "100%", flex: 1, border: "none", backgroundColor: "#fff" }}
            />
          </div>
        )}

        {isPDF && isPdfPreviewCollapsed && (
          <div style={{ flex: "0 0 52px", minHeight: "600px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <button
              onClick={() => setIsPdfPreviewCollapsed(false)}
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", backgroundColor: "#1f1f28", color: "#fff", border: "1px solid #555", borderRadius: "8px", padding: "12px 8px", cursor: "pointer", fontSize: "12px", letterSpacing: "0.4px" }}
              title="Show the PDF preview"
            >
              Show PDF Preview
            </button>
          </div>
        )}

        <MarginSidebar marginBars={marginBars} projectCodes={projectCodes} />
      </div>

      {segmentContextMenu && (
        <div style={{ position: "fixed", top: segmentContextMenu.y, left: segmentContextMenu.x, zIndex: 2000, backgroundColor: "#23232a", border: "1px solid #444", borderRadius: "8px", padding: "6px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", color: "white" }}>
          <button onClick={() => openMemoModal(segmentContextMenu.segmentId)} style={{ display: "block", width: "100%", padding: "8px 16px", backgroundColor: "transparent", border: "none", color: "white", textAlign: "left", cursor: "pointer", borderRadius: "4px" }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#3a3a44")} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>
            📝 Add Quote Memo
          </button>
        </div>
      )}

      {isMemoModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ backgroundColor: "#23232a", padding: "24px", borderRadius: "12px", width: "400px", color: "white", border: "1px solid #444", boxShadow: "0 12px 30px rgba(0,0,0,0.5)" }}>
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Add Quote Memo</h3>
            <textarea value={memoText} onChange={(e) => setMemoText(e.target.value)} placeholder="Memo text..." rows={5} autoFocus style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #555", backgroundColor: "#1f1f28", color: "white", boxSizing: "border-box", marginBottom: "16px", resize: "vertical" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={() => setIsMemoModalOpen(false)} style={{ padding: "8px 16px", backgroundColor: "#444", border: "none", borderRadius: "8px", color: "white", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSaveLocalSegmentMemo} style={{ padding: "8px 16px", backgroundColor: "#646cff", border: "none", borderRadius: "8px", color: "white", cursor: "pointer" }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {quickMenuOpen && selectionRect && (
        <div style={{ position: "fixed", top: selectionRect.top + 8, left: selectionRect.left, zIndex: 1000, backgroundColor: "#23232a", border: "1px solid #444", borderRadius: "10px", padding: "10px", minWidth: "240px", color: "white", boxShadow: "0 12px 30px rgba(0, 0, 0, 0.25)" }}>
          <div style={{ marginBottom: "8px", fontSize: "13px", color: "#b0b0c3" }}>Selected</div>
          <div style={{ marginBottom: "10px", fontSize: "14px", lineHeight: "1.4", maxHeight: "84px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "normal", wordBreak: "break-word" }}>{selectionText}</div>
          <div style={{ display: "grid", gap: "8px", marginBottom: "10px" }}>
            <select value={quickCodeMode === "new" ? "new" : selectedExistingCodeId} onChange={(e) => { if (e.target.value === "new") setQuickCodeMode("new"); else { setQuickCodeMode("existing"); setSelectedExistingCodeId(e.target.value); } }} style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #555", backgroundColor: "#1f1f28", color: "white", cursor: "pointer" }}>
              <optgroup label="Hierarchical Codes">
                {orderedDropdownCodes.map((code) => (<option key={code.id} value={code.id}>{getFullPath(code, projectCodes)}</option>))}
              </optgroup>
              <option value="new">✨ Create New Code...</option>
            </select>

            {/* Auto-upcode checkbox for existing codes */}
            {quickCodeMode === "existing" && (
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#b0b0c3", cursor: "pointer" }}>
                <input type="checkbox" checked={autoUpcode} onChange={(e) => setAutoUpcode(e.target.checked)} style={{ cursor: "pointer", accentColor: "#646cff" }} />
                Auto-apply to parent themes
              </label>
            )}

            {/* Inputs for NEW codes (No Description!) */}
            {quickCodeMode === "new" && (
              <>
                <input
                  type="text"
                  value={quickCodeName}
                  onChange={(e) => setQuickCodeName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleQuickCodeAction(); } }}
                  placeholder="Code name"
                  style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #555", backgroundColor: "#1f1f28", color: "white", boxSizing: "border-box" }}
                />
                
                <select
                  value={quickCodeParentId}
                  onChange={(e) => setQuickCodeParentId(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #555", backgroundColor: "#1f1f28", color: "white", cursor: "pointer" }}
                >
                  <option value="">No Parent (Root Code)</option>
                  {orderedDropdownCodes.map((code) => (
                    <option key={code.id} value={code.id}>
                      Assign to: {getFullPath(code, projectCodes)}
                    </option>
                  ))}
                </select>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <label htmlFor="quick-color" style={{ color: "#b0b0c3", fontSize: "13px", minWidth: "70px" }}>Color</label>
                  <input id="quick-color" type="color" value={quickCodeColor} onChange={(e) => setQuickCodeColor(e.target.value)} style={{ width: "40px", height: "40px", padding: 0, border: "none", background: "transparent", cursor: "pointer" }} />
                </div>
              </>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={handleQuickCodeAction} style={{ flex: 1, padding: "8px 10px", backgroundColor: "#646cff", border: "none", borderRadius: "8px", color: "white", cursor: "pointer" }}>Apply</button>
            <button onClick={clearTextSelection} style={{ padding: "8px 10px", backgroundColor: "#444", border: "none", borderRadius: "8px", color: "white", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectPageDocumentPanel;