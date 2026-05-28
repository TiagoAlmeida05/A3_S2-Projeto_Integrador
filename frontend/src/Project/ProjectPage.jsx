import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ProjectPageView from "./ProjectPageView";
import { uploadProjectDataToDrive, uploadRawFileToDrive } from '../Utils/driveAPI';

import axios from "axios";

const API_BASE = "http://127.0.0.1:8000";

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

function ProjectPage() {
  const { id } = useParams();
  const viewerRef = useRef(null);
  const navigate = useNavigate();

  // STATE MANAGEMENT

  // Project & Document State
  const [projectDetails, setProjectDetails] = useState({
    name: "",
    description: "",
    localPath: "",
  });
  const [documents, setDocuments] = useState([]);
  const [activeDocument, setActiveDocument] = useState(null);
  const [documentSegments, setDocumentSegments] = useState([]);
  const [projectCodes, setProjectCodes] = useState([]);
  const [codePanelOpen, setCodePanelOpen] = useState(false);
  const [activeCode, setActiveCode] = useState(null);
  const [codeSegments, setCodeSegments] = useState([]);
  const [pendingQuoteJump, setPendingQuoteJump] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [codePanelRefreshTick, setCodePanelRefreshTick] = useState(0);

  // UI & Navigation State
  const [activeTab, setActiveTab] = useState("documents");
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadProgress, setUploadProgress] = useState({
    current: 0,
    total: 0,
    isActive: false,
  });
  const [segmentContextMenu, setSegmentContextMenu] = useState(null);


  //  File Upload Conflict State
  const [conflictDialog, setConflictDialog] = useState({
    isOpen: false,
    filename: "",
    suggestedName: "",
    resolve: null,
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const fetchProjectDetails = () => {
    fetch(`http://127.0.0.1:8000/projects/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.name) {
          setProjectDetails({
            name: data.name,
            description: data.description || "",
            localPath: data.local_path || "",
          });
        }
      })
      .catch((err) => console.error(err));
  };

  const fetchDocuments = () => {
    fetch(`${API_BASE}/projects/${id}/documents/`)
      .then((res) => res.json())
      .then((data) => setDocuments(data))
      .catch((err) => console.error(err));
  };

  const fetchCodes = () => {
    fetch(`${API_BASE}/projects/${id}/codes`)
      .then((res) => res.json())
      .then((data) => setProjectCodes(data))
      .catch((err) => console.error(err));
  };

  const pushUndoAction = (action) => {
    setUndoStack((prev) => [action, ...prev].slice(0, 20));
  };

  const fetchAllDocumentSegments = async () => {
    const segmentResponses = await Promise.all(
      documents.map((doc) =>
        fetch(`${API_BASE}/projects/${id}/segments?document_id=${doc.id}`).then((res) => res.json()),
      ),
    );

    return segmentResponses.flat().filter((segment) => segment && !segment.detail);
  };

  const buildCodeTreeSnapshot = (rootCodeId) => {
    const rootCode = projectCodes.find((code) => Number(code.id) === Number(rootCodeId));
    if (!rootCode) return [];

    const collected = [rootCode];

    const visitChildren = (parentId, depth) => {
      const children = projectCodes.filter((code) => Number(code.parent_id) === Number(parentId));
      children.forEach((child) => {
        collected.push({ ...child, _undoDepth: depth });
        visitChildren(child.id, depth + 1);
      });
    };

    visitChildren(rootCodeId, 1);
    return collected;
  };

  const refreshSegmentsForDocument = async (documentId) => {
    if (!activeDocument || Number(activeDocument.id) !== Number(documentId)) return;

    const res = await fetch(`${API_BASE}/projects/${id}/segments?document_id=${documentId}`);
    const data = await res.json();
    setDocumentSegments(Array.isArray(data) ? data : []);
  };

  const handleUndoLastAction = async () => {
    if (undoStack.length === 0) {
      setUploadStatus("Nothing to undo.");
      setTimeout(() => setUploadStatus(""), 2000);
      return;
    }

    const [lastAction, ...remainingActions] = undoStack;
    setUndoStack(remainingActions);
    setUploadStatus("Undoing last action...");

    try {
      if (lastAction.type === "create-segment" || lastAction.type === "create-quick-code") {
        for (const segment of lastAction.segments || []) {
          await fetch(`${API_BASE}/projects/${id}/segments/${segment.id}`, { method: "DELETE" });
          await refreshSegmentsForDocument(segment.document_id);
        }

        if (lastAction.type === "create-quick-code" && lastAction.code?.id) {
          await fetch(`${API_BASE}/projects/${id}/codes/${lastAction.code.id}`, { method: "DELETE" });
        }

        fetchCodes();
        setCodePanelRefreshTick((tick) => tick + 1);
      } else if (lastAction.type === "delete-segment") {
        const segment = lastAction.segment;
        const restoreResponse = await fetch(`${API_BASE}/projects/${id}/segments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            document_id: segment.document_id,
            code_id: segment.code_id,
            start_char: segment.start_char,
            end_char: segment.end_char,
            content: segment.content,
          }),
        });

        if (!restoreResponse.ok) {
          throw new Error("Failed to restore segment");
        }

        await refreshSegmentsForDocument(segment.document_id);
        fetchCodes();
        setCodePanelRefreshTick((tick) => tick + 1);
      } else if (lastAction.type === "delete-code") {
        const restoredCodeIds = new Map();
        const orderedCodes = [...(lastAction.codes || [])].sort(
          (a, b) => (a._undoDepth ?? 0) - (b._undoDepth ?? 0),
        );

        for (const code of orderedCodes) {
          const restoredParentId = code.parent_id && restoredCodeIds.has(Number(code.parent_id))
            ? restoredCodeIds.get(Number(code.parent_id))
            : code.parent_id;

          const restoreResponse = await fetch(`${API_BASE}/projects/${id}/codes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: code.name,
              color: code.color,
              description: code.description,
              parent_id: restoredParentId,
            }),
          });

          if (!restoreResponse.ok) {
            throw new Error(`Failed to restore code ${code.name}`);
          }

          const restoredCode = await restoreResponse.json();
          restoredCodeIds.set(Number(code.id), restoredCode.id);
        }

        if (lastAction.codes?.length > 0) {
          const reorderPayload = orderedCodes
            .map((code, index) => ({
              id: restoredCodeIds.get(Number(code.id)),
              parent_id: code.parent_id && restoredCodeIds.has(Number(code.parent_id))
                ? restoredCodeIds.get(Number(code.parent_id))
                : code.parent_id,
              order_index: code.order_index ?? index,
            }))
            .filter((item) => item.id);

          await fetch(`${API_BASE}/projects/${id}/codes/reorder`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ codes: reorderPayload }),
          });
        }

        for (const segment of lastAction.segments || []) {
          const restoredCodeId = restoredCodeIds.get(Number(segment.code_id)) || segment.code_id;
          const restoreResponse = await fetch(`${API_BASE}/projects/${id}/segments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              document_id: segment.document_id,
              code_id: restoredCodeId,
              start_char: segment.start_char,
              end_char: segment.end_char,
              content: segment.content,
            }),
          });

          if (!restoreResponse.ok) {
            throw new Error("Failed to restore segment");
          }

          await refreshSegmentsForDocument(segment.document_id);
        }

        fetchCodes();
        setCodePanelRefreshTick((tick) => tick + 1);
      }

      setUploadStatus("Undo complete.");
      setTimeout(() => setUploadStatus(""), 2500);
    } catch (error) {
      console.error(error);
      setUploadStatus("Undo failed.");
    }
  };

  const openCodePanel = async (code) => {
    setActiveCode(code);
    setCodePanelOpen(true);
    setPendingQuoteJump(null);

    try {
      // Fetch segments for every document we know exists
      const segmentPromises = documents.map((doc) =>
        fetch(`${API_BASE}/projects/${id}/segments?document_id=${doc.id}`).then((res) => res.json())
      );
      
      const segmentsArrays = await Promise.all(segmentPromises);
      
      // Flatten into one giant array and filter by the selected code using Number() casting
      const allSegments = segmentsArrays.flat().filter(s => s && !s.detail);
      setCodeSegments(allSegments.filter((s) => Number(s.code_id) === Number(code.id)));
    } catch (err) {
      console.error("Failed to load code segments:", err);
      setCodeSegments([]);
    }
  };
  const handleDocumentClick = (docId) => {
    fetch(`${API_BASE}/projects/${id}/documents/${docId}`)
      .then((res) => res.json())
      .then((data) => setActiveDocument(data))
      .catch((err) => console.error("Failed to fetch document content:", err));

    // Fetch segments for this document
    fetch(`${API_BASE}/projects/${id}/segments?document_id=${docId}`)
      .then((res) => res.json())
      .then((data) => setDocumentSegments(data))
      .catch((err) => console.error("Failed to fetch segments:", err));
  };

  const scrollToQuote = (quoteId) => {
    if (!viewerRef.current) return;
    const element = viewerRef.current.querySelector(
      `[data-segment-ids~="${quoteId}"]`,
    );
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  useEffect(() => {
    if (
      !pendingQuoteJump ||
      !activeDocument ||
      pendingQuoteJump.document_id !== activeDocument.id
    )
      return;
    scrollToQuote(pendingQuoteJump.quoteId);
    setPendingQuoteJump(null);
  }, [activeDocument, documentSegments, pendingQuoteJump]);

  useEffect(() => {
    fetchDocuments();
    fetchProjectDetails();
    fetchCodes();
  }, [id]);

  useEffect(() => {
    const lockFileId = localStorage.getItem('current_project_lock_id');
    const token = localStorage.getItem('google_drive_tokens');

    if (lockFileId && token && window.electronAPI?.registerEmergencyLock) {
      window.electronAPI.registerEmergencyLock(lockFileId, token);
    }

    return () => {
      if(window.electronAPI?.clearEmergencyLock) {
        window.electronAPI.clearEmergencyLock();
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const isUndoShortcut = (event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z";
      if (!isUndoShortcut) return;

      const target = event.target;
      const isEditableTarget = target && (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      );

      if (isEditableTarget) return;

      event.preventDefault();
      handleUndoLastAction();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undoStack, activeDocument, documents, projectCodes]);

  const autoSyncToCloud = async () => {
    const folderId = localStorage.getItem('current_project_folder_id');
    const isConnected = localStorage.getItem('google_drive_tokens');

    if(!isConnected || !folderId) return;

    setUploadStatus("Saving to cloud... ☁️");

    try {
      const [docsList, codesRes, segmentsRes] = await Promise.all([
        fetch(`${API_BASE}/projects/${id}/documents/`).then(res => res.json()),
        fetch(`${API_BASE}/projects/${id}/codes`).then(res => res.json()),
        fetch(`${API_BASE}/projects/${id}/segments`).then(res => res.json()),
      ]);

      const fullDocs = await Promise.all(docsList.map(doc => 
          fetch(`${API_BASE}/projects/${id}/documents/${doc.id}`).then(res => res.json())
      ));

      const fullProjectData = {
        details: projectDetails,
        documents: fullDocs,
        codes: codesRes,
        segments: segmentsRes,
        last_synced: new Date().toISOString()
      };

      await uploadProjectDataToDrive(folderId, fullProjectData);
      setUploadStatus("Syncing source files... 📁");
      for (const doc of docsList) {
        try {
          const fileResponse = await fetch(`${API_BASE}/projects/${id}/documents/${doc.id}/download`);

          if(fileResponse.ok){
            const fileBlob = await fileResponse.blob();
            await uploadRawFileToDrive(folderId, doc.filename, fileBlob);
          } else {
            console.error(`Backend refused to download ${doc.filename}: HTTP ${fileResponse.status}`);     
          }
        } catch (fileErr) {
          console.error(`Failed to sync file ${doc.filename}:`, fileErr);
        }
      }

      console.log("Auto-sync successful!");
      setUploadStatus("Cloud sync complete! ✅");
      setTimeout(() => setUploadStatus(""), 3000);
    } catch (err) {
      console.error("Auto-sync failed:", err);
      setUploadStatus("❌ Failed to sync to cloud.");
      setTimeout(() => setUploadStatus(""), 4000);
    }
  };

  const handleDeleteCode = async (codeId) => {
    try {
      const codeSnapshot = buildCodeTreeSnapshot(codeId);
      const codeIdsToDelete = new Set(codeSnapshot.map((code) => Number(code.id)));
      const segmentsSnapshot = codeSnapshot.length > 0
        ? (await fetchAllDocumentSegments()).filter((segment) => codeIdsToDelete.has(Number(segment.code_id)))
        : [];

      const response = await fetch(
        `${API_BASE}/projects/${id}/codes/${codeId}`,
        { method: "DELETE" },
      );
      if (response.ok) {
        setProjectCodes((prev) => prev.filter((c) => c.id !== codeId));
        setDocumentSegments((prev) => prev.filter((s) => s.code_id !== codeId));
        if (codeSnapshot.length > 0) {
          pushUndoAction({
            type: "delete-code",
            codes: codeSnapshot,
            segments: segmentsSnapshot,
          });
        }
        setCodePanelRefreshTick((tick) => tick + 1);
      } else {
        console.error("Failed to delete code");
      }
    } catch (error){
      console.error("Error deleting code:", error);
    }
  };

  // FILE MANAGEMENT LOGIC

  const handleFileUpload = async (eventOrFiles) => {
    const files = Array.isArray(eventOrFiles)
      ? eventOrFiles
      : Array.from(eventOrFiles?.target?.files || []);
    if (files.length === 0) return;

    setUploadStatus("Checking files...");
    setUploadProgress({ current: 0, total: 0, isActive: false });

    let existingNames = documents.map((doc) => doc.filename);
    const filesToUpload = [];

    for (let i = 0; i < files.length; i++) {
      let cur = files[i];
      let shouldUpload = true;
      let finalName = cur.name;
      let isNameValid = !existingNames.includes(finalName);

      while (!isNameValid && shouldUpload) {
        const DotIndex = finalName.lastIndexOf(".");
        const ext = DotIndex !== -1 ? finalName.substring(DotIndex) : "";
        const base =
          DotIndex !== -1 ? finalName.substring(0, DotIndex) : finalName;
        const suggestedN = `${base}_copy${ext}`;

        const userChoice = await new Promise((resolve) => {
          setConflictDialog({
            isOpen: true,
            filename: finalName,
            suggestedName: suggestedN,
            resolve,
          });
        });

        if (userChoice.action === "skip") {
          shouldUpload = false;
          break;
        } else if (userChoice.action === "replace") {
          const oldDoc = documents.find((d) => d.filename === finalName);
          if (oldDoc) {
            setUploadStatus(`Replacing ${finalName}...`);
            try {
              const delRes = await fetch(
                `${API_BASE}/projects/${id}/documents/${oldDoc.id}`,
                { method: "DELETE" },
              );
              if (delRes.ok) {
                isNameValid = true;
                if (activeDocument && activeDocument.id === oldDoc.id)
                  setActiveDocument(null);
                existingNames = existingNames.filter((n) => n !== finalName);
              } else {
                window.alert("Server failed to delete. Skipping.");
                shouldUpload = false;
              }
            } catch (err) {
              window.alert("❌ Network error. Skipping.");
              shouldUpload = false;
            }
          }
        } else if (userChoice.action === "rename") {
          let trimmedInput = userChoice.value.trim();
          if (trimmedInput === "") continue;

          if (ext && !trimmedInput.toLowerCase().endsWith(ext.toLowerCase())) {
            trimmedInput += ext;
          }
          finalName = trimmedInput;
          if (!existingNames.includes(finalName)) isNameValid = true;
        }
      }

      if (shouldUpload) {
        if (finalName !== cur.name) {
          cur = new File([cur], finalName, { type: cur.type });
        }
        filesToUpload.push(cur);
        existingNames.push(finalName);
      }
    }

    setConflictDialog((prev) => ({ ...prev, isOpen: false }));

    if (filesToUpload.length === 0) {
      setUploadStatus("Upload cancelled. No files were added.");
      event.target.value = null;
      return;
    }

    const total = filesToUpload.length;
    const successfulUploads = [];
    const failedUploads = [];

    setUploadProgress({ current: 0, total, isActive: true });
    setUploadStatus(`Importing ${total} file${total === 1 ? "" : "s"}...`);

    const formData = new FormData();
    filesToUpload.forEach((file) => formData.append("files", file));

    try {
      const res = await fetch(`${API_BASE}/projects/${id}/documents/`, {
        method: "POST",
        body: formData,
      });

      setUploadProgress({ current: total, total, isActive: false });

      if (!res.ok) {
        failedUploads.push({
          filename: filesToUpload.map((file) => file.name).join(", "),
          reason: `HTTP ${res.status}`,
        });
      } else {
        const data = await res.json();
        if (data.failed && data.failed.length > 0) {
          failedUploads.push(...data.failed);
        }
        if (data.successful && data.successful.length > 0) {
          successfulUploads.push(...data.successful);
        }
      }
    } catch (err) {
      setUploadProgress({ current: total, total, isActive: false });
      failedUploads.push({ filename: "Batch upload", reason: "Network error" });
      console.error(err);
    }

    if (failedUploads.length > 0) {
      const errorList = failedUploads
        .map((f) => `${f.filename} (${f.reason})`)
        .join(", ");
      if (successfulUploads.length > 0) {
        setUploadStatus(
          `Uploaded ${successfulUploads.length} files. Failed: ${errorList}`,
        );
      } else {
        setUploadStatus(`All uploads failed: ${errorList}`);
      }
    } else {
      setUploadStatus(`Upload complete! ${successfulUploads.length} files imported.`);
      setTimeout(() => setUploadStatus(""), 3000);
    }

    fetchDocuments();

    if (eventOrFiles?.target) {
      eventOrFiles.target.value = null;
    }
  };

  const handleCreateTextDocument = async (docdata) => {
    const newDoc = {
      id: "NEW_DOC_PENDING",
      filename: "Untitled Document",
      content: "",
      type: "text",
      folder_id: null
    };
    setDocumentSegments([]);
    setActiveDocument(newDoc);
  };

  const handleDeleteDocument = async (docId, docName) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${docName}"? This cannot be undone.`,
    );
    if (!confirmDelete) return;

    try {
      const response = await fetch(
        `${API_BASE}/projects/${id}/documents/${docId}`,
        { method: "DELETE" },
      );

      if (response.ok) {
        setDocuments((prevDocs) => prevDocs.filter((doc) => doc.id !== docId));
        if (activeDocument && activeDocument.id === docId) {
          setActiveDocument(null);
          setDocumentSegments([]);
        }

        setUploadStatus(`Deleted ${docName}`);
        setTimeout(() => setUploadStatus(""), 3000);
      } else {
        setUploadStatus("Failed to delete document.");
      }
    } catch (err) {
      console.error(err);
      setUploadStatus("Server error during deletion.");
    }
  };

  useEffect(() => {
    const handleClickOutside = () => setSegmentContextMenu(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const handleSaveSettings = async (newName, newDescription) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, description: newDescription }),
      });

      if (res.ok) {
        setProjectDetails({ name: newName, description: newDescription }); // Update the UI instantly
        setIsSettingsOpen(false); // Close the modal
      } else {
        alert("Failed to update project settings.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProject = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/projects/${id}`, { method: 'DELETE' });
      if(response.ok) {
        navigate('/');
      } else {
        alert("Failed to delete project.");
      }
    } catch (err) {
      console.error(err);
      alert("Server error during project deletion.")
    }
  };

  const handleExportREFI = async () => {
    setUploadStatus("Generating REFI-QDA export...");

    try {
      const response = await fetch(`${API_BASE}/projects/${id}/export/refi`);
      if (!response.ok) throw new Error("Failed to generate export");
      const blob = await response.blob();

      if (window.showSaveFilePicker) {
        try {
          //pauses JavaScript until the user picks a folder
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: `${projectDetails.name.replace(/ /g, "_")}.qdpx`,
            types: [
              {
                description: "REFI-QDA Project Package",
                accept: { "application/zip": [".qdpx"] },
              },
            ],
          });

          // Once they pick a folder, we write the file directly to their hard drive
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          setUploadStatus("Export saved successfully!");
          setTimeout(() => setUploadStatus(""), 4000);
        } catch (pickerError) {
          if (pickerError.name === "AbortError") {
            setUploadStatus("");
            return;
          }
          throw pickerError;
        }
      } else {
        //for older browsers
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `${projectDetails.name.replace(/ /g, "_")}.qdpx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);

        setUploadStatus(" Export ready for download!");
        setTimeout(() => setUploadStatus(""), 4000);
      }
    } catch (error) {
      console.error(error);
      setUploadStatus(" Export failed.");
      setTimeout(() => setUploadStatus(""), 4000);
    }
  };

  const page = {
    id,
    API_BASE,
    navigate,
    viewerRef,
    projectDetails,
    documents,
    activeDocument,
    documentSegments,
    projectCodes,
    codePanelOpen,
    activeCode,
    codeSegments,
    pendingQuoteJump,
    codePanelRefreshTick,
    activeTab,
    uploadStatus,
    uploadProgress,
    segmentContextMenu,
    conflictDialog,
    isSettingsOpen,
    pushUndoAction,
    setActiveTab,
    setActiveDocument,
    setIsSettingsOpen,
    setProjectCodes,
    setCodePanelOpen,
    setActiveCode,
    setCodeSegments,
    setPendingQuoteJump,
    setUploadStatus,
    setDocumentSegments,
    handleFileUpload,
    handleDocumentClick,
    handleDeleteDocument,
    handleDeleteCode,
    fetchCodes,
    fetchDocuments,
    openCodePanel,
    handleSaveSettings,
    handleDeleteProject,
    handleExportREFI,
    handleCreateTextDocument,
    autoSyncToCloud,
  };

  return <ProjectPageView page={page} />;
}

export default ProjectPage;