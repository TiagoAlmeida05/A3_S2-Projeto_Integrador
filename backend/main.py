from typing import Optional, List
from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

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
import shutil

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
        from_attributes = True

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

class MemoBase(BaseModel):
    text: str
    target_type: str
    target_id: int

class MemoCreate(MemoBase):
    pass

class MemoUpdate(BaseModel):
    text: Optional[str] = None

class MemoResponse(MemoBase):
    id: int
    created_at: datetime
    target_name: Optional[str] = None  

    class Config:
        from_attributes = True

# --- ENDPOINTS ---

@app.get("/projects/{project_id}/memos", response_model=List[MemoResponse])
def list_memos(project_id: int, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    project_name = project.name if project else f"Project {project_id}"

    codes = db.query(models.Code).filter(models.Code.project_id == project_id).all()
    code_dict = {c.id: c.name for c in codes}

    segments = db.query(models.Segment).join(models.Document).filter(models.Document.project_id == project_id).all()
    segment_dict = {
        s.id: f'"{s.content[:30]}..."' if len(s.content) > 30 else f'"{s.content}"' 
        for s in segments
    }

    memos = []

    # Get Project memos
    proj_memos = db.query(models.Memo).filter(models.Memo.target_type == "project", models.Memo.target_id == project_id).all()
    for m in proj_memos:
        setattr(m, "target_name", project_name)
        memos.append(m)

    # Get Code memos
    if code_dict:
        code_memos = db.query(models.Memo).filter(models.Memo.target_type == "code", models.Memo.target_id.in_(code_dict.keys())).all()
        for m in code_memos:
            setattr(m, "target_name", code_dict.get(m.target_id, "Unknown Code"))
            memos.append(m)

    # Get Segment memos
    if segment_dict:
        seg_memos = db.query(models.Memo).filter(models.Memo.target_type == "segment", models.Memo.target_id.in_(segment_dict.keys())).all()
        for m in seg_memos:
            setattr(m, "target_name", segment_dict.get(m.target_id, "Unknown Segment"))
            memos.append(m)

    return memos

@app.post("/memos", response_model=MemoResponse)
def create_memo(memo: MemoCreate, db: Session = Depends(get_db)):
    new_memo = models.Memo(
        text=memo.text,
        target_type=memo.target_type,
        target_id=memo.target_id,
        created_at=datetime.now()
    )
    db.add(new_memo)
    db.commit()
    db.refresh(new_memo)
    return new_memo

@app.put("/memos/{memo_id}", response_model=MemoResponse)
def update_memo(memo_id: int, memo: MemoUpdate, db: Session = Depends(get_db)):
    db_memo = db.query(models.Memo).filter(models.Memo.id == memo_id).first()
    if not db_memo:
        raise HTTPException(status_code=404, detail="Memo not found")
    if memo.text is not None:
        db_memo.text = memo.text
    db.commit()
    db.refresh(db_memo)
    return db_memo

@app.delete("/memos/{memo_id}")
def delete_memo(memo_id: int, db: Session = Depends(get_db)):
    db_memo = db.query(models.Memo).filter(models.Memo.id == memo_id).first()
    if not db_memo:
        raise HTTPException(status_code=404, detail="Memo not found")
    db.delete(db_memo)
    db.commit()
    return {"message": "Memo deleted successfully"}

class CodeReorderItem(BaseModel):
    id: int
    parent_id: Optional[int] = None
    order_index: int

class CodeReorderRequest(BaseModel):
    codes: List[CodeReorderItem]

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
    ALLOWED_EXTENSIONS = {".txt", ".md", ".rtf", ".pdf", ".docx", ".odt"}
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
            file_type = ext.lower().lstrip(".") or "text"
            text_content = ""

            if ext.lower() in {".txt", ".md", ".rtf"}:
                text_content = content.decode("utf-8").replace("\r\n", "\n").replace("\r", "\n")
            elif ext.lower() == ".pdf":
                try:
                    from PyPDF2 import PdfReader
                    import io
                    pdf_reader = PdfReader(io.BytesIO(content))
                    text_content = "\n".join(page.extract_text() or "" for page in pdf_reader.pages)
                except Exception as e:
                    failed_uploads.append({"filename": file.filename, "reason": f"PDF extraction failed: {str(e)}"})
                    continue
            elif ext.lower() == ".docx":
                try:
                    import io
                    from docx import Document as DocxDocument
                    doc = DocxDocument(io.BytesIO(content))
                    text_content = "\n".join([p.text for p in doc.paragraphs])
                except Exception as e:
                    failed_uploads.append({"filename": file.filename, "reason": f"DOCX extraction failed: {str(e)}"})
                    continue
            elif ext.lower() == ".odt":
                try:
                    import io
                    from odf.opendocument import load
                    from odf.text import P
                    odt_doc = load(io.BytesIO(content))
                    paragraphs = odt_doc.getElementsByType(P)
                    text_content = "\n".join([str(p) for p in paragraphs])
                except Exception as e:
                    failed_uploads.append({"filename": file.filename, "reason": f"ODT extraction failed: {str(e)}"})
                    continue
            else:
                failed_uploads.append({"filename": file.filename, "reason": "Unsupported file type"})
                continue

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
    codes = db.query(models.Code).filter(models.Code.project_id == project_id).order_by(models.Code.order_index).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "color": c.color,
            "description": c.description,
            "project_id": c.project_id,
            "parent_id": c.parent_id,
            "order_index": c.order_index,
            "frequency": len(c.segments) # SQLAlchemy magically counts them for us!
        }
        for c in codes
    ]

