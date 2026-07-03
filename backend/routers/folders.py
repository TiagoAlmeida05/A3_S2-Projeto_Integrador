from fastapi import APIRouter, Depends,HTTPException
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
    return [{"id": f.id, "name": f.name,"parent_id": f.parent_id, 
            "order_index": f.order_index} for f in folders]

@router.post("/")
def create_folder(project_id: int, folder: schemas.FolderCreate, repo: FolderRepository = Depends(get_folder_repo)):
    return repo.create(project_id, folder.name,folder.parent_id)

@router.put("/reorder")
def reorder_folders(project_id: int, request: schemas.FolderReorderRequest, repo: FolderRepository = Depends(get_folder_repo)):
    repo.reorder(project_id, request.folders)
    return {"message": "Folders reordered"}

@router.delete("/{folder_id}")
def delete_folder(project_id: int, folder_id: int, repo: FolderRepository = Depends(get_folder_repo)):
    repo.delete(project_id, folder_id)
    return {"message": "Folder deleted"}

@router.put("/{folder_id}/move")
def move_folder(project_id: int, folder_id: int, request: schemas.FolderMoveRequest, repo: FolderRepository = Depends(get_folder_repo)):
    folder = repo.move(project_id, folder_id, request.parent_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    return {"message": "Folder moved successfully", "folder_id": folder.id, "parent_id": folder.parent_id}

@router.put("/{folder_id}")
def rename_folder(project_id: int, folder_id: int, request: schemas.FolderRename, repo: FolderRepository = Depends(get_folder_repo)):
    folder = repo.update_name(project_id, folder_id, request.name)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    return {"message": "Folder renamed successfully", "folder_id": folder.id, "new_name": folder.name}