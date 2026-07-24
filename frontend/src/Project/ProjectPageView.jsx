import CollisionModal from "./CollisionModal";
import ProjectPageCodePanel from "./ProjectPageCodePanel";
import ProjectPageDocumentPanel from "./ProjectPageDocumentPanel";
import ProjectPageSidebarPanel from "./ProjectPageSidebarPanel";
import ProjectPageTopBar from "./ProjectPageTopBar";
import ProjectSettingsModal from "./ProjectSettingsModal";
// V4 Imports
import { Group, Panel, Separator } from "react-resizable-panels";

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
    codePanelRefreshTick,
    setActiveTab,
    setActiveDocument,
    setCodePanelOpen,
    setActiveCode,
    setProjectCodes,
    setCodeSegments,
    setPendingQuoteJump,
    setUploadStatus,
    setDocumentSegments,
    loadCodes,
    loadDocuments,
    handleFileUpload,
    handleDocumentClick,
    handleDeleteDocument,
    handleRenameDocument,
    handleDeleteCode,
    openCodePanel,
    handleExportREFI,
    setSegmentContextMenu,
    handleCreateTextDocument,
    pushUndoAction,
    handleExportQuotesCSV,
    handleExportExcel,
    setIsExportModalOpen,
    searchResults,
    currentSearchResult,
    setSearchResults,
    setCurrentSearchResult,
    handleSearchResultClick,
    
  } = page;

  const handleStyle = {
    width: "1px",
    backgroundColor: "#333",
    cursor: "col-resize",
  };

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
        handleExportExcel={handleExportExcel}
        setIsExportModalOpen={setIsExportModalOpen}
        projectId={id}
        onSearchResults={setSearchResults}
        onSearchResultClick={handleSearchResultClick}
      />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* V4 syntax: Group and orientation */}
        <Group orientation="horizontal" autoSaveId="project-page-layout">
          
          <Panel defaultSize={28} minSize={20}>
            <ProjectPageSidebarPanel
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
              handleRenameDocument={handleRenameDocument}
              projectCodes={projectCodes}
              handleDeleteCode={handleDeleteCode}
              loadCodes={loadCodes}
              loadDocuments={loadDocuments}
              openCodePanel={openCodePanel}
              setProjectCodes={setProjectCodes}
              handleCreateTextDocument={handleCreateTextDocument}
              handleExportQuotesCSV={handleExportQuotesCSV}
              handleExportExcel={handleExportExcel}
            />
          </Panel>

          {/* V4 syntax: Separator */}
          <Separator style={handleStyle} />

          {codePanelOpen && (
            <>
              <Panel defaultSize={30} minSize={20} style={{ minWidth: 0 }}>
                <ProjectPageCodePanel
                  projectId={id}
                  projectCodes={projectCodes}
                  documents={documents}
                  codePanelOpen={codePanelOpen}
                  activeCode={activeCode}
                  refreshToken={codePanelRefreshTick}
                  codeSegments={codeSegments}
                  setCodePanelOpen={setCodePanelOpen}
                  setActiveCode={setActiveCode}
                  setCodeSegments={setCodeSegments}
                  setActiveDocument={setActiveDocument}
                  setDocumentSegments={setDocumentSegments}
                  setPendingQuoteJump={setPendingQuoteJump}
                  loadCodes={loadCodes}
                  pushUndoAction={pushUndoAction}
                />
              </Panel>
              <Separator style={handleStyle} />
            </>
          )}

          <Panel defaultSize={codePanelOpen ? 42 : 72} minSize={30}>
            <ProjectPageDocumentPanel
              viewerRef={viewerRef}
              activeDocument={activeDocument}
              projectCodes={projectCodes}
              documentSegments={documentSegments}
              setUploadStatus={setUploadStatus}
              setDocumentSegments={setDocumentSegments}
              setActiveDocument={setActiveDocument}
              loadCodes={loadCodes}
              loadDocuments={loadDocuments}
              API_BASE={API_BASE}
              projectId={id}
              pushUndoAction={pushUndoAction}
              currentSearchResult={currentSearchResult}
              setCurrentSearchResult={setCurrentSearchResult}
        />
          </Panel>

        </Group>
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