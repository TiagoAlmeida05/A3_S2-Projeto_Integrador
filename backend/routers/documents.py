from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import json

from database import get_db
import schemas
from repositories.document_repo import DocumentRepository
from repositories.project_repo import ProjectRepository

# Note the prefix includes the project_id!
router = APIRouter(
    prefix="/projects/{project_id}/documents",
    tags=["Documents"]
)

def get_doc_repo(db: Session = Depends(get_db)):
    return DocumentRepository(db)

def get_proj_repo(db: Session = Depends(get_db)):
    return ProjectRepository(db)


def document_to_dict(doc):
    try:
        metadata = json.loads(doc.metadata_json or "{}")
        if not isinstance(metadata, dict):
            metadata = {}
    except (TypeError, ValueError):
        metadata = {}

    return {
        "id": doc.id,
        "filename": doc.filename,
        "type": doc.type,
        "order_index": doc.order_index,
        "created_at": doc.created_at,
        "folder_id": doc.folder_id,
        "metadata": metadata,
    }

@router.get("/")
def get_project_documents(
    project_id: int,
    sort_by: str = "custom",
    sort_order: str = "asc",
    metadata_key: Optional[str] = None,
    metadata_value: Optional[str] = None,
    repo: DocumentRepository = Depends(get_doc_repo),
):
    documents = repo.get_by_project(project_id, sort_by=sort_by, sort_order=sort_order, metadata_key=metadata_key, metadata_value=metadata_value)
    return [document_to_dict(doc) for doc in documents]


@router.put("/reorder")
def reorder_documents(project_id: int, request: schemas.DocumentReorderRequest, repo: DocumentRepository = Depends(get_doc_repo)):
    repo.reorder(project_id, request.documents)
    return {"message": "Documents reordered"}

