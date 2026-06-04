import CodeSidebar from "./CodeSidebar";
import DocumentSidebar from "./DocumentSidebar";
import MemosTab from "./MemosTab";

const ProjectPageSidebar = ({
  id,
  activeTab,
  setActiveTab,
  documents,
  activeDocument,
  uploadStatus,
  uploadProgress,
  handleFileUpload,
  handleDocumentClick,
  handleDeleteDocument,
  handleRenameDocument,
  projectCodes,
  handleDeleteCode,
  fetchCodes,
  fetchDocuments,
  openCodePanel,
  setProjectCodes,
  handleCreateTextDocument,
  handleExportQuotesCSV,
}) => {

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
      }}
    >
      <div
        style={{
          width: "60px",
          backgroundColor: "#111",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: "20px",
          borderRight: "1px solid #333",
          borderTop: "1px solid #333",
        }}
      >
        <button
          onClick={() => setActiveTab("documents")}
          style={{
            backgroundColor: "transparent",
            border: "none",
            fontSize: "24px",
            cursor: "pointer",
            padding: "10px",
            opacity: activeTab === "documents" ? 1 : 0.4,
            borderLeft:
              activeTab === "documents"
                ? "3px solid #646cff"
                : "3px solid transparent",
          }}
          title="Documents"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M3 8.2C3 7.07989 3 6.51984 3.21799 6.09202C3.40973 5.71569 3.71569 5.40973 4.09202 5.21799C4.51984 5 5.0799 5 6.2 5H9.67452C10.1637 5 10.4083 5 10.6385 5.05526C10.8425 5.10425 11.0376 5.18506 11.2166 5.29472C11.4184 5.4184 11.5914 5.59135 11.9373 5.93726L12.0627 6.06274C12.4086 6.40865 12.5816 6.5816 12.7834 6.70528C12.9624 6.81494 13.1575 6.89575 13.3615 6.94474C13.5917 7 13.8363 7 14.3255 7H17.8C18.9201 7 19.4802 7 19.908 7.21799C20.2843 7.40973 20.5903 7.71569 20.782 8.09202C21 8.51984 21 9.0799 21 10.2V15.8C21 16.9201 21 17.4802 20.782 17.908C20.5903 18.2843 20.2843 18.5903 19.908 18.782C19.4802 19 18.9201 19 17.8 19H6.2C5.07989 19 4.51984 19 4.09202 18.782C3.71569 18.5903 3.40973 18.2843 3.21799 17.908C3 17.4802 3 16.9201 3 15.8V8.2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={() => setActiveTab("codes")}
          style={{
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "10px",
            marginTop: "10px",
            opacity: activeTab === "codes" ? 1 : 0.4,
            borderLeft: activeTab === "codes" ? "3px solid #646cff" : "3px solid transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Codes"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none">
            <path d="M7.0498 7.0498H7.0598M10.5118 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V10.5118C3 11.2455 3 11.6124 3.08289 11.9577C3.15638 12.2638 3.27759 12.5564 3.44208 12.8249C3.6276 13.1276 3.88703 13.387 4.40589 13.9059L9.10589 18.6059C10.2939 19.7939 10.888 20.388 11.5729 20.6105C12.1755 20.8063 12.8245 20.8063 13.4271 20.6105C14.112 20.388 14.7061 19.7939 15.8941 18.6059L18.6059 15.8941C19.7939 14.7061 20.388 14.112 20.6105 13.4271C20.8063 12.8245 20.8063 12.1755 20.6105 11.5729C20.388 10.888 19.7939 10.2939 18.6059 9.10589L13.9059 4.40589C13.387 3.88703 13.1276 3.6276 12.8249 3.44208C12.5564 3.27759 12.2638 3.15638 11.9577 3.08289C11.6124 3 11.2455 3 10.5118 3ZM7.5498 7.0498C7.5498 7.32595 7.32595 7.5498 7.0498 7.5498C6.77366 7.5498 6.5498 7.32595 6.5498 7.0498C6.5498 6.77366 6.77366 6.5498 7.0498 6.5498C7.32595 6.5498 7.5498 6.77366 7.5498 7.0498Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={() => setActiveTab("memos")}
          style={{
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "10px",
            marginTop: "10px",
            opacity: activeTab === "memos" ? 1 : 0.4,
            borderLeft: activeTab === "memos" ? "3px solid #646cff" : "3px solid transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Memos"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M8 9h8M8 13h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          padding: "20px",
          backgroundColor: "#1a1a1a",
          overflowY: "auto",
        }}
      >
        {activeTab === "documents" && (
          <DocumentSidebar
            documents={documents}
            activeDocumentId={activeDocument?.id}
            uploadStatus={uploadStatus}
            uploadProgress={uploadProgress}
            onFileUpload={handleFileUpload}
            onDocumentClick={handleDocumentClick}
            onDeleteDocument={handleDeleteDocument}
            onRenameDocument={handleRenameDocument}
            projectId={id}
            onWriteDocument={handleCreateTextDocument}
            fetchDocuments={fetchDocuments}
          />
        )}
        {activeTab === "codes" && (
          <CodeSidebar
            projectId={id}
            codes={projectCodes}
            onDeleteCode={handleDeleteCode}
            onRefreshCodes={fetchCodes}
            onOpenCodePanel={openCodePanel}
            onReorderCodes={setProjectCodes}
            onExportQuotesCSV={handleExportQuotesCSV}
          />
        )}
        {activeTab === "memos" && <MemosTab projectId={id} codes={projectCodes} />}
      </div>
    </div>
  );
};

export default ProjectPageSidebar;