from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import os
import shutil
import io
import urllib.parse
from fastapi.responses import StreamingResponse
from database import get_db
import schemas
from repositories.project_repo import ProjectRepository
import models
import openpyxl
from openpyxl.styles import Font, PatternFill

router = APIRouter(
    prefix="/projects",
    tags=["Projects"]
)

def get_project_repo(db: Session = Depends(get_db)):
    return ProjectRepository(db)


@router.post("/import/refi", response_model=schemas.ProjectResponse)
async def import_refi_xml_route(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Import locally to avoid circular dependencies
    from refi_service import import_refi_xml
    return await import_refi_xml(file, db)

@router.get("/{project_id}/export/refi")
def export_refi_xml_route(project_id: int, db: Session = Depends(get_db)):
    from refi_service import export_refi_xml
    return export_refi_xml(project_id, db)

@router.get("", response_model=List[schemas.ProjectResponse])
def get_projects(repo: ProjectRepository = Depends(get_project_repo)):
    return repo.get_all()

@router.post("", response_model=schemas.ProjectResponse)
def create_project(project: schemas.ProjectCreate, repo: ProjectRepository = Depends(get_project_repo)):
    final_path = None
    if project.local_path:
        final_path = os.path.join(project.local_path, project.name)
        
        # Check if another project uses this EXACT base path
        existing_project = repo.get_by_local_path(project.local_path)
        if existing_project:
            raise HTTPException(status_code=400, detail="Another workspace is already using this folder.")
        
        if os.path.exists(final_path):
            raise HTTPException(status_code=400, detail=f"The '{project.name}' folder already exists in this directory.")
        
        try:
            os.makedirs(final_path, exist_ok=True)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"System error creating folder: {str(e)}")
            
    return repo.create(project, final_path)

@router.get("/{project_id}")
def get_project(project_id: int, repo: ProjectRepository = Depends(get_project_repo)):
    project = repo.get_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"name": project.name, "description": project.description}

@router.put("/{project_id}", response_model=schemas.ProjectResponse)
def update_project(project_id: int, project_data: schemas.ProjectUpdate, repo: ProjectRepository = Depends(get_project_repo)):
    project = repo.update(project_id, project_data)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.delete("/{project_id}")
def delete_project(project_id: int, repo: ProjectRepository = Depends(get_project_repo)):
    project = repo.get_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.local_path and os.path.exists(project.local_path):
        try:
            shutil.rmtree(project.local_path)
        except Exception as e:
            print(f"Warning: Could not delete physical folder: {e}")

    repo.delete(project_id)
    return {"message": "Project deleted successfully"}

@router.get("/{project_id}/export/excel")
def export_project_excel(project_id: int, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # create a native Excel Workbook
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Interview Statistics"

    # define and style the header row 
    headers = ["Document Name", "Code Name", "Parent Code", "The Text Segment", "Timestamp"]
    ws.append(headers)

    header_fill = PatternFill(start_color="333333", end_color="333333", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True)
    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font

    segments = db.query(models.Segment).join(models.Document).filter(
        models.Document.project_id == project_id
    ).order_by(models.Segment.document_id, models.Segment.start_char).all()

    codes = db.query(models.Code).filter(models.Code.project_id == project_id).all()
    code_dict = {c.id: c for c in codes}

    for seg in segments:
            doc_name = seg.document.filename if seg.document else "Unknown"
            
            # Resolve Code and Parent Code
            code = code_dict.get(seg.code_id)
            code_name = code.name if code else "Unknown"
            
            parent_code_name = "N/A"
            if code and code.parent_id:
                parent = code_dict.get(code.parent_id)
                parent_code_name = parent.name if parent else "N/A"

            text_segment = seg.content
            
            # Safely grab the Document's created_at date!
            timestamp = "N/A"
            if seg.document and hasattr(seg.document, 'created_at') and seg.document.created_at:
                timestamp = seg.document.created_at.strftime("%Y-%m-%d %H:%M")

            ws.append([doc_name, code_name, parent_code_name, text_segment, timestamp])

    # 5. Auto-adjust column widths for readability
    ws.column_dimensions['A'].width = 25 # Document Name
    ws.column_dimensions['B'].width = 20 # Code Name
    ws.column_dimensions['C'].width = 20 # Parent Code
    ws.column_dimensions['D'].width = 60 # Text Segment (Wider)
    ws.column_dimensions['E'].width = 18 # Timestamp

    # Freeze the top row so headers stay visible when scrolling down!
    ws.freeze_panes = "A2"

    # 6. Save to an in-memory buffer
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    safe_filename = urllib.parse.quote(f"{project.name}_Statistics.xlsx")

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=utf-8''{safe_filename}"}
    )