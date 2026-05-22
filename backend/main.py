from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import models
from database import engine

# Import your incredibly clean routers
from routers import projects, documents, codes, segments, folders, memos

# Import any custom standalone tools you have
import tkinter as tk
from tkinter import filedialog
from refi_service import export_refi_xml, import_refi_xml

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="jUPiter QDA API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "SQLAlchemy Backend is running with Clean Architecture!"}

# --- ATTACH ALL ROUTERS ---
app.include_router(projects.router)
app.include_router(documents.router)
app.include_router(codes.router)
app.include_router(segments.router)
app.include_router(folders.router)
app.include_router(memos.router)

# --- LEAVE SYSTEM/MISC ENDPOINTS HERE ---
@app.get("/system/choose-folder")
def choose_folder():
    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True) 
    folder_path = filedialog.askdirectory(title="Select Project Destination")
    root.destroy()
    if folder_path:
        return {"path": folder_path}
    else:
        raise HTTPException(status_code=400, detail="No folder selected")

from fastapi import Depends
from sqlalchemy.orm import Session
from database import get_db

@app.get("/projects/{project_id}/export/refi")
def export_refi_xml_route(project_id: int, db: Session = Depends(get_db)):
    return export_refi_xml(project_id, db)

from fastapi import UploadFile, File
@app.post("/projects/import/refi")
async def import_refi_xml_route(file: UploadFile = File(...), db: Session = Depends(get_db)):
    return await import_refi_xml(file, db)