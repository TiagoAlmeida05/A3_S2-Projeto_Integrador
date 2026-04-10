from typing import Optional, List
from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel

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
            text_content = content.decode("utf-8") 
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
    