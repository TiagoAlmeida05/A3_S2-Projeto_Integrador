import CollisionModal from "./CollisionModal";
import ProjectPageCodePanel from "./ProjectPageCodePanel";
import ProjectPageDocumentPanel from "./ProjectPageDocumentPanel";
import ProjectPageSidebar from "./ProjectPageSidebar";
import ProjectPageTopBar from "./ProjectPageTopBar";
import ProjectSettingsModal from "./ProjectSettingsModal";

const ProjectPageView = ({ page }) => {
  const {
    id,
    API_BASE,
    projectDetails,
    conflictDialog,
    handleSaveSettings,
    handleDeleteProject,
    isSettingsOpen,
    setIsSettingsOpen,
    viewerRef,
    documents,
    activeDocument,
    documentSegments,
    projectCodes,
    codeSegments,
    codePanelOpen,
    activeCode,
    pendingQuoteJump,
    activeTab,
    uploadStatus,
    uploadProgress,
    segmentContextMenu,
    setActiveTab,
    setActiveDocument,
    setCodePanelOpen,
    setActiveCode,
    setProjectCodes,
    setCodeSegments,
    setPendingQuoteJump,
    setUploadStatus,
    setDocumentSegments,
    fetchCodes,
    handleFileUpload,
    handleDocumentClick,
    handleDeleteDocument,
    handleDeleteCode,
    openCodePanel,
    handleExportREFI,
    setSegmentContextMenu,
  } = page;

  return (
    <div
      style={{
        padding: 0,
        margin: 0,
        fontFamily: "sans-serif",
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        boxSizing: "border-box",
      }}
    >
      <ProjectPageTopBar
        projectDetails={projectDetails}
        handleExportREFI={handleExportREFI}
        setIsSettingsOpen={setIsSettingsOpen}
      />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <ProjectPageSidebar
          id={id}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          documents={documents}
          activeDocument={activeDocument}
          uploadStatus={uploadStatus}
          uploadProgress={uploadProgress}
          handleFileUpload={handleFileUpload}
          handleDocumentClick={handleDocumentClick}
          handleDeleteDocument={handleDeleteDocument}
          projectCodes={projectCodes}
          handleDeleteCode={handleDeleteCode}
          fetchCodes={fetchCodes}
          openCodePanel={openCodePanel}
          setProjectCodes={setProjectCodes}
        />
        <ProjectPageCodePanel
          API_BASE={API_BASE}
          projectId={id}
          projectCodes={projectCodes}
          codePanelOpen={codePanelOpen}
          activeCode={activeCode}
          codeSegments={codeSegments}
          setCodePanelOpen={setCodePanelOpen}
          setActiveCode={setActiveCode}
          setCodeSegments={setCodeSegments}
          setActiveDocument={setActiveDocument}
          setDocumentSegments={setDocumentSegments}
          setPendingQuoteJump={setPendingQuoteJump}
          fetchCodes={fetchCodes}
        />
        <ProjectPageDocumentPanel
          viewerRef={viewerRef}
          activeDocument={activeDocument}
          projectCodes={projectCodes}
          documentSegments={documentSegments}
          setUploadStatus={setUploadStatus}
          setDocumentSegments={setDocumentSegments}
          setActiveDocument={setActiveDocument}
          fetchCodes={fetchCodes}
          API_BASE={API_BASE}
          projectId={id}
        />
      </div>

      <CollisionModal
        dialog={conflictDialog}
        resolve={conflictDialog.resolve}
      />
      <ProjectSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentName={projectDetails.name}
        currentDescription={projectDetails.description}
        currentLocalPath={projectDetails.localPath}
        onSave={handleSaveSettings}
        onDelete={handleDeleteProject}
      />
    </div>
  );
};

export default ProjectPageView;
