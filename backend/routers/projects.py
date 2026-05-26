from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import os
import shutil

from database import get_db
import schemas
from repositories.project_repo import ProjectRepository

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