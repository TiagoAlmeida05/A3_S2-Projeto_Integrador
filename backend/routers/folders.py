from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import schemas
from repositories.folder_repo import FolderRepository

router = APIRouter(prefix="/projects/{project_id}/folders", tags=["Folders"])

def get_folder_repo(db: Session = Depends(get_db)):
    return FolderRepository(db)

@router.get("/")
def get_folders(project_id: int, repo: FolderRepository = Depends(get_folder_repo)):
    folders = repo.get_by_project(project_id)
    return [{"id": f.id, "name": f.name} for f in folders]

@router.post("/")
def create_folder(project_id: int, folder: schemas.FolderCreate, repo: FolderRepository = Depends(get_folder_repo)):
    return repo.create(project_id, folder.name)

@router.put("/reorder")
def reorder_folders(project_id: int, request: schemas.FolderReorderRequest, repo: FolderRepository = Depends(get_folder_repo)):
    repo.reorder(project_id, request.folders)
    return {"message": "Folders reordered"}

@router.delete("/{folder_id}")
def delete_folder(project_id: int, folder_id: int, repo: FolderRepository = Depends(get_folder_repo)):
    repo.delete(project_id, folder_id)
    return {"message": "Folder deleted"}