@app.put("/projects/{project_id}/codes/reorder")
def reorder_codes(project_id: int, reorder_request: CodeReorderRequest, db: Session = Depends(get_db)):
    for item in reorder_request.codes:
        code = db.query(models.Code).filter(
            models.Code.id == item.id,
            models.Code.project_id == project_id
        ).first()
        
        if code:
            code.parent_id = item.parent_id
            code.order_index = item.order_index

    db.commit()
    return {"message": "Codes reordered successfully"}

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

@app.delete("/projects/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.local_path and os.path.exists(project.local_path):
        try:
            shutil.rmtree(project.local_path)
        except Exception as e:
            print(f"Warning: Could not delete physical folder: {e}")

    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully"}

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
def get_segments_by_code(code_id: int, include_children: bool = False, db: Session = Depends(get_db)):

    target_code_ids = [code_id]

    if include_children:
        def get_all_children(current_id):
            children = db.query(models.Code).filter(models.Code.parent_id == current_id).all()
            for child in children:
                target_code_ids.append(child.id)
                get_all_children(child.id)
        get_all_children(code_id)

    segments = (
        db.query(models.Segment)
        .join(models.Document)
        .filter(models.Segment.code_id.in_(target_code_ids))
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
            "code_name": seg.code.name,
            "code_color": seg.code.color
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

@app.post("/projects/import/refi", response_model=ProjectResponse)
async def import_refi_xml(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith('.qdpx'):
        raise HTTPException(status_code=400, detail="File must be a .qdpx package")

    try:
        # Unzip the file in memory
        content = await file.read()
        zip_ref = zipfile.ZipFile(io.BytesIO(content))
        
        # Read the XML blueprint
        xml_data = zip_ref.read("project.qde")
        root = ET.fromstring(xml_data)

        #easier parsing
        for elem in root.iter():
            if '}' in elem.tag:
                elem.tag = elem.tag.split('}', 1)[1]

        # Create the Project
        base_name = root.attrib.get("name", "Imported Project")
        proj_name = base_name
        
        #prevent duplicate names
        counter = 1
        while db.query(models.Project).filter(models.Project.name == proj_name).first() is not None:
            proj_name = f"{base_name} ({counter})"
            counter += 1

        desc_elem = root.find("Description")
        proj_desc = desc_elem.text if desc_elem is not None else None

        new_project = models.Project(name=proj_name, description=proj_desc)
        db.add(new_project)
        db.commit()
        db.refresh(new_project)

        # Extract Codes 
        guid_to_code_id = {} # Maps XML GUID to SQLite ID
        
        for code_elem in root.findall(".//Code"):
            guid = code_elem.attrib.get("guid")
            name = code_elem.attrib.get("name")
            color = code_elem.attrib.get("color", "#646cff")
            
            c_desc_elem = code_elem.find("Description")
            description = c_desc_elem.text if c_desc_elem is not None else None

            new_code = models.Code(
                project_id=new_project.id,
                name=name,
                color=color,
                description=description
            )
            db.add(new_code)
            db.commit()
            db.refresh(new_code)
            
            guid_to_code_id[guid] = new_code.id

        # Extract Documents and Segments
        for source_elem in root.findall(".//TextSource"):
            doc_guid = source_elem.attrib.get("guid")
            doc_name = source_elem.attrib.get("name")
            
            # Get the text content
            doc_content = ""
            plain_text_path = source_elem.attrib.get("plainTextPath")
            
            if plain_text_path and plain_text_path.startswith("internal://"):
                raw_filename = plain_text_path.split("/")[-1]
                
                # Search the ZIP file to find exactly where s the file
                zip_path = None
                for name in zip_ref.namelist():
                    if name.endswith(raw_filename):
                        zip_path = name
                        break
                
                if zip_path:
                    try:
                        raw_bytes = zip_ref.read(zip_path)
                        try:
                            doc_content = raw_bytes.decode('utf-8-sig') 
                        except UnicodeDecodeError:
                            doc_content = raw_bytes.decode('utf-8', errors='ignore')
                    except Exception as e:
                        print(f"Failed to read file {zip_path} from ZIP: {e}")
            else:
                # Fallback to embedded text if the software didn't zip a physical file
                pt_elem = source_elem.find("PlainTextContent")
                if pt_elem is not None and pt_elem.text:
                    doc_content = pt_elem.text

            new_doc = models.Document(
                project_id=new_project.id,
                filename=doc_name,
                content=doc_content,
                type="txt"
            )
            db.add(new_doc)
            db.commit()
            db.refresh(new_doc)

            # Extract the coded segments for this document
            for sel_elem in source_elem.findall(".//PlainTextSelection"):
                start_pos = int(sel_elem.attrib.get("startPosition", 0))
                end_pos = int(sel_elem.attrib.get("endPosition", 0))
                
                for coding_elem in sel_elem.findall(".//Coding"):
                    code_ref = coding_elem.find("CodeRef")
                    if code_ref is not None:
                        target_guid = code_ref.attrib.get("targetGUID")
                        
                        # Translate the GUID to database ID
                        actual_code_id = guid_to_code_id.get(target_guid)
                        
                        if actual_code_id:
                            # Slice the string to get the exact highlighted text
                            segment_text = doc_content[start_pos:end_pos]
                            
                            new_segment = models.Segment(
                                document_id=new_doc.id,
                                code_id=actual_code_id,
                                start_char=start_pos,
                                end_char=end_pos,
                                content=segment_text
                            )
                            db.add(new_segment)

        db.commit()
        return new_project
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid QDPX package (Not a valid ZIP file)")
    except Exception as e:
        db.rollback() # If anything fails, cancel the database transaction
        print(f"Import Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process QDPX: {str(e)}")

@app.delete("/projects/{project_id}/segments/{segment_id}")
def delete_segment(project_id: int, segment_id: int, db: Session = Depends(get_db)):
    segment = db.query(models.Segment).join(models.Document).filter(
        models.Segment.id == segment_id,
        models.Document.project_id == project_id
    ).join(models.Code).first()

    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")

    db.delete(segment)
    db.commit()
    return {"message": "Segment deleted successfully"}