@router.get("/{document_id}")
def get_document(project_id: int, document_id: int, repo: DocumentRepository = Depends(get_doc_repo)):
    doc = repo.get_by_id(project_id, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    document = document_to_dict(doc)
    document["content"] = doc.content
    return document


@router.get("/{document_id}/file")
def get_document_file(project_id: int, document_id: int, repo: DocumentRepository = Depends(get_doc_repo), proj_repo: ProjectRepository = Depends(get_proj_repo)):
    doc = repo.get_by_id(project_id, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    project = proj_repo.get_by_id(project_id)
    if not project or not project.local_path:
        raise HTTPException(status_code=404, detail="No stored file found for this document")

    file_path = os.path.join(project.local_path, doc.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Stored file not found")

    media_type = "application/pdf" if doc.filename.lower().endswith(".pdf") else "application/octet-stream"
    # Serve PDFs inline so the browser can preview them instead of forcing a download.
    # For non-PDFs we keep the attachment disposition.
    headers = {}
    if media_type == "application/pdf":
        headers["Content-Disposition"] = f'inline; filename="{doc.filename}"'
    else:
        headers["Content-Disposition"] = f'attachment; filename="{doc.filename}"'
    return FileResponse(file_path, media_type=media_type, headers=headers)

@router.post("/")
async def upload_documents(
    project_id: int, 
    files: List[UploadFile] = File(...), 
    doc_repo: DocumentRepository = Depends(get_doc_repo),
    proj_repo: ProjectRepository = Depends(get_proj_repo)
):
    project = proj_repo.get_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ALLOWED_EXTENSIONS = {".txt", ".md", ".rtf", ".pdf", ".docx", ".odt"}
    successful_uploads = []
    failed_uploads = []
    
    for file in files:
        _, ext = os.path.splitext(file.filename)
        if ext.lower() not in ALLOWED_EXTENSIONS:
           failed_uploads.append({"filename": file.filename, "reason": "Unsupported file type"})
           continue
        
        try:
            content = await file.read()
            file_type = ext.lower().lstrip(".") or "text"
            text_content = ""

            # File Parsing Logic
            if ext.lower() in {".txt", ".md", ".rtf"}:
                text_content = content.decode("utf-8").replace("\r\n", "\n").replace("\r", "\n")
            elif ext.lower() == ".pdf":
                from PyPDF2 import PdfReader
                import io
                pdf_reader = PdfReader(io.BytesIO(content))
                text_content = "\n".join(page.extract_text() or "" for page in pdf_reader.pages)
            elif ext.lower() == ".docx":
                import io
                from docx import Document as DocxDocument
                doc = DocxDocument(io.BytesIO(content))
                text_content = "\n".join([p.text for p in doc.paragraphs])
            elif ext.lower() == ".odt":
                import io
                from odf.opendocument import load
                from odf.text import P
                odt_doc = load(io.BytesIO(content))
                paragraphs = odt_doc.getElementsByType(P)
                text_content = "\n".join([str(p) for p in paragraphs])

            # Save physical file if local path exists
            if project.local_path:
                os.makedirs(project.local_path, exist_ok=True)
                physical_file_path = os.path.join(project.local_path, file.filename)
                with open(physical_file_path, "wb") as f:
                    f.write(content)

            # Use repository to save to database
            doc_repo.create(project_id, file.filename, text_content, file_type)
            successful_uploads.append(file.filename)

        except Exception as e:
            failed_uploads.append({"filename": file.filename, "reason": str(e)})
            
    return {"message": f"Uploaded {len(successful_uploads)} files!", "successful": successful_uploads, "failed": failed_uploads}

@router.post("/create")
def create_text_document(
    project_id: int, 
    doc_data: schemas.DocumentCreateText, 
    doc_repo: DocumentRepository = Depends(get_doc_repo),
    proj_repo: ProjectRepository = Depends(get_proj_repo)
):
    project = proj_repo.get_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    filename = doc_data.name.strip()
    if not filename.lower().endswith(".txt"):
        filename += ".txt"
        
    new_doc = doc_repo.create(project_id, filename, doc_data.content, "text")

    if project.local_path:
        os.makedirs(project.local_path, exist_ok=True)
        physical_file_path = os.path.join(project.local_path, filename)
        try:
            with open(physical_file_path, "w", encoding="utf-8") as f:
                f.write(doc_data.content)
        except Exception as e:
            print(f"Warning: Could not save physical file: {e}")
    
    return document_to_dict(new_doc)

@router.delete("/{document_id}")
def delete_document(project_id: int, document_id: int, repo: DocumentRepository = Depends(get_doc_repo)):
    success = repo.delete(project_id, document_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted successfully"}

@router.put("/{document_id}/move")
def move_document(
    project_id: int, 
    document_id: int, 
    folder_id: Optional[str] = None, # Accept string format temporarily for parsing compatibility
    repo: DocumentRepository = Depends(get_doc_repo)
):
    # If the frontend passes an empty string folder_id='', turn it back into an actual Python None
    parsed_folder_id = None
    if folder_id and folder_id.strip() != "" and folder_id.lower() != "null":
        try:
            parsed_folder_id = int(folder_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid folder ID format")

    doc = repo.move_to_folder(project_id, document_id, parsed_folder_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Moved successfully"}


@router.put("/{document_id}/content")
def update_document_content(project_id: int, document_id: int, doc_update: schemas.DocumentUpdateContent, repo: DocumentRepository = Depends(get_doc_repo)):
    doc = repo.update_content(project_id, document_id, doc_update.content)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document updated successfully"}


@router.put("/{document_id}/metadata")
def update_document_metadata(project_id: int, document_id: int, metadata_update: schemas.DocumentMetadataUpdate, repo: DocumentRepository = Depends(get_doc_repo)):
    doc = repo.update_metadata(project_id, document_id, metadata_update.metadata)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return document_to_dict(doc)

@router.put("/{document_id}/rename")
def rename_document(project_id: int, document_id: int, doc_update: schemas.DocumentRename, repo: DocumentRepository = Depends(get_doc_repo)):
    filename = doc_update.filename.strip()
    if not filename:
        raise HTTPException(status_code=400, detail="Document name cannot be empty")

    existing_doc = repo.get_by_filename(project_id, filename, exclude_document_id=document_id)
    if existing_doc:
        raise HTTPException(status_code=409, detail="A document with that name already exists in this project")

    doc = repo.update_filename(project_id, document_id, filename)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return {"id": doc.id, "filename": doc.filename, "type": doc.type, "created_at": doc.created_at, "folder_id": doc.folder_id}