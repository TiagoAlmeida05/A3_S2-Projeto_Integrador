from typing import Optional, List
from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel

import xml.etree.ElementTree as ET
import uuid
from fastapi.responses import Response

import zipfile
import io
import os
import models
from database import engine, get_db
import tkinter as tk
from tkinter import filedialog

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    local_path: Optional[str] = None

class ProjectResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    local_path: Optional[str] = None

    class Config:
        from_attributes = True # Allows Pydantic to read SQLAlchemy objects

class CodeCreate(BaseModel):
    name: str
    color: str = "#FFFFFF"
    description: Optional[str] = None
    parent_id: Optional[int] = None

class ProjectUpdate(BaseModel):
    name: str
    description: Optional[str] = None
    local_path: Optional[str] = None

class SegmentCreate(BaseModel):
    document_id: int
    code_id: int
    start_char: int
    end_char: int
    content: str

class CodeUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None

@app.get("/")
def root():
    return {"message": "SQLAlchemy Backend is running!"}

@app.post("/projects", response_model=ProjectResponse)
def create_project_route(project: ProjectCreate, db: Session = Depends(get_db)):
    # Create the SQLAlchemy object
    # user_id parameter disabled for now

    final_path = None

    if project.local_path:
        # project with same path

        final_path = os.path.join(project.local_path, project.name)

        existing_project = db.query(models.Project).filter(models.Project.local_path == project.local_path).first()
        if existing_project:
            raise HTTPException(status_code=400, detail="Another workspace is already using this folder.")
        
        if os.path.exists(final_path):
            raise HTTPException(status_code=400, detail=f"The '{project.name}' folder already exists in this directory. Choose another directory or change the name of the project.")

        # create folder
        try:
            os.makedirs(final_path, exist_ok=True)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erro do sistema ao tentar criar a pasta: {str(e)}")
        
    new_project = models.Project(
        name=project.name, 
        description=project.description,
        local_path=final_path
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    
    return new_project

@app.get("/projects", response_model=List[ProjectResponse])
def get_projects_route(db: Session = Depends(get_db)):
    projects = db.query(models.Project).order_by(models.Project.id.desc()).all()
    return projects

@app.get("/projects/{project_id}")
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        return {"error": "Project not found"}
    return {"name": project.name, "description": project.description}


@app.post("/projects/{project_id}/documents/")
async def upload_documents(project_id: int, files: List[UploadFile] = File(...), db: Session = Depends(get_db)):

    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    ALLOWED_EXTENSIONS = {".txt", ".md", ".rtf"}
    successful_uploads = []
    failed_uploads = []
    
    for file in files:

        _, ext = os.path.splitext(file.filename)

        if ext.lower() not in ALLOWED_EXTENSIONS:
           failed_uploads.append({"filename": file.filename, "reason": "Unsupported file type"})
           continue
        
        try:
            # 1. Read the file
            content = await file.read()
            text_content = content.decode("utf-8").replace("\r\n", "\n").replace("\r", "\n")
            file_type = ext.lower().lstrip(".") or "text"

            if project.local_path:

                os.makedirs(project.local_path, exist_ok=True)
                
                physical_file_path = os.path.join(project.local_path, file.filename)
                
                with open(physical_file_path, "wb") as f:
                    f.write(content)
            
            # 2. Create the Document object
            new_doc = models.Document(
                project_id=project_id,
                filename=file.filename,
                content=text_content,
                type=file_type
            )
            
            db.add(new_doc)
            successful_uploads.append(file.filename)

        except UnicodeDecodeError:
            failed_uploads.append({"filename": file.filename, "reason": "Unreadable text encoding"})
        except Exception as e:
           
            failed_uploads.append({"filename": file.filename, "reason": "Corrupted file"})
        
    # Commit all files to the database at once!
    db.commit()
    
    return {"message": f"Successfully uploaded {len(files)} files!", "successful": successful_uploads, "failed": failed_uploads}

@app.get("/projects/{project_id}/documents/")
def get_project_documents(project_id: int, db: Session = Depends(get_db)):
   
    documents = db.query(models.Document).filter(models.Document.project_id == project_id).all()
    
    return [{"id": doc.id, "filename": doc.filename, "type": doc.type, "created_at": doc.created_at} for doc in documents]


@app.get("/projects/{project_id}/documents/{document_id}")
def get_document(project_id: int, document_id: int, db: Session = Depends(get_db)):
    doc = db.query(models.Document).filter(
        models.Document.id == document_id, 
        models.Document.project_id == project_id
    ).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    return {"id": doc.id, "filename": doc.filename, "type": doc.type,"content": doc.content}

@app.delete("/projects/{project_id}/documents/{document_id}")
def delete_document(project_id: int, document_id: int, db: Session = Depends(get_db)):
   
    doc = db.query(models.Document).filter(
        models.Document.id == document_id, 
        models.Document.project_id == project_id
    ).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    db.delete(doc)
    db.commit()
    
    return {"message": "Document deleted successfully"}

@app.post("/projects/{project_id}/codes")
def create_code(project_id: int, code: CodeCreate, db: Session = Depends(get_db)):
    
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    new_code = models.Code(
        name=code.name,
        color=code.color,
        description=code.description,
        project_id=project_id,
        parent_id=code.parent_id
    )
    
    db.add(new_code)
    db.commit()
    db.refresh(new_code)
    
    return new_code

@app.get("/projects/{project_id}/codes")
def get_project_codes(project_id: int, db: Session = Depends(get_db)):
    codes = db.query(models.Code).filter(models.Code.project_id == project_id).all()
    return codes

@app.put("/projects/{project_id}", response_model=ProjectResponse)
def update_project(project_id: int, project_data: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Update the fields
    project.name = project_data.name
    project.description = project_data.description
    
    db.commit()
    db.refresh(project)
    
    return project

@app.get("/system/choose-folder")
def choose_folder():
    # Create a hidden Tkinter root window
    root = tk.Tk()
    root.withdraw()
    
    root.attributes('-topmost', True) 
    
    # Open the native OS directory picker
    folder_path = filedialog.askdirectory(title="Select Project Destination")
    
    root.destroy()
    
    if folder_path:
        return {"path": folder_path}
    else:
        raise HTTPException(status_code=400, detail="No folder selected")
    

@app.delete("/projects/{project_id}/codes/{code_id}")
def delete_code(project_id: int, code_id: int, db: Session = Depends(get_db)):
    code = db.query(models.Code).filter(
        models.Code.id == code_id,
        models.Code.project_id == project_id
    ).first()

    if not code:
        raise HTTPException(status_code=404, detail="Code not found")
    
    db.delete(code)
    db.commit()

    return {"message":"Code deleted successfully"}

@app.put("/projects/{project_id}/codes/{code_id}")
def update_code(project_id: int, code_id: int, code_update: CodeUpdate, db: Session = Depends(get_db)):
    code = db.query(models.Code).filter(
        models.Code.id == code_id,
        models.Code.project_id == project_id
    ).first()

    if not code:
        raise HTTPException(status_code=404, detail="Code not found")
    
    if code_update.name is not None:
        code.name = code_update.name
    if code_update.color is not None:
        code.color = code_update.color

    db.commit()
    db.refresh(code)

    return code
    

@app.post("/projects/{project_id}/segments")
def create_segment(project_id: int, segment: SegmentCreate, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    doc = db.query(models.Document).filter(
        models.Document.id == segment.document_id,
        models.Document.project_id == project_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    code = db.query(models.Code).filter(
        models.Code.id == segment.code_id,
        models.Code.project_id == project_id
    ).first()
    if not code:
        raise HTTPException(status_code=404, detail="Code not found")

    new_segment = models.Segment(
        document_id=segment.document_id,
        code_id=segment.code_id,
        start_char=segment.start_char,
        end_char=segment.end_char,
        content=segment.content
    )
    db.add(new_segment)
    db.commit()
    db.refresh(new_segment)
    return new_segment

@app.get("/projects/{project_id}/segments")
def get_segments(project_id: int, document_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.Segment).join(models.Document).filter(
        models.Document.project_id == project_id
    )
    if document_id:
        query = query.filter(models.Segment.document_id == document_id)
    
    segments = query.all()
    return [
        {
            "id": seg.id,
            "document_id": seg.document_id,
            "code_id": seg.code_id,
            "start_char": seg.start_char,
            "end_char": seg.end_char,
            "content": seg.content
        }
        for seg in segments
    ]

@app.get("/codes/{code_id}/segments")
def get_segments_by_code(code_id: int, db: Session = Depends(get_db)):

    segments = (
        db.query(models.Segment)
        .join(models.Document)
        .filter(models.Segment.code_id == code_id)
        .order_by(models.Segment.document_id, models.Segment.start_char)
        .all()
    )

    results = []

    for seg in segments:
        doc_text = seg.document.content

        context_radius = 200 

        start = max(0, seg.start_char - context_radius)
        end = min(len(doc_text), seg.end_char + context_radius)

        context_text = doc_text[start:end]

        results.append({
            "id": seg.id,
            "document_id": seg.document_id,
            "document_filename": seg.document.filename,
            "start_char": seg.start_char,
            "end_char": seg.end_char,
            "position_label": f"{seg.document.filename}, pos: {seg.start_char}-{seg.end_char}",
            "context": context_text,
            "highlight_start": seg.start_char - start,
            "highlight_end": seg.end_char - start,
        })

    return results

#Required by REFI-QDA
def generate_guid(prefix: str, item_id: int) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"jupiter.qda.{prefix}.{item_id}"))

@app.get("/projects/{project_id}/export/refi")
def export_refi_xml(project_id: int, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ET.register_namespace("", "urn:QDA-XML:project:1.0")
    
    # Generate a single user GUID to own the project
    master_user_guid = str(uuid.uuid4())

    #Root Element
    root = ET.Element("{urn:QDA-XML:project:1.0}Project", attrib={
        "name": project.name,
        "origin": "jUPiter QDA",
        "creatingUserGUID": master_user_guid
    })

    # Users
    users = ET.SubElement(root, "{urn:QDA-XML:project:1.0}Users")
    ET.SubElement(users, "{urn:QDA-XML:project:1.0}User", attrib={
        "guid": master_user_guid, 
        "name": "jUPiter User"
    })

    # CodeBook 
    codebook = ET.SubElement(root, "{urn:QDA-XML:project:1.0}CodeBook")
    codes_elem = ET.SubElement(codebook, "{urn:QDA-XML:project:1.0}Codes")

    code_guid_map = {}
    codes = db.query(models.Code).filter(models.Code.project_id == project_id).all()
    
    for c in codes:
        cg = generate_guid("code", c.id)
        code_guid_map[c.id] = cg
        code_attribs = {"guid": cg, "name": c.name, "isCodable": "true"}
        if c.color: 
            code_attribs["color"] = c.color
            
        code_elem = ET.SubElement(codes_elem, "{urn:QDA-XML:project:1.0}Code", attrib=code_attribs)
        if c.description:
            cd_desc = ET.SubElement(code_elem, "{urn:QDA-XML:project:1.0}Description")
            cd_desc.text = c.description

    zip_files_to_write = {}

    # Sources
    sources = ET.SubElement(root, "{urn:QDA-XML:project:1.0}Sources")
    docs = db.query(models.Document).filter(models.Document.project_id == project_id).all()
    
    for d in docs:
        doc_guid = generate_guid("doc", d.id)
        internal_filename = f"{doc_guid}.txt"
        
        source_elem = ET.SubElement(sources, "{urn:QDA-XML:project:1.0}TextSource", attrib={
            "guid": doc_guid,
            "name": d.filename,
            "plainTextPath": f"internal://{internal_filename}",
            "creatingUser": master_user_guid
        })

        zip_files_to_write[f"Sources/{internal_filename}"] = d.content

        doc_segments = db.query(models.Segment).filter(models.Segment.document_id == d.id).all()
        for seg in doc_segments:
            sel_guid = generate_guid("selection", seg.id)
            
            sel_elem = ET.SubElement(source_elem, "{urn:QDA-XML:project:1.0}PlainTextSelection", attrib={
                "guid": sel_guid,
                "name": f"Selection-{seg.id}",
                "startPosition": str(seg.start_char),
                "endPosition": str(seg.end_char),
                "creatingUser": master_user_guid
            })

            coding_elem = ET.SubElement(sel_elem, "{urn:QDA-XML:project:1.0}Coding", attrib={
                "guid": generate_guid("coding", seg.id),
                "creatingUser": master_user_guid
            })

            ET.SubElement(coding_elem, "{urn:QDA-XML:project:1.0}CodeRef", attrib={
                "targetGUID": code_guid_map[seg.code_id]
            })

    # Description
    if project.description:
        desc = ET.SubElement(root, "{urn:QDA-XML:project:1.0}Description")
        desc.text = project.description

    # === Compile to ZIP (QDPX) ===
    xml_str = ET.tostring(root, encoding="utf-8", xml_declaration=True)
    safe_filename = project.name.replace(" ", "_")
    
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        zip_file.writestr("project.qde", xml_str)
        
        for filepath, content in zip_files_to_write.items():
            zip_file.writestr(filepath, content.encode('utf-8'))

    zip_bytes = zip_buffer.getvalue()

    return Response(
        content=zip_bytes, 
        media_type="application/zip", 
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}.qdpx"'
        }
    )