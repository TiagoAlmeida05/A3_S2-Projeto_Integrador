from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import os

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

@router.get("/")
def get_project_documents(project_id: int, repo: DocumentRepository = Depends(get_doc_repo)):
    documents = repo.get_by_project(project_id)
    return [{"id": doc.id, "filename": doc.filename, "type": doc.type, "created_at": doc.created_at, "folder_id": doc.folder_id} for doc in documents]

@router.get("/{document_id}")
def get_document(project_id: int, document_id: int, repo: DocumentRepository = Depends(get_doc_repo)):
    doc = repo.get_by_id(project_id, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"id": doc.id, "filename": doc.filename, "type": doc.type, "content": doc.content}

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
    
    return {"id": new_doc.id, "filename": new_doc.filename, "type": new_doc.type}

@router.delete("/{document_id}")
def delete_document(project_id: int, document_id: int, repo: DocumentRepository = Depends(get_doc_repo)):
    success = repo.delete(project_id, document_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted successfully"}

@router.put("/{document_id}/move")
def move_document(project_id: int, document_id: int, folder_id: Optional[int] = None, repo: DocumentRepository = Depends(get_doc_repo)):
    doc = repo.move_to_folder(project_id, document_id, folder_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Moved successfully"}

@router.put("/{document_id}/content")
def update_document_content(project_id: int, document_id: int, doc_update: schemas.DocumentUpdateContent, repo: DocumentRepository = Depends(get_doc_repo)):
    doc = repo.update_content(project_id, document_id, doc_update.content)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document updated successfully"}